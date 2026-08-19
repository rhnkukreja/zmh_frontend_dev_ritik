import { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Building2,
  BarChart3,
  Users,
  Vote,
  ChevronRight,
  LucideIcon,
  PieChart,
  Shield,
  Target,
  Briefcase,
  Building,
  CalendarCheck,
  ClipboardList,
  FileSearch2,
  Files,
  FileText,
  MessageSquare,
  Network,
  LineChart,
  Landmark,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { RootState } from "@/stores/store";
import {
  DashboardSection,
  selectDashboardNav,
  setActiveSection,
  setActiveSubSection,
} from "@/stores/dashboardNavSlice";

interface SubItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  // When true, this sub-item is only visible to Admin users.
  adminOnly?: boolean;
}

interface SectionDef {
  key: DashboardSection;
  label: string;
  icon: LucideIcon;
  group: string;
  subItems: SubItem[];
  subSection?: string;
  route?: string;
  // Sub-item that should appear active when the user hasn't explicitly
  // clicked a sub-item yet (matches each component's own default tab).
  defaultSubKey?: string;
  // When true, clicking this external-route item won't change the dashboard's
  // active section (the dashboard has no matching tab for it).
  preserveActiveSection?: boolean;
  // Optional count badge key pulled from modulesData.
  countKey?: "case_studies" | "engagement_details" | "shareholder_proposal" | "activist_filings";
  // Hide the item entirely when the count is zero.
  hideWhenEmpty?: boolean;
  // Render a small BETA badge next to the label.
  beta?: boolean;
}

// Koyfin-style navigation for the main dashboard.
// Each section maps to a tab previously rendered inside ZMHDashboard.
// Sub-item keys MUST match the internal tab keys used by each component
// (InvestorOverview's activeInsightTab, Voting Data sub-tabs, etc.).
const BASE_SECTIONS: SectionDef[] = [
  {
    key: "company-overview",
    label: "Overview",
    icon: Building2,
    group: "Company",
    subItems: [],
  },
  {
    key: "governance-profile",
    label: "Governance Profile",
    icon: Shield,
    group: "Company",
    subItems: [],
  },
  {
    key: "compensation",
    label: "Compensation",
    icon: Briefcase,
    group: "Company",
    subItems: [],
  },
  {
    key: "ownership",
    label: "Ownership",
    icon: Users,
    group: "Company",
    subItems: [],
  },
  {
    key: "shareholder-meeting-results",
    label: "Shareholder Meeting",
    icon: CalendarCheck,
    group: "Company",
    subItems: [],
  },
  {
    key: "voting-data",
    label: "Voting Data",
    icon: Vote,
    group: "Company",
    subItems: [
      { key: "vds", label: "By Fund Family", icon: Building },
      { key: "voting-rationale", label: "Voting Rationale", icon: MessageSquare },
      { key: "npx", label: "N-PX", icon: ClipboardList },
      { key: "npx-analytics", label: "N-PX Analytics", icon: LineChart, adminOnly: true },
    ],
    defaultSubKey: "vds",
  },
  {
    key: "company-case-studies",
    label: "Case Studies",
    icon: FileSearch2,
    group: "Company",
    subItems: [],
    route: "/case-studies?tab=specific&source=company",
    preserveActiveSection: true,
    countKey: "case_studies",
  },
  {
    key: "company-engagement-details",
    label: "Engagement Details",
    icon: Network,
    group: "Company",
    subItems: [],
    route: "/engagement-detail?source=company",
    preserveActiveSection: true,
    countKey: "engagement_details",
  },
  {
    key: "investor-overview",
    label: "Engagement Priorities",
    icon: Target,
    group: "Company",
    subSection: "engagement_priorities",
    subItems: [],
  },
  {
    key: "company-shareholder-proposals",
    label: "Shareholder Proposals",
    icon: Files,
    group: "Company",
    subItems: [],
    route: "/shareholder-proposal?source=company",
    preserveActiveSection: true,
    countKey: "shareholder_proposal",
  },
  {
    key: "company-activist-filings",
    label: "Activist Filings",
    icon: FileText,
    group: "Company",
    subItems: [],
    route: "/activist-filings?source=company",
    preserveActiveSection: true,
    countKey: "activist_filings",
    hideWhenEmpty: true,
    beta: true,
  },
  {
    key: "investor-overview",
    label: "Overview",
    icon: BarChart3,
    group: "Institution Insights",
    subSection: "voting_rationale",
    subItems: [],
  },
  {
    key: "investor-profile",
    label: "Investor Resources",
    icon: Landmark,
    group: "Institution Insights",
    route: "/investor-profile",
    subItems: [],
    preserveActiveSection: true,
  },
  {
    key: "investor-overview",
    label: "Voting Data",
    icon: PieChart,
    group: "Institution Insights",
    route: "/voting-data",
    subItems: [],
  },
  {
    key: "investor-overview",
    label: "Exec. Comp. Voting Data",
    icon: Briefcase,
    group: "Institution Insights",
    route: "/executive-compensation",
    subItems: [],
  },
];

const DashboardSidebarNav = ({
  modulesData = {},
  expandedGroup,
  onToggleGroup,
}: {
  modulesData?: any;
  expandedGroup: string;
  onToggleGroup: (group: string) => void;
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { source?: string } | undefined;

  const { activeSection, activeSubSection } = useAppSelector(selectDashboardNav);
  const { companyGlobalSearchName, companyGlobalSearchTicker, user } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  // Track which section is expanded in the sidebar. Default: the active one.
  const [expanded, setExpanded] = useState<DashboardSection | null>(activeSection);

  useEffect(() => {
    setExpanded(activeSection);
  }, [activeSection]);

  // Only show this navigation once a company has been selected.
  if (!companyGlobalSearchTicker) return null;

  const goToDashboard = (preserveDashboardParams = false) => {
    const params = preserveDashboardParams
      ? new URLSearchParams(location.search)
      : new URLSearchParams();
    params.set("ticker", companyGlobalSearchTicker);
    navigate(`/?${params.toString()}`, { replace: true });
  };

  // Build sections dynamically based on user role, count availability, and required ordering.
  const sections: SectionDef[] = BASE_SECTIONS.filter((s) => {
    // Compensation is restricted to Admins/Analysts
    if (s.key === "compensation") {
      const userType = user?.user_type;
      return userType === "Admin" || userType === "Analyst";
    }
    // Hide count-driven tabs when there is no data for the selected company,
    // except for sections that should stay visible but disabled.
    if (s.countKey) {
      const count = modulesData?.[s.countKey];
      if ((!count || count <= 0) && s.hideWhenEmpty) {
        return false;
      }
      if (!count && !s.hideWhenEmpty) {
        return false;
      }
    }
    return true;
  });

  const handleSectionClick = (section: SectionDef) => {
    if (section.route) {
      if (!section.preserveActiveSection) {
        dispatch(setActiveSection(section.key));
      }
      const [basePath, existingQuery] = section.route.split("?");
      const params = new URLSearchParams(existingQuery || "");
      params.set("ticker", companyGlobalSearchTicker);
      navigate(`${basePath}?${params.toString()}`);
      setExpanded(section.key);
      return;
    }

    if (section.subSection) {
      dispatch(
        setActiveSubSection({
          section: section.key,
          subSection: section.subSection,
        })
      );
    } else {
      dispatch(setActiveSection(section.key));
    }

    goToDashboard();
    setExpanded((prev) => (prev === section.key ? null : section.key));
  };

  const handleSubItemClick = (section: SectionDef, sub: SubItem) => {
    dispatch(setActiveSubSection({ section: section.key, subSection: sub.key }));
    goToDashboard(section.key === "voting-data");
    setExpanded(section.key);
  };

  return (
    <>
      {/* Spacer to prevent first item from sitting under the header block */}
      <li className="mt-2" aria-hidden="true" />
      {/* Sections */}
      {sections.map((section, sectionIndex) => {
        const Icon = section.icon;
        const previousSection = sections[sectionIndex - 1];
        const routeBasePath = section.route ? section.route.split("?")[0] : undefined;
        const routeQuery = section.route ? section.route.split("?")[1] : undefined;
        const routeParams = routeQuery ? new URLSearchParams(routeQuery) : null;
        const currentParams = new URLSearchParams(location.search);
        const routeQueryMatches = routeParams
          ? Array.from(routeParams.entries()).every(
              ([key, value]) => currentParams.get(key) === value
            )
          : true;
        const isActive = section.route
          ? location.pathname === routeBasePath && routeQueryMatches
          : location.pathname === "/" &&
            activeSection === section.key &&
            (!section.subSection ||
              activeSubSection === section.subSection ||
              (section.subSection === "voting_rationale" && !activeSubSection));
        const isCaseStudiesDetail = location.pathname.startsWith("/case-studies/");
        const isShareholderDetail = location.pathname.startsWith("/shareholder-proposal/");
        const isCompanyDetailSource = locationState?.source === "company";
        const isCompanyDetailActive =
          (section.key === "company-case-studies" && isCaseStudiesDetail && isCompanyDetailSource) ||
          (section.key === "company-shareholder-proposals" && isShareholderDetail && isCompanyDetailSource);
        const resolvedIsActive = isActive || isCompanyDetailActive;
        const isExpanded = expanded === section.key;
        const visibleSubItems = section.subItems.filter(
          (sub) => !sub.adminOnly || user?.user_type === "Admin"
        );
        const hasSubs = visibleSubItems.length > 0;
        const countValue = section.countKey ? Number(modulesData?.[section.countKey]) : null;
        const hasCountValue = countValue !== null && Number.isFinite(countValue);
        const isDisabled = false;

        const isCompanyGroup = section.group === "Company";
        const isGroupExpanded = isCompanyGroup
          ? true
          : expandedGroup === section.group;

        return (
          <Fragment key={`${section.key}-${section.label}`}>
            {section.group !== previousSection?.group && (
              isCompanyGroup ? (
                <li className="side-menu__divider side-menu__section-label !text-xs">
                  <span>{section.group}</span>
                </li>
              ) : (
                <li
                  className="side-menu__divider side-menu__section-label !text-xs flex items-center justify-between cursor-pointer select-none"
                  onClick={() => onToggleGroup(section.group)}
                >
                  <span>{section.group}</span>
                  <ChevronRight
                    className={clsx([
                      "w-5 h-5 transition-transform duration-200",
                      { "rotate-90": isGroupExpanded },
                    ])}
                  />
                </li>
              )
            )}
            {isGroupExpanded && (
            <li>
            <a
              href=""
              aria-disabled={isDisabled}
              onClick={(e) => {
                e.preventDefault();
                if (isDisabled) return;
                handleSectionClick(section);
              }}
              className={clsx([
                "side-menu__link",
                { "side-menu__link--active": resolvedIsActive },
                isDisabled && "pointer-events-none cursor-not-allowed opacity-50",
              ])}
            >
              <span className="relative">
                <Icon className="side-menu__link__icon w-[18px] h-[18px]" />
                {hasCountValue && section.countKey !== "activist_filings" && (countValue! > 0 || section.hideWhenEmpty) && (
                  <span
                    className={clsx([
                      "absolute rounded-full min-w-[16px] h-4 px-1 text-[9px] font-semibold text-white -top-1.5 left-2.5 flex items-center justify-center",
                      countValue > 0 ? "bg-[#DC661F]" : "bg-slate-400",
                    ])}
                  >
                    {countValue}
                  </span>
                )}
              </span>
              <div className="side-menu__link__title link_color flex items-center gap-1.5">
                <span>{section.label}</span>
                {section.beta && (
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary shadow-sm">
                    BETA
                  </span>
                )}
              </div>
              {hasSubs && (
                <ChevronRight
                  className={clsx([
                    "side-menu__link__chevron w-4 h-4 transition-transform duration-200",
                    { "rotate-90": isExpanded },
                  ])}
                />
              )}
            </a>

            {/* Sub-items. Hidden entirely while the sidebar is collapsed
                (unless the user is hovering it open) to avoid an empty
                white box where the text would otherwise be invisible. */}
            {hasSubs && (
              <ul
                className={clsx([
                  isExpanded ? "block" : "hidden",
                  "group-[.side-menu--collapsed]:xl:hidden",
                  "group-[.side-menu--collapsed.side-menu--on-hover]:xl:block",
                ])}
              >
                {visibleSubItems.map((sub) => {
                  const effectiveSubKey =
                    activeSubSection ?? section.defaultSubKey ?? null;
                  const subActive = isActive && effectiveSubKey === sub.key;
                  const SubIcon = sub.icon;
                  return (
                    <li key={sub.key}>
                      <a
                        href=""
                        onClick={(e) => {
                          e.preventDefault();
                          handleSubItemClick(section, sub);
                        }}
                        className={clsx([
                          "side-menu__link",
                          { "side-menu__link--active": subActive },
                        ])}
                      >
                        <div className="flex items-center gap-2 ml-6">
                          {SubIcon && <SubIcon className="w-4 h-4" />}
                          <div className="side-menu__link__title link_color">
                            {sub.label}
                          </div>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            </li>
            )}
          </Fragment>
        );
      })}
    </>
  );
};

export default DashboardSidebarNav;
export { BASE_SECTIONS as DASHBOARD_SECTIONS };
export type { SectionDef };
