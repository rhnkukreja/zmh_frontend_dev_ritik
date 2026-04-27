/**
 * Cache Manager for Dashboard API Requests
 * Implements request deduplication, cache tracking, and SWR (Stale While Revalidate) pattern
 */

interface CacheEntry {
  url: string;
  timestamp: number;
  ttl: number;
  data: any;
  tags?: string[];
}

interface CacheConfig {
  ttl?: number; // Time-to-live in milliseconds (default: 5 minutes)
  dedupeWindow?: number; // Deduplication window in milliseconds (default: 500ms)
}

interface CacheSetOptions {
  ttl?: number;
  tags?: string[];
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_DEDUPE_WINDOW = 500; // 500ms

class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private requestPromises: Map<string, Promise<any>> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl ?? DEFAULT_TTL,
      dedupeWindow: config.dedupeWindow ?? DEFAULT_DEDUPE_WINDOW,
    };
  }

  /**
   * Generate cache key from URL and optional parameters
   */
  generateKey(url: string, params?: Record<string, any>): string {
    if (!params) return url;
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${url}?${sortedParams}`;
  }

  /**
   * Check if cache is still valid (not expired)
   */
  isCacheValid(cacheKey: string): boolean {
    const entry = this.cache.get(cacheKey);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    return age < (entry.ttl ?? (this.config.ttl ?? DEFAULT_TTL));
  }

  /**
   * Get cached data if valid, otherwise null
   */
  get(cacheKey: string): any | null {
    if (!this.isCacheValid(cacheKey)) {
      this.cache.delete(cacheKey);
      return null;
    }
    return this.cache.get(cacheKey)?.data ?? null;
  }

  /**
   * Set cache with timestamp
   */
  set(cacheKey: string, data: any, options: CacheSetOptions = {}): void {
    this.cache.set(cacheKey, {
      url: cacheKey,
      timestamp: Date.now(),
      ttl: options.ttl ?? (this.config.ttl ?? DEFAULT_TTL),
      data,
      tags: options.tags,
    });
  }

  /**
   * Deduplicate concurrent requests
   * Returns existing promise if request is in-flight, otherwise null
   */
  getInFlightPromise(cacheKey: string): Promise<any> | null {
    return this.requestPromises.get(cacheKey) ?? null;
  }

  /**
   * Track request promise for deduplication
   */
  trackRequest(cacheKey: string, promise: Promise<any>): void {
    this.requestPromises.set(cacheKey, promise);

    promise
      .finally(() => {
        this.requestPromises.delete(cacheKey);
      });
  }

  /**
   * Invalidate cache for a specific key or pattern
   */
  invalidate(keyOrPattern: string | RegExp): void {
    if (typeof keyOrPattern === 'string') {
      this.cache.delete(keyOrPattern);
    } else {
      for (const key of this.cache.keys()) {
        if (keyOrPattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Invalidate all cache
   */
  invalidateAll(): void {
    this.cache.clear();
    this.requestPromises.clear();
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): {
    cacheSize: number;
    inFlightRequests: number;
    entries: Array<{ key: string; age: number; isValid: boolean; ttl: number; tags?: string[] }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      isValid: this.isCacheValid(key),
      ttl: entry.ttl,
      tags: entry.tags,
    }));

    return {
      cacheSize: this.cache.size,
      inFlightRequests: this.requestPromises.size,
      entries,
    };
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    for (const key of this.cache.keys()) {
      if (!this.isCacheValid(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const dashboardCacheManager = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  dedupeWindow: 500, // 500ms
});

export default CacheManager;
