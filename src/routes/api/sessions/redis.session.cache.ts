import { type Session } from "./session";
import { type ISessionCache } from "./session.cache.interface";
import { createClient, type RedisClientType } from 'redis';
import { type CacheMetrics, type CacheOptions, type CacheEntry, type CacheConfig } from "$lib/server/cache/cache.types";

////////////////////////////////////////////////////////////////////////////////////////

export class RedisSessionCache implements ISessionCache {
    private _client: RedisClientType | null = null;
    private config: CacheConfig;
    private metrics: CacheMetrics;
    private cleanupInterval: any;

    constructor(config?: Partial<CacheConfig>) {
        // Initialize config with defaults
        this.config = {
            DefaultTTL: 24 * 60 * 60 * 1000, // 24 hours
            MaxMemorySize: 512 * 1024 * 1024, // 512MB
            EnableMetrics: true,
            EnableCompression: false,
            CompressionThreshold: 1024, // 1KB
            CleanupInterval: 60 * 60 * 1000, // 1 hour
            ...config
        };

        // Initialize metrics
        this.metrics = {
            Hits: 0,
            Misses: 0,
            HitRate: 0,
            TotalSize: 0,
            TotalEntries: 0,
            OldestEntry: Date.now(),
            NewestEntry: Date.now(),
            AverageEntrySize: 0
        };

        // Create Redis client
        const port = process.env.CACHE_PORT ? parseInt(process.env.CACHE_PORT) : 6379;
        this._client = createClient({
            socket: {
                host: process.env.CACHE_HOST || 'localhost',
                port: port,
            },
            password: process.env.CACHE_PASSWORD
        });

        // Connect and start cleanup interval
        (async () => {
            if (this._client) {
                await this._client.connect();
                await this.loadMetrics();
                this.startCleanupInterval();
            }
        })();
    }

    private startCleanupInterval(): void {
        try {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }
            this.cleanupInterval = setInterval(() => {
                this.cleanup();
            }, this.config.CleanupInterval);
        } catch (error) {
            console.error('Error starting cleanup interval:', error);
        }
    }

    set = async (key: string, value: Session, options?: CacheOptions): Promise<void> => {
        try {
            if (!this._client) return;

            const entry: CacheEntry<Session> = {
                Data: value,
                Timestamp: Date.now(),
                Ttl: options?.Ttl || this.config.DefaultTTL,
                Hits: 0,
                Size: this.calculateSize(value),
                LastModified: new Date().toUTCString()
            };

            // Check if we need to make space
            if (this.metrics.TotalSize + entry.Size > this.config.MaxMemorySize) {
                await this.evictEntries(entry.Size);
            }

            const exists = await this._client.exists(key);
            if (exists === 1) {
                const oldEntry = await this._client.get(key) as CacheEntry<Session>;
                this.updateMetricsOnDelete(oldEntry);
            }

            await this._client.set(key, JSON.stringify(entry), {
                EX: Math.floor(entry.Ttl / 1000), // Convert ms to seconds
            });

            this.updateMetricsOnSet(entry);
        } catch (error) {
            console.error('Error setting session:', error);
        }
    };

    get = async (key: string): Promise<Session | undefined> => {
        try {
            if (!this._client) return undefined;

            const val = await this._client.get(key);
            if (!val) {
                this.updateMetricsOnMiss();
                return undefined;
            }

            const entry = JSON.parse(val) as CacheEntry<Session>;
            
            // Check if entry is expired (redundant with Redis TTL but good practice)
            if (this.isExpired(entry)) {
                await this._client.del(key);
                this.updateMetricsOnMiss();
                return undefined;
            }

            // Update hit count and metrics
            entry.Hits++;
            await this._client.set(key, JSON.stringify(entry), {
                EX: Math.floor((entry.Ttl - (Date.now() - entry.Timestamp)) / 1000), // Preserve remaining TTL
            });

            this.updateMetricsOnHit();
            return entry.Data;
        } catch (error) {
            console.error('Error getting session:', error);
            return undefined;
        }
    };

    has = async (key: string): Promise<boolean> => {
        try {
            if (!this._client) return false;

            const val = await this._client.get(key);
            if (!val) {
                this.updateMetricsOnMiss();
                return false;
            }

            const entry = JSON.parse(val) as CacheEntry<Session>;
            
            if (this.isExpired(entry)) {
                await this._client.del(key);
                this.updateMetricsOnMiss();
                return false;
            }

            // Update hit count and metrics
            entry.Hits++;
            await this._client.set(key, JSON.stringify(entry), {
                EX: Math.floor((entry.Ttl - (Date.now() - entry.Timestamp)) / 1000),
            });

            this.updateMetricsOnHit();
            return true;
        } catch (error) {
            console.error('Error checking if session exists:', error);
            return false;
        }
    };

    delete = async (key: string): Promise<boolean> => {
        try {
            if (!this._client) return false;

            const val = await this._client.get(key);
            if (val) {
                const entry = JSON.parse(val) as CacheEntry<Session>;
                this.updateMetricsOnDelete(entry);
                await this._client.del(key);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting session:', error);
            return false;
        }
    };

    clear = async (): Promise<void> => {
        try {
            if (!this._client) return;
            
            console.log('Clearing cache');
            const keys = await this._client.keys('SessionManager:*');
            if (keys.length > 0) {
                await this._client.del(keys);
            }
            this.resetMetrics();
            await this.saveMetrics();
        } catch (error) {
            console.error('Error clearing session cache:', error);
        }
    };

    findAndClear = async (searchPattern: string): Promise<string[]> => {
        try {
            if (!this._client) return [];

            const keys = await this._client.keys(searchPattern);
            if (keys.length > 0) {
                for (const key of keys) {
                    const val = await this._client.get(key);
                    if (val) {
                        const entry = JSON.parse(val) as CacheEntry<Session>;
                        this.updateMetricsOnDelete(entry);
                    }
                }
                await this._client.del(keys);
                await this.saveMetrics();
            }
            return keys;
        } catch (error) {
            console.error('Error finding and clearing sessions:', error);
            return [];
        }
    }

    getMetrics = async (): Promise<CacheMetrics> => {
        try {
            return { ...this.metrics };
        } catch (error) {
            console.error('Error getting session metrics:', error);
            return { ...this.metrics };
        }
    }

    private isExpired(entry: CacheEntry<Session>): boolean {
        try {
            return Date.now() - entry.Timestamp > entry.Ttl;
        } catch (error) {
            console.error('Error checking if session is expired:', error);
            return false;
        }
    }

    private calculateSize(value: Session): number {
        try {
            return JSON.stringify(value).length;
        } catch (error) {
            console.error('Error calculating session size:', error);
            return 0;
        }
    }

    private updateMetricsOnSet(entry: CacheEntry<Session>): void {
        try {
            if (!this.config.EnableMetrics) return;

            this.metrics.TotalSize += entry.Size;
            this.metrics.TotalEntries++;
            this.metrics.NewestEntry = entry.Timestamp;
            if (!this.metrics.OldestEntry || entry.Timestamp < this.metrics.OldestEntry) {
                this.metrics.OldestEntry = entry.Timestamp;
            }
            this.metrics.AverageEntrySize = this.metrics.TotalSize / this.metrics.TotalEntries;
            this.saveMetrics();
        } catch (error) {
            console.error('Error updating metrics on set:', error);
        }
    }

    private updateMetricsOnHit(): void {
        try {
            if (!this.config.EnableMetrics) return;

            this.metrics.Hits++;
            this.metrics.HitRate = this.metrics.Hits / (this.metrics.Hits + this.metrics.Misses);
            this.saveMetrics();
        } catch (error) {
            console.error('Error updating metrics on hit:', error);
        }
    }

    private updateMetricsOnMiss(): void {
        try {
            if (!this.config.EnableMetrics) return;

            this.metrics.Misses++;
            this.metrics.HitRate = this.metrics.Hits / (this.metrics.Hits + this.metrics.Misses);
            this.saveMetrics();
        } catch (error) {
            console.error('Error updating metrics on miss:', error);
        }
    }

    private updateMetricsOnDelete(entry: CacheEntry<Session>): void {
        try {
            if (!this.config.EnableMetrics) return;

            this.metrics.TotalSize -= entry.Size;
            this.metrics.TotalEntries--;
            if (this.metrics.TotalEntries > 0) {
                this.metrics.AverageEntrySize = this.metrics.TotalSize / this.metrics.TotalEntries;
            } else {
                this.resetMetrics();
            }
            this.saveMetrics();
        } catch (error) {
            console.error('Error updating metrics on delete:', error);
        }
    }

    private resetMetrics(): void {
        try {
            this.metrics = {
                Hits: 0,
                Misses: 0,
                HitRate: 0,
                TotalSize: 0,
                TotalEntries: 0,
                OldestEntry: Date.now(),
                NewestEntry: Date.now(),
                AverageEntrySize: 0
            };
        } catch (error) {
            console.error('Error resetting metrics:', error);
        }
    }

    private async loadMetrics(): Promise<void> {
        try {
            if (!this._client || !this.config.EnableMetrics) return;

            try {
                const metricsKey = 'session_cache_metrics';
                const savedMetrics = await this._client.get(metricsKey);
                if (savedMetrics) {
                    this.metrics = JSON.parse(savedMetrics);
                }
            } catch (error) {
                console.error('Error loading metrics:', error);
                this.resetMetrics();
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
        }
    }

    private async saveMetrics(): Promise<void> {
        try {
            if (!this._client || !this.config.EnableMetrics) return;

            try {
                const metricsKey = 'session_cache_metrics';
                await this._client.set(metricsKey, JSON.stringify(this.metrics));
            } catch (error) {
                console.error('Error saving metrics:', error);
            }
        } catch (error) {
            console.error('Error saving metrics:', error);
        }
    }

    private async evictEntries(requiredSize: number): Promise<void> {
        try {
            if (!this._client) return;

            const keys = await this._client.keys('SessionManager:*');
            const entries: Array<{ key: string; entry: CacheEntry<Session> }> = [];

            for (const key of keys) {
                const val = await this._client.get(key);
                if (val) {
                    const entry = JSON.parse(val) as CacheEntry<Session>;
                    entries.push({ key, entry });
                }
            }

            entries.sort((a, b) => {
                // First, evict expired entries
                const aExpired = this.isExpired(a.entry);
                const bExpired = this.isExpired(b.entry);
                if (aExpired !== bExpired) return aExpired ? -1 : 1;

                // Then, consider hit count and age
                const aScore = a.entry.Hits / (Date.now() - a.entry.Timestamp);
                const bScore = b.entry.Hits / (Date.now() - b.entry.Timestamp);
                return aScore - bScore;
            });

            let freedSpace = 0;
            for (const { key, entry } of entries) {
                if (this.metrics.TotalSize - freedSpace + requiredSize <= this.config.MaxMemorySize) {
                    break;
                }
                await this._client.del(key);
                freedSpace += entry.Size;
                this.updateMetricsOnDelete(entry);
            }
        } catch (error) {
            console.error('Error evicting entries:', error);
        }
    }

    private async cleanup(): Promise<void> {
        try {
            if (!this._client) return;

            const keys = await this._client.keys('SessionManager:*');
            const now = Date.now();

            for (const key of keys) {
                const val = await this._client.get(key);
                if (val) {
                    const entry = JSON.parse(val) as CacheEntry<Session>;
                    if (now - entry.Timestamp > entry.Ttl) {
                        await this._client.del(key);
                        this.updateMetricsOnDelete(entry);
                    }
                }
            }
        } catch (error) {
            console.error('Error cleaning up session cache:', error);
        }
    }

    // Cleanup on object destruction
    destroy(): void {
        try {
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
            }
            if (this._client) {
                this._client.quit();
            }
        } catch (error) {
            console.error('Error destroying session cache:', error);
        }
    }
}

