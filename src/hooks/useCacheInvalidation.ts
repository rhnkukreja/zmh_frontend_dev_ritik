/**
 * Hook for managing cache invalidation based on company/year changes
 * Integrates with CacheInvalidationStrategy
 */

import { useEffect, useRef } from 'react';
import { cacheInvalidationStrategy } from '@/utils/cacheInvalidationStrategy';

interface UseCacheInvalidationOptions {
  onCompanyChange?: (oldId: number | undefined, newId: number) => void;
  onYearChange?: (oldYear: number | undefined, newYear: number) => void;
  debug?: boolean;
}

/**
 * Hook to handle cache invalidation on company/year changes
 * @param companyId - Current company ID
 * @param year - Current year
 * @param options - Configuration options
 */
export const useCacheInvalidation = (
  companyId: number | undefined,
  year: number | null | undefined,
  options: UseCacheInvalidationOptions = {}
) => {
  const previousStateRef = useRef<{
    companyId?: number;
    year?: number;
  }>({
    companyId: undefined,
    year: typeof year === 'number' ? year : undefined,
  });

  useEffect(() => {
    if (!companyId || typeof year !== 'number') {
      return;
    }

    const previousCompanyId = previousStateRef.current.companyId;
    const previousYear = previousStateRef.current.year;

    const { companyChanged, yearChanged } = cacheInvalidationStrategy.processInvalidation({
      previousCompanyId,
      currentCompanyId: companyId,
      previousYear,
      currentYear: year,
    });

    // Call optional callbacks
    if (companyChanged && options.onCompanyChange) {
      options.onCompanyChange(previousCompanyId, companyId);
    }

    if (yearChanged && options.onYearChange) {
      options.onYearChange(previousYear, year);
    }

    // Update previous state
    previousStateRef.current = {
      companyId,
      year,
    };
  }, [companyId, year, options]);

  const manualInvalidate = (trigger: 'company' | 'year' | 'all') => {
    if (trigger === 'all') {
      cacheInvalidationStrategy.invalidateAll();
    } else if (trigger === 'company' && companyId) {
      cacheInvalidationStrategy.invalidateOnCompanyChange(companyId, companyId);
    } else if (trigger === 'year' && typeof year === 'number') {
      cacheInvalidationStrategy.invalidateOnYearChange(companyId || 0, year, year);
    }
  };

  return {
    manualInvalidate,
  };
};

/**
 * Hook to get current cache statistics (for debugging)
 */
export const useCacheDebugInfo = () => {
  return {
    rules: cacheInvalidationStrategy.getRules(),
    tabPatterns: cacheInvalidationStrategy.getTabPatterns(),
  };
};

export default useCacheInvalidation;
