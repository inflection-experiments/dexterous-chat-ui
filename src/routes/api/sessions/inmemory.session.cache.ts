import { type ISessionCache } from "./session.cache.interface";
import { type CacheMetrics, type CacheOptions, type CacheEntry, type CacheConfig } from "$lib/server/cache/cache.types";
import { CacheMap } from "$lib/server/cache/cache.map";
import type { Session } from "./session";

////////////////////////////////////////////////////////////////////////////////////////

export class InMemorySessionCache implements ISessionCache {
    private cache: CacheMap<CacheEntry<Session>> = new CacheMap<CacheEntry<Session>>();
    private metrics: CacheMetrics;
    private config: CacheConfig;
    private cleanupInterval: any;

    constructor(config?: Partial<CacheConfig>) {
        this.cache = new CacheMap<CacheEntry<Session>>();
        
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

        // Initialize config with defaults
        this.config = {
            DefaultTTL: 24 * 60 * 60 * 1000, // 24 hours
            MaxMemorySize: 1024 * 1024 * 1024, // 1GB
            EnableMetrics: true,
            EnableCompression: false,
            CompressionThreshold: 1024, // 1KB
            CleanupInterval: 5 * 60 * 1000, // 5 minutes
            ...config
        };

        // Start cleanup interval
        this.startCleanupInterval();
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
            const entry: CacheEntry<Session> = {
                Data: value,
                Timestamp: Date.now(),
                Ttl: options?.Ttl || this.config.DefaultTTL,
                Hits: 0,
                Size: this.calculateSize(value),
                LastModified: new Date().toUTCString()
            };

            this.cache.set(key, entry);
            this.updateMetricsOnSet(entry);
        } catch (error) {
            console.error('Error setting session:', error);
        }
    };

    get = async (key: string): Promise<Session | undefined> => {
        try {
            const entry = this.cache.get(key);
            if (!entry) {
                this.updateMetricsOnMiss();
                return undefined;
            }

            // Check if entry is expired
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                this.updateMetricsOnMiss();
                return undefined;
            }

            // Update hit count and metrics
            entry.Hits++;
            this.updateMetricsOnHit();
            return entry.Data;
        } catch (error) {
            console.error('Error getting session:', error);
            return undefined;
        }
    };

    has = async (key: string): Promise<boolean> => {
        try {
            const entry = this.cache.get(key);
            if (!entry) {
                this.updateMetricsOnMiss();
                return false;
            }

            if (this.isExpired(entry)) {
                this.cache.delete(key);
                this.updateMetricsOnMiss();
                return false;
            }

            entry.Hits++;
            this.updateMetricsOnHit();
            return true;
        } catch (error) {
            console.error('Error checking if session exists:', error);
            return false;
        }
    };

    delete = async (key: string): Promise<boolean> => {
        try {
            const entry = this.cache.get(key);
            if (entry) {
                this.updateMetricsOnDelete(entry);
            }
            return this.cache.delete(key);
        } catch (error) {
            console.error('Error deleting session:', error);
            return false;
        }
    };

    clear = async (): Promise<void> => {
        try {
            this.cache.clear();
            this.resetMetrics();
        } catch (error) {
            console.error('Error clearing session cache:', error);
        }
    };

    findAndClear = async (searchPattern: string): Promise<string[]> => {
        try {
            const keys = this.cache.findAndClear(searchPattern);
            if (keys.length > 0) {
                this.recalculateMetrics();
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
        } catch (error) {
            console.error('Error updating metrics on set:', error);
        }
    }

    private updateMetricsOnHit(): void {
        try {
            if (!this.config.EnableMetrics) return;

            this.metrics.Hits++;
            this.metrics.HitRate = this.metrics.Hits / (this.metrics.Hits + this.metrics.Misses);
        } catch (error) {
            console.error('Error updating metrics on hit:', error);
        }
    }

    private updateMetricsOnMiss(): void {
        try {
            if (!this.config.EnableMetrics) return;

            this.metrics.Misses++;
            this.metrics.HitRate = this.metrics.Hits / (this.metrics.Hits + this.metrics.Misses);
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

    private recalculateMetrics(): void {
        try {
            if (!this.config.EnableMetrics) return;

            let totalSize = 0;
            let oldestEntry = Date.now();
            let newestEntry = 0;
            let totalEntries = 0;

            for (const [_, entry] of this.cache.entries()) {
                totalSize += entry.Size;
                if (entry.Timestamp < oldestEntry) oldestEntry = entry.Timestamp;
                if (entry.Timestamp > newestEntry) newestEntry = entry.Timestamp;
                totalEntries++;
            }

            this.metrics.TotalSize = totalSize;
            this.metrics.TotalEntries = totalEntries;
            this.metrics.OldestEntry = oldestEntry;
            this.metrics.NewestEntry = newestEntry;
            this.metrics.AverageEntrySize = totalEntries > 0 
                ? totalSize / totalEntries 
                : 0;
        } catch (error) {
            console.error('Error recalculating metrics:', error);
        }
    }

    private async evictEntries(requiredSize: number): Promise<void> {
        try {
            const entries = Array.from(this.cache.entries())
                .map(([key, entry]) => ({ key, entry }))
                .sort((a, b) => {
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
                this.cache.delete(key);
                freedSpace += entry.Size;
                this.updateMetricsOnDelete(entry);
            }
        } catch (error) {
            console.error('Error evicting entries:', error);
        }
    }

    private async cleanup(): Promise<void> {
        try {
            const now = Date.now();
            const entries = Array.from(this.cache.entries());
            
            for (const [key, entry] of entries) {
                if (now - entry.Timestamp > entry.Ttl) {
                    this.cache.delete(key);
                    this.updateMetricsOnDelete(entry);
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
        } catch (error) {
            console.error('Error destroying session cache:', error);
        }
    }
}

