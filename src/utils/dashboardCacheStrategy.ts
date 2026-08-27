import type { TabType } from "@/utils/cacheInvalidationStrategy";

export type DashboardCacheScope =
  | "company_overview"
  | "years"
  | "board"
  | "compensation"
  | "auditor"
  | "shareholder"
  | "engagement"
  | "default";

export type DashboardCacheStrategy = {
  scope: DashboardCacheScope;
  ttl: number;
  tags: string[];
  prefetchTabs: TabType[];
};

const MINUTE = 60 * 1000;

const TAB_STRATEGIES: Record<TabType, DashboardCacheStrategy> = {
  investor_summary: {
    scope: "company_overview",
    ttl: 10 * MINUTE,
    tags: ["company_overview", "investor_summary"],
    prefetchTabs: ["governance"],
  },
  governance: {
    scope: "board",
    ttl: 15 * MINUTE,
    tags: ["board", "auditor", "governance"],
    prefetchTabs: ["compensation"],
  },
  compensation: {
    scope: "compensation",
    ttl: 20 * MINUTE,
    tags: ["compensation"],
    prefetchTabs: ["governance"],
  },
};

const URL_RULES: Array<{ pattern: RegExp; strategy: DashboardCacheStrategy }> = [
  {
    pattern: /\/company_report\/key_findings\/years\//,
    strategy: {
      scope: "years",
      ttl: 30 * MINUTE,
      tags: ["company_overview", "years"],
      prefetchTabs: ["investor_summary"],
    },
  },
  {
    pattern: /\/company_report\/key_findings_gpt\//,
    strategy: {
      scope: "company_overview",
      ttl: 12 * MINUTE,
      tags: ["company_overview", "gpt"],
      prefetchTabs: ["investor_summary"],
    },
  },
  {
    pattern: /\/company_report\/key_findings\//,
    strategy: TAB_STRATEGIES.investor_summary,
  },
  {
    pattern: /\/board_of_directors\//,
    strategy: TAB_STRATEGIES.governance,
  },
  {
    pattern: /\/executive_compensation\//,
    strategy: TAB_STRATEGIES.compensation,
  },
  {
    pattern: /\/auditor\//,
    strategy: TAB_STRATEGIES.governance,
  },
  {
    pattern: /\/shareholder_proposals\//,
    strategy: TAB_STRATEGIES.investor_summary,
  },
  {
    pattern: /\/engagement_details\//,
    strategy: {
      scope: "engagement",
      ttl: 12 * MINUTE,
      tags: ["engagement", "investor_summary"],
      prefetchTabs: ["investor_summary"],
    },
  },
  {
    pattern: /\/api\/npx-proposal-voting-stats\//,
    strategy: {
      scope: "compensation",
      ttl: 15 * MINUTE,
      tags: ["npx_proposal_voting_stats"],
      prefetchTabs: [],
    },
  },
  {
    pattern: /\/api\/compensation-proposals\/stats\//,
    strategy: {
      scope: "compensation",
      ttl: 15 * MINUTE,
      tags: ["compensation_proposals_stats"],
      prefetchTabs: [],
    },
  },
  {
    pattern: /\/api\/proposal-voting-stats\//,
    strategy: {
      scope: "compensation",
      ttl: 15 * MINUTE,
      tags: ["proposal_voting_stats"],
      prefetchTabs: [],
    },
  },
];

export const defaultDashboardCacheStrategy: DashboardCacheStrategy = {
  scope: "default",
  ttl: 5 * MINUTE,
  tags: ["default"],
  prefetchTabs: [],
};

export const getTabCacheStrategy = (tab: TabType): DashboardCacheStrategy => {
  return TAB_STRATEGIES[tab] ?? defaultDashboardCacheStrategy;
};

export const getDashboardCacheStrategyForUrl = (url: string): DashboardCacheStrategy => {
  const rule = URL_RULES.find((entry) => entry.pattern.test(url));
  return rule?.strategy ?? defaultDashboardCacheStrategy;
};

export const getPrefetchTabsForStrategy = (strategy: DashboardCacheStrategy): TabType[] => {
  return strategy.prefetchTabs;
};

export const dashboardCacheStrategies = {
  tabs: TAB_STRATEGIES,
  rules: URL_RULES,
};