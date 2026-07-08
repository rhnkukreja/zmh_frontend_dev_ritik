import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Building2,
  BarChart3,
  Users,
  Vote,
  ChevronRight,
  LucideIcon,
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
}

interface SectionDef {
  key: DashboardSection;
  label: string;
  icon: LucideIcon;
  subItems: SubItem[];
  // Sub-item that should appear active when the user hasn't explicitly
  // clicked a sub-item yet (matches each component's own default tab).
  defaultSubKey?: string;
}

// Koyfin-style navigation for the main dashboard.
// Each section maps to a tab previously rendered inside ZMHDashboard.
// Sub-item keys MUST match the internal tab keys used by each component
// (InvestorOverview's activeInsightTab, Voting Data sub-tabs, etc.).
const BASE_SECTIONS: SectionDef[] = [
  {
    key: "company-overview",
    label: "Company Overview",
    icon: Building2,
    subItems: [],
  },
  {
    key: "governance-profile",
    label: "Governance Profile",
    icon: Building2,
    subItems: [],
  },
  {
    key: "compensation",
    label: "Compensation",
    icon: Building2,
    subItems: [],
  },
  {
    key: "ownership",
    label: "Ownership",
    icon: Users,
    subItems: [],
  },
  {
    key: "shareholder-meeting-results",
    label: "Shareholder Meeting",
    icon: Vote,
    subItems: [],
  },
  {
    key: "voting-data",
    label: "Voting Data",
    icon: Vote,
    subItems: [
      { key: "vds", label: "Voting Data" },
      { key: "npx", label: "N-PX" },
    ],
    defaultSubKey: "vds",
  },
  {
    key: "investor-overview",
    label: "Investor Insight",
    icon: BarChart3,
    subItems: [
      { key: "voting_rationale", label: "Overview" },
      { key: "engagement_priorities", label: "Engagement Priorities" },
    ],
    defaultSubKey: "voting_rationale",
  },
];

const DashboardSidebarNav = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

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

  const goToDashboard = () => {
    const onDashboard = location.pathname === "/";
    if (!onDashboard) {
      navigate(`/?ticker=${encodeURIComponent(companyGlobalSearchTicker)}`);
    }
  };

  // Build sections dynamically based on user role and required ordering.
  const sections: SectionDef[] = BASE_SECTIONS.filter((s) => {
    // Compensation is restricted to Admins/Analysts
    if (s.key === "compensation") {
      const userType = user?.user_type;
      return userType === "Admin" || userType === "Analyst";
    }
    return true;
  });

  const handleSectionClick = (section: SectionDef) => {
    dispatch(setActiveSection(section.key));
    goToDashboard();
    // Toggle expansion; keep it open if it becomes the active section.
    setExpanded((prev) => (prev === section.key ? null : section.key));
  };

  const handleSubItemClick = (section: SectionDef, sub: SubItem) => {
    dispatch(setActiveSubSection({ section: section.key, subSection: sub.key }));
    goToDashboard();
    setExpanded(section.key);
  };

  return (
    <>
      {/* Spacer to prevent first item from sitting under the header block */}
      <li className="mt-2" aria-hidden="true" />
      {/* Sections */}
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = location.pathname === "/" && activeSection === section.key;
        const isExpanded = expanded === section.key;
        const hasSubs = section.subItems.length > 0;

        return (
          <li key={section.key}>
            <a
              href=""
              onClick={(e) => {
                e.preventDefault();
                handleSectionClick(section);
              }}
              className={clsx([
                "side-menu__link",
                { "side-menu__link--active": isActive },
              ])}
            >
              <Icon className="side-menu__link__icon w-[18px] h-[18px]" />
              <div className="side-menu__link__title link_color">
                {section.label}
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
                {section.subItems.map((sub) => {
                  const effectiveSubKey =
                    activeSubSection ?? section.defaultSubKey ?? null;
                  const subActive = isActive && effectiveSubKey === sub.key;
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
                        <div className="side-menu__link__title link_color !ml-2">
                          {sub.label}
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </>
  );
};

export default DashboardSidebarNav;
