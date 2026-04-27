/**
 * Cache Invalidation Strategy for Dashboard Tabs
 * Defines which caches to invalidate based on triggers
 */

import { dashboardCacheManager } from './cacheManager';

export type TabType = 'investor_summary' | 'governance' | 'compensation';

interface InvalidationRule {
  pattern: RegExp;
  triggers: ('company' | 'year')[];
  description: string;
}

// Define which API patterns depend on which parameters
const INVALIDATION_RULES: InvalidationRule[] = [
  {
    pattern: /\/company_report\/key_findings\//,
    triggers: ['company', 'year'],
    description: 'Key findings (depends on company and year)',
  },
  {
    pattern: /\/company_report\/key_findings\/years\//,
    triggers: ['company'],
    description: 'Available years (depends on company only)',
  },
  {
    pattern: /\/shareholder_proposals\//,
    triggers: ['company', 'year'],
    description: 'Shareholder proposals (depends on company and year)',
  },
  {
    pattern: /\/executive_compensation\//,
    triggers: ['company', 'year'],
    description: 'Executive compensation (depends on company and year)',
  },
  {
    pattern: /\/board_of_directors\//,
    triggers: ['company', 'year'],
    description: 'Board of directors (depends on company and year)',
  },
  {
    pattern: /\/auditor\//,
    triggers: ['company', 'year'],
    description: 'Auditor ratification (depends on company and year)',
  },
  {
    pattern: /\/engagement_details\//,
    triggers: ['company'],
    description: 'Engagement details (depends on company only)',
  },
];

// Tab-specific cache keys/patterns
const TAB_CACHE_PATTERNS = {
  investor_summary: [
    /\/company_report\/key_findings\//,
    /\/shareholder_proposals\//,
  ],
  governance: [
    /\/board_of_directors\//,
    /\/executive_compensation\//,
    /\/auditor\//,
  ],
  compensation: [
    /\/executive_compensation\//,
  ],
};

interface CacheInvalidationContext {
  previousCompanyId?: number;
  currentCompanyId: number;
  previousYear?: number;
  currentYear: number;
}

class CacheInvalidationStrategy {
  /**
   * Invalidate caches when company changes
   * Clear ALL company-dependent caches
   */
  invalidateOnCompanyChange(previousCompanyId: number | undefined, currentCompanyId: number): void {
    if (previousCompanyId === undefined || previousCompanyId === currentCompanyId) {
      return;
    }

    console.log(`🔄 Company changed: ${previousCompanyId} → ${currentCompanyId}`);

    // Find all rules that depend on company
    const companyDependentRules = INVALIDATION_RULES.filter(rule =>
      rule.triggers.includes('company')
    );

    companyDependentRules.forEach(rule => {
      dashboardCacheManager.invalidate(rule.pattern);
      console.log(`  ❌ Cleared: ${rule.description}`);
    });
  }

  /**
   * Invalidate caches when year changes (company stays same)
   * Only clear year-dependent caches
   */
  invalidateOnYearChange(companyId: number, previousYear: number | undefined, currentYear: number): void {
    if (previousYear === undefined || previousYear === currentYear) {
      return;
    }

    console.log(`📅 Year changed: ${previousYear} → ${currentYear} (Company: ${companyId})`);

    // Find all rules that depend on year
    const yearDependentRules = INVALIDATION_RULES.filter(rule =>
      rule.triggers.includes('year')
    );

    yearDependentRules.forEach(rule => {
      dashboardCacheManager.invalidate(rule.pattern);
      console.log(`  ❌ Cleared: ${rule.description}`);
    });
  }

  /**
   * Invalidate cache for specific tab only
   * Used when switching between tabs without changing company/year
   */
  invalidateTabCache(tab: TabType): void {
    const patterns = TAB_CACHE_PATTERNS[tab];
    
    console.log(`🔄 Invalidating ${tab} tab cache`);
    patterns.forEach(pattern => {
      dashboardCacheManager.invalidate(pattern);
      console.log(`  ❌ Cleared: ${pattern}`);
    });
  }

  /**
   * Invalidate all dashboard caches
   * Nuclear option - use carefully
   */
  invalidateAll(): void {
    console.log('💥 Invalidating ALL dashboard caches');
    dashboardCacheManager.invalidateAll();
  }

  /**
   * Process invalidation based on context changes
   * Centralized method to handle all invalidation logic
   */
  processInvalidation(context: CacheInvalidationContext): {
    companyChanged: boolean;
    yearChanged: boolean;
  } {
    const companyChanged =
      context.previousCompanyId !== undefined &&
      context.previousCompanyId !== context.currentCompanyId;

    const yearChanged =
      context.previousYear !== undefined &&
      context.previousYear !== context.currentYear;

    // Invalidate based on what changed
    if (companyChanged) {
      this.invalidateOnCompanyChange(context.previousCompanyId, context.currentCompanyId);
    } else if (yearChanged) {
      this.invalidateOnYearChange(context.currentCompanyId, context.previousYear, context.currentYear);
    }

    return { companyChanged, yearChanged };
  }

  /**
   * Get invalidation statistics for debugging
   */
  getRules(): InvalidationRule[] {
    return INVALIDATION_RULES;
  }

  getTabPatterns(): typeof TAB_CACHE_PATTERNS {
    return TAB_CACHE_PATTERNS;
  }
}

export const cacheInvalidationStrategy = new CacheInvalidationStrategy();

export default CacheInvalidationStrategy;
