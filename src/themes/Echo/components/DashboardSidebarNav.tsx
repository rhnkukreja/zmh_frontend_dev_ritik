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
  Scale,
  Target,
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
  group: string;
  subItems: SubItem[];
  subSection?: string;
  route?: string;
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
    label: "Overview",
    icon: Building2,
    group: "Company",
    subItems: [],
  },
  {
    key: "governance-profile",
    label: "Governance Profile",
    icon: Scale,
    group: "Company",
    subItems: [],
  },
  {
    key: "compensation",
    label: "Compensation",
    icon: Building2,
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
    label: "Shareholder Meeting Results",
    icon: Vote,
    group: "Company",
    subItems: [],
  },
  {
    key: "voting-data",
    label: "Voting Data",
    icon: Vote,
    group: "Company",
    subItems: [
      { key: "vds", label: "VDS" },
      { key: "npx", label: "N-PX" },
    ],
    defaultSubKey: "vds",
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
    key: "investor-overview",
    label: "Engagement Priorities",
    icon: Target,
    group: "Institution Insights",
    subSection: "engagement_priorities",
    subItems: [],
  },
  {
    key: "investor-overview",
    label: "Aggregate Voting",
    icon: PieChart,
    group: "Institution Insights",
    route: "/voting-data",
    subItems: [],
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
    if (section.route) {
      dispatch(setActiveSection(section.key));
      navigate(`${section.route}?ticker=${encodeURIComponent(companyGlobalSearchTicker)}`);
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
    goToDashboard();
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
        const isActive = section.route
          ? location.pathname === section.route
          : location.pathname === "/" &&
            activeSection === section.key &&
            (!section.subSection ||
              activeSubSection === section.subSection ||
              (section.subSection === "voting_rationale" && !activeSubSection));
        const isExpanded = expanded === section.key;
        const hasSubs = section.subItems.length > 0;

        return (
          <Fragment key={`${section.key}-${section.label}`}>
            {section.group !== previousSection?.group && (
              <li className="side-menu__divider side-menu__section-label">
                {section.group}
              </li>
            )}
            <li>
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
          </Fragment>
        );
      })}
    </>
  );
};

export default DashboardSidebarNav;
