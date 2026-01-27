import { type Session } from './session';
import { type CacheMetrics, type CacheOptions } from "$lib/server/cache/cache.types";

export interface ISessionCache {
    set(key: string, value: Session, options?: CacheOptions): Promise<void>;
    get(key: string): Promise<Session | undefined>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    findAndClear(searchPattern: string): Promise<string[]>;
    getMetrics(): Promise<CacheMetrics>;
}

