/**
 * Hook for smart data fetching with cache & request deduplication
 * Prevents duplicate simultaneous requests and improves performance with SWR pattern
 */

import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dashboardCacheManager } from '@/utils/cacheManager';
import { getDashboardCacheStrategyForUrl, getTabCacheStrategy } from '@/utils/dashboardCacheStrategy';
import type { TabType } from '@/utils/cacheInvalidationStrategy';

interface UseFetchOptions {
  skip?: boolean; // Skip fetch if true
  ttl?: number; // Cache time-to-live in ms
  dedupeWindow?: number; // Deduplication window in ms
  tab?: TabType;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Smart fetch hook with cache & deduplication
 * @param url - The URL/key to fetch
 * @param thunk - Redux thunk action to dispatch
 * @param selector - Redux selector to get current state
 * @param options - Fetch options
 */
export const useSmartFetch = (
  url: string,
  thunk: any,
  selector: (state: any) => any,
  options: UseFetchOptions = {}
) => {
  const dispatch = useDispatch();
  const data = useSelector(selector);
  const cacheKeyRef = useRef<string>(dashboardCacheManager.generateKey(url));
  const hasInitializedRef = useRef(false);
  const cacheStrategy = options.tab ? getTabCacheStrategy(options.tab) : getDashboardCacheStrategyForUrl(url);
  const resolvedTtl = options.ttl ?? cacheStrategy.ttl;

  const fetchData = useCallback(async () => {
    if (options.skip) {
      return;
    }

    const cacheKey = cacheKeyRef.current;

    // Check for in-flight request (deduplication)
    const inFlightPromise = dashboardCacheManager.getInFlightPromise(cacheKey);
    if (inFlightPromise) {
      console.log('🔄 Request deduplicated (in-flight):', cacheKey);
      return inFlightPromise;
    }

    // Check for valid cache
    if (dashboardCacheManager.isCacheValid(cacheKey)) {
      console.log('✅ Cache hit:', cacheKey);
      return dashboardCacheManager.get(cacheKey);
    }

    // Fire the request
    console.log('📡 Fetching:', cacheKey);
    const promise = (dispatch(thunk(url)) as any).then((result: any) => {
      dashboardCacheManager.set(cacheKey, result.payload, {
        ttl: resolvedTtl,
        tags: cacheStrategy.tags,
      });
      if (options.onSuccess) {
        options.onSuccess(result.payload);
      }
      return result.payload;
    }).catch((error: any) => {
      console.error('❌ Fetch error:', cacheKey, error);
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    });

    dashboardCacheManager.trackRequest(cacheKey, promise);
    return promise;
  }, [cacheStrategy.tags, dispatch, options.onError, options.onSuccess, options.skip, resolvedTtl, thunk, url]);

  const invalidateCache = useCallback(() => {
    dashboardCacheManager.invalidate(cacheKeyRef.current);
  }, []);

  return {
    data,
    fetchData,
    invalidateCache,
    isCached: dashboardCacheManager.isCacheValid(cacheKeyRef.current),
    cacheStrategy,
  };
};

/**
 * Get cache statistics for debugging
 */
export const useCacheStats = () => {
  return dashboardCacheManager.getStats();
};

/**
 * Force invalidate cache by pattern
 */
export const useInvalidateCache = () => {
  return useCallback((pattern: string | RegExp) => {
    dashboardCacheManager.invalidate(pattern);
  }, []);
};

export default useSmartFetch;
