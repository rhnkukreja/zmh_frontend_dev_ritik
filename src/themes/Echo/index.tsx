import "@/assets/css/vendors/simplebar.css";
import "@/assets/css/themes/echo.css";
import { Transition } from "react-transition-group";
import React, { Fragment, useState, useEffect, createRef, useRef } from "react";
import type { MouseEvent } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gen-search-widget': {
        configid?: string;
        location?: string;
        triggerid?: string;
        alwaysOpened?: boolean;
        children?: React.ReactNode;
      };
    }
  }
}
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectSideMenu } from "@/stores/sideMenuSlice";
import {
  selectCompactMenu,
  setCompactMenu as setCompactMenuStore,
} from "@/stores/compactMenuSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { FormattedMenu, linkTo, nestedMenu, enter, leave } from "./side-menu";
import { BookOpen } from "lucide-react";
import Lucide, { type AppIconName } from "@/components/Base/Lucide";
import { Dialog } from "@/components/Base/Headless";
import clsx from "clsx";
import SimpleBar from "simplebar";
import { Menu } from "@/components/Base/Headless";
import QuickSearch from "@/components/QuickSearch";
import SwitchAccount from "@/components/SwitchAccount";
import NotificationsPanel from "@/components/NotificationsPanel";
import ActivitiesPanel from "@/components/ActivitiesPanel";
import localStorageHelper, {
  createDynamicURL,
  filterMenu,
  getCustomRelativeDate,
} from "@/utils/helper";
import headerLogo from "../../assets/images/logo/Vantage ZMH-01.png";
import { logout, setDashboardGlobalSearch } from "@/stores/authenticationSlice";
import { Headphones, Mail } from "lucide-react";
import { persistor, RootState } from "@/stores/store";

import LoadingIcon from "@/components/Base/LoadingIcon";
import notificationIcon2 from "@/assets/images/zmh-images/side-bell.png";
import AIAssistantButton from "@/components/Base/AIAssistantButton";
import sideBarIcon from "@/assets/images/zmh-images/Group 1597887028.png";
import Tippy from "@/components/Base/Tippy";
import CountryInfoHeader from "./components/countryHeader";
import VotingDataBanner from "./components/VotingDataBanner";
import InvestorProfileTour from "./components/InvestorProfileTour";
import GetHelp from "@/components/Help";
import { resetInvestorProfiles } from "@/stores/investersProfileSlice";
import { resetCompany } from "@/stores/companySlice";
import { resetInstitution } from "@/stores/institutionSlice";
import { resetShareholderProposal } from "@/stores/shareholderProposalSlice";
import { toast } from "react-toastify";
import { resetProxyVotingGuidelines } from "@/stores/proxyVotingGuidelineSlice";
import { resetEngagementQuestions } from "@/stores/engagementQuestionSlice";
import { resetPeerAnalysis } from "@/stores/peerAnalysisSlice";
import { resetCaseStudy } from "@/stores/caseStudySlice";
import NotificationAlert from "@/components/NotificationAlert";

import { baseURL, pageTitles, subSidebarRoutes } from "@/constant";
import useCompanySearch from "@/hooks/useCompanySearch";
import GlobalCreateNoteModal from "./components/GlobalCreateNoteModal";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import { dashboardService } from "@/services/dashboard";
import GetWhatsNew from "@/components/WhatsNew";
import { Disclosure } from "@/components/Base/Headless";
import Drawer from "@/components/Base/Headless/Drawer";
import SearchWidgetIframe from "@/components/SearchWidget";
import DashboardSidebarNav, {
  DASHBOARD_SECTIONS,
} from "./components/DashboardSidebarNav";
import { selectDashboardNav } from "@/stores/dashboardNavSlice";

const getSidebarGroup = (menu: string | FormattedMenu) => {
  if (typeof menu === "string") {
    return menu === "Admin" ? "Administration" : "";
  }

  if (
    [
      "Investor Resources",
      "Case Studies",
      "Engagement Details",
      "Shareholder Proposals",
      "Voting Data",
    ].includes(menu.title)
  ) {
    return "Market Analytics";
  }

  if (
    [
      "Proxy Contests",
      "Activist Profile",
      "Voting Analytics",
      "Campaign Details",
    ].includes(menu.title)
  ) {
    return "Proxy Contests";
  }

  if (
    [
      "Custom Reports",
      "Podcasts",
      "Newsletter",
      "Email Alert",
      "Meeting Notes",
      "Help",
    ].includes(menu.title)
  ) {
    return "User Tools";
  }

  if (["Admin Panel", "Company", "User Detail", "User Management"].includes(menu.title)) {
    return "Administration";
  }

  return "";
};

type NotificationItem = {
  company: string | null;
  institution: string | null;
  date: string;
  viewed: boolean;
  module: string;
  action: string;
  count: number;
};

type NotificationTab = {
  tab_name: string;
  tab_notifications?: Record<string, NotificationItem[]>;
};

type NotificationResponse = {
  notification_status: boolean;
  notifications: NotificationTab[];
};

type NotificationCompanyGroup = {
  company: string;
  items: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  latestDate: string;
};

const notificationModuleIcons: Partial<Record<string, AppIconName>> = {
  "Investor Profile": "Landmark",
  "Case Studies": "FileSearch2",
  "Engagement Detail": "Network",
  "Proxy Voting Guideline": "FileCheck2",
  "Shareholder Proposal": "Files",
  "Voting Data": "Vote",
  "Activist Filings": "FileText",
};

const getNotificationModuleIcon = (moduleName: string): AppIconName => {
  return notificationModuleIcons[moduleName] || "BellRing";
};

const getNotificationTimestamp = (value?: string | null) => {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getNotificationListCount = (
  items: NotificationItem[] = [],
  unreadOnly = false
) => {
  return unreadOnly ? items.filter((item) => !item.viewed).length : items.length;
};

const getNotificationTabCount = (
  tab?: NotificationTab,
  unreadOnly = false
) => {
  return Object.values(tab?.tab_notifications || {}).reduce(
    (sum, items) => sum + getNotificationListCount(Array.isArray(items) ? items : [], unreadOnly),
    0
  );
};

const getDefaultNotificationTabIndex = (tabs: NotificationTab[] = []) => {
  if (tabs.length === 0) {
    return 0;
  }

  const allTabIndex = tabs.findIndex((tab) => tab.tab_name === "All");
  const companyTabIndex = tabs.findIndex((tab, index) => index !== allTabIndex);

  if (companyTabIndex === -1) {
    return allTabIndex === -1 ? 0 : allTabIndex;
  }

  const companyTabCount = getNotificationTabCount(tabs[companyTabIndex]);
  if (companyTabCount > 0) {
    return companyTabIndex;
  }

  if (allTabIndex !== -1 && getNotificationTabCount(tabs[allTabIndex]) > 0) {
    return allTabIndex;
  }

  return companyTabIndex;
};

const formatNotificationAction = (action?: string) => {
  if (!action) {
    return "Updated";
  }

  return action.charAt(0).toUpperCase() + action.slice(1);
};

const groupCategoryNotifications = (items: NotificationItem[] = []) => {
  const standaloneItems: NotificationItem[] = [];
  const companyGroups = new Map<string, NotificationCompanyGroup>();

  items.forEach((item) => {
    if (!item.company) {
      standaloneItems.push(item);
      return;
    }

    const existingGroup = companyGroups.get(item.company);
    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.totalCount += 1;
      existingGroup.unreadCount += item.viewed ? 0 : 1;
      if (getNotificationTimestamp(item.date) > getNotificationTimestamp(existingGroup.latestDate)) {
        existingGroup.latestDate = item.date;
      }
      return;
    }

    companyGroups.set(item.company, {
      company: item.company,
      items: [item],
      totalCount: 1,
      unreadCount: item.viewed ? 0 : 1,
      latestDate: item.date,
    });
  });

  const sortByDate = (a: { date: string }, b: { date: string }) =>
    getNotificationTimestamp(b.date) - getNotificationTimestamp(a.date);

  standaloneItems.sort(sortByDate);

  return {
    standaloneItems,
    companyGroups: Array.from(companyGroups.values())
      .map((group) => ({ ...group, items: [...group.items].sort(sortByDate) }))
      .sort(
        (a, b) => getNotificationTimestamp(b.latestDate) - getNotificationTimestamp(a.latestDate)
      ),
  };
};

function Main() {
  const dispatch = useAppDispatch();
  const { user, finhub } = useAppSelector((state) => state.authentiction);
  const { selectedGroup } = useAppSelector((state) => state.notes);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const selectedName =
    selectedGroup?.institutionName || selectedGroup?.companyName || "";
  const { companySearchAndUpdate } = useCompanySearch();

  const { noCompanyHeaderRoutes } = useAppSelector((state) => state.theme);

  const compactMenu = useAppSelector(selectCompactMenu);
  const setCompactMenu = (val: boolean) => {
    localStorage.setItem("compactMenu", val.toString());
    dispatch(setCompactMenuStore(val));
  };

  useEffect(() => {
    if (user?.user_id) {
      dispatch(setCompactMenuStore(false));
    }
  }, [dispatch, user?.user_id]);

  const [selectedText, setSelectedText] = useState<string>("");
  const [noteText, setNoteText] = useState<string>("");
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const [globalCreateNoteModalVisible, setGlobalCreateNoteModalVisible] =
    useState<boolean>(false);
  const [quickSearch, setQuickSearch] = useState(false);
  const [switchAccount, setSwitchAccount] = useState(false);
  const [notificationsPanel, setNotificationsPanel] = useState(false);
  const [activitiesPanel, setActivitiesPanel] = useState(false);
  const [compactMenuOnHover, setCompactMenuOnHover] = useState(false);
  const [activeMobileMenu, setActiveMobileMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [formattedMenu, setFormattedMenu] = useState<
    Array<FormattedMenu | string>
  >([]);
  const sideMenuStore = useAppSelector(selectSideMenu);
  const sideMenu = () => nestedMenu(sideMenuStore, location);
  const { activeSection, activeSubSection } = useAppSelector(selectDashboardNav);
  const locationState = location.state as
    | { source?: string; fromTab?: string }
    | undefined;
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Company"]);
  const scrollableRef = createRef<HTMLDivElement>();
  const shouldShowSidebar = subSidebarRoutes.includes(location.pathname);
  const isNotesPage = location.pathname === "/notes";
  const isCompanyReportPage = location.pathname.startsWith("/company-report");
  // Embed mode: renders the routed page without the app chrome (sidebar/topbar)
  // so it can be shown inside an in-page panel/iframe instead of a new tab.
  const isEmbedMode = new URLSearchParams(location.search).get("embed") === "1";

  const [topBarActive, setTopBarActive] = useState(false);

  const [basicModalPreview, setBasicModalPreview] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] =
    useState(false);

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [helpFormVisible, setHelpFormVisible] = useState<boolean>(false);
  const [whatsNewFormVisible, setWhatsNewFormVisible] =
    useState<boolean>(false);
  const [podcastModalVisible, setPodcastModalVisible] =
    useState<boolean>(false);

  const toggleCompactMenu = (event: MouseEvent) => {
    event.preventDefault();
    setCompactMenu(!compactMenu);
    // setCompactMenuOnHover(!compactMenuOnHover)
  };
  const { companyGlobalSearchId, companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  };

  useEffect(() => {
    if (scrollableRef.current) {
      new SimpleBar(scrollableRef.current);
    }

    setFormattedMenu(
      filterMenu(sideMenu()).filter(
        (menu) => typeof menu === "string" || !["Meeting Notes", "Help"].includes(menu.title)
      )
    );

    // Fix table border issues
    const fixTableStyles = () => {
      if (!document.getElementById('table-border-fix')) {
        const style = document.createElement('style');
        style.id = 'table-border-fix';
        style.textContent = `
          table td, table th {
            border: none !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          .cell_2, .cell_3 {
            border: none !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          .table_2 td, .table_3 td {
            border: none !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    fixTableStyles();
  }, [sideMenuStore, location]);

  useEffect(() => {
    const doesDashboardRouteMatch = (routeStr: string): boolean => {
      const [basePath, existingQuery] = routeStr.split("?");
      if (location.pathname !== basePath && !location.pathname.startsWith(`${basePath}/`)) {
        return false;
      }

      if (location.pathname !== basePath) {
        return true;
      }

      const routeParams = new URLSearchParams(existingQuery || "");
      const currentParams = new URLSearchParams(location.search);
      return Array.from(routeParams.entries()).every(
        ([key, value]) => currentParams.get(key) === value
      );
    };

    const computeActiveGroup = (): string => {
      if (companyGlobalSearchTicker) {
        const isCaseStudiesDetail = location.pathname.startsWith("/case-studies/");
        const isSharedCaseStudies =
          isCaseStudiesDetail &&
          (locationState?.source === "shared" || locationState?.fromTab === "all");
        if (isSharedCaseStudies) {
          return "Market Analytics";
        }

        const dashboardMatch =
          location.pathname === "/"
            ? DASHBOARD_SECTIONS.find(
                (s) =>
                  !s.route &&
                  s.key === activeSection &&
                  (!s.subSection ||
                    activeSubSection === s.subSection ||
                    (s.subSection === "voting_rationale" && !activeSubSection))
              )
            : DASHBOARD_SECTIONS.find(
                (s) => s.route && doesDashboardRouteMatch(s.route)
              );
        if (dashboardMatch) {
          return dashboardMatch.group;
        }
      }

      const activeFormattedItem = formattedMenu.find(
        (item): item is FormattedMenu =>
          typeof item !== "string" && !!item.active
      );
      if (activeFormattedItem) {
        const group = getSidebarGroup(activeFormattedItem);
        if (group) {
          return group;
        }
      }

      const activeDropdownItem = formattedMenu.find(
        (item): item is FormattedMenu =>
          typeof item !== "string" && !!item.activeDropdown
      );
      if (activeDropdownItem) {
        const group = getSidebarGroup(activeDropdownItem);
        if (group) {
          return group;
        }
      }

      return companyGlobalSearchTicker ? "Company" : "";
    };

    setExpandedGroups((prev) => {
      const activeGroup = computeActiveGroup();
      if (!activeGroup || activeGroup === "Company") {
        return prev;
      }

      if (prev.includes(activeGroup)) {
        return prev;
      }

      return [...prev, activeGroup];
    });
  }, [
    location.pathname,
    location.search,
    locationState,
    activeSection,
    activeSubSection,
    formattedMenu,
    companyGlobalSearchTicker,
  ]);

  const handleToggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((item) => item !== group) : [...prev, group]
    );
  };

  window.onscroll = () => {
    // Topbar
    if (document.body.scrollTop > 0 || document.documentElement.scrollTop > 0) {
      setTopBarActive(true);
    } else {
      setTopBarActive(false);
    }
  };

  const handleToggleMenu = (event: MouseEvent) => {
    event.preventDefault();
    setCompactMenu(!compactMenu);
  };

  const handleLoad = () => {
    setTimeout(() => {
      setIsFrameLoading(false);
    }, 2000);
    setIsError(false);
  };

  const handleError = () => {
    setTimeout(() => {
      setIsFrameLoading(false);
    }, 2000);
    setIsError(true);
  };

  const handleCloseModal = () => {
    setBasicModalPreview(false);
    setIsFrameLoading(true);
    setIsError(false);
  };

  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const handleCopyQuestion = async (question: string) => {
    try {
      await navigator.clipboard.writeText(question);
      setCopiedMessage("Copied to clipboard");
      setTimeout(() => {
        setCopiedMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Failed to copy text: ", error);
      setCopiedMessage("Failed to copy");
      setTimeout(() => {
        setCopiedMessage(null);
      }, 3000);
    }
  };

  const isCompanySpecificView =
    new URLSearchParams(location.search).get("source") === "company";
  const shouldHideHeader =
    (noCompanyHeaderRoutes?.some((route: string) =>
      location.pathname.includes(route)
    ) &&
      !isCompanySpecificView) ||
    (location.pathname === "/" &&
      activeSection === "investor-overview" &&
      (activeSubSection === "voting_rationale" || !activeSubSection));

  useEffect(() => {
    if (!location.pathname.includes("/case-studies")) {
      dispatch(resetCaseStudy());
    }
    if (!location.pathname.includes("/engagement-question")) {
      dispatch(resetEngagementQuestions());
    }

    if (!location.pathname.includes("/engagement-detail")) {
      dispatch(resetPeerAnalysis());
    }
    if (!location.pathname.includes("/voting-guidelines")) {
      dispatch(resetProxyVotingGuidelines());
    }
    if (!location.pathname.includes("/shareholder-proposal")) {
      dispatch(resetShareholderProposal());
    }
    if (!location.pathname.includes("/institution")) {
      dispatch(resetInstitution());
    }
    if (!location.pathname.includes("/company")) {
      dispatch(resetCompany());
    }
    if (!location.pathname.includes("/investor-profile")) {
      dispatch(resetInvestorProfiles());
    }
  }, [location.pathname]);

  const handleSelectionChange = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      const selectedHtml = container.innerHTML.trim();
      if (selectedHtml && selectedHtml?.length > 50) {
        const rect = range.getBoundingClientRect();
        setSelectedText(selectedHtml);
        setTooltipPosition({
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY - 30,
        });
      } else {
        setSelectedText("");
      }
    } else if (!globalCreateNoteModalVisible) {
      setSelectedText("");
    }
  };

  const handleCreateNote = () => {
    if (selectedText) {
      setNoteText(selectedText);
      setSelectedText("");
      setGlobalCreateNoteModalVisible(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        !globalCreateNoteModalVisible
      ) {
        setSelectedText("");
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [globalCreateNoteModalVisible]);

  useEffect(() => {
    const handleStorageChange = async (event: StorageEvent) => {
      if (event.key === "searchCompanyData") {
        const companyData = localStorageHelper.getItem("searchCompanyData");
        if (companyData?.id !== finhub?.id) {
          await companySearchAndUpdate(companyData);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [companyGlobalSearchTicker]);

  const {
    loading,
    shareHolderProposal,
    page,
    totalPages,
    tab,
    filters,
    isAllCompanySelected,
  } = useAppSelector((state) => state.sharedHolderNoAction);

  const [modulesData, setModulesData] = useState<any>({});
  const [notificationData, setNotificationData] = useState<NotificationResponse | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const notificationTabs = notificationData?.notifications || [];
  const activeTab = notificationTabs[activeTabIndex] || notificationTabs[0];
  const categories = activeTab?.tab_notifications
    ? Object.keys(activeTab.tab_notifications)
    : [];
  const filteredNotificationSections = Object.entries(activeTab?.tab_notifications || {}).filter(
    ([category]) => (selectedCategory === "All" ? true : category === selectedCategory)
  );
  useEffect(() => {
    getModulesCount();
    getNotificationList();
    prefetchActivistFilings();
  }, [companyGlobalSearchName, companyGlobalSearchId]);

  useEffect(() => {
    if (notificationTabs.length === 0) {
      if (activeTabIndex !== 0) {
        setActiveTabIndex(0);
      }
      return;
    }

    const defaultTabIndex = getDefaultNotificationTabIndex(notificationTabs);

    if (activeTabIndex >= notificationTabs.length) {
      setActiveTabIndex(defaultTabIndex);
      return;
    }

    if (!open && activeTabIndex !== defaultTabIndex) {
      setActiveTabIndex(defaultTabIndex);
    }
  }, [activeTabIndex, notificationTabs, open]);

  useEffect(() => {
    if (selectedCategory !== "All" && !categories.includes(selectedCategory)) {
      setSelectedCategory("All");
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("zmh:notification-drawer", { detail: { open } })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("zmh:notification-drawer", { detail: { open: false } })
      );
    };
  }, [open]);

  const getModulesCount = async () => {
    try {
      const res = await dashboardService.getModulesCount({
        global_search: companyGlobalSearchName,
      });
      if (res?.result) {
        setModulesData((prev: any) => ({ ...prev, ...res.result }));
      }
    } catch (error) {
      return error;
    } finally {
    }
  };

  const prefetchActivistFilings = async () => {
    if (!companyGlobalSearchId) return;

    try {
      const response = await dashboardService.getActivistFilings(companyGlobalSearchId);
      const result = response?.result || response || {};
      const filings = Array.isArray(result?.filings) ? result.filings : [];
      const excludedTypes = ["DEF 14A", "DEFA14A", "PRE 14A"];
      const relevantCount = filings.filter((filing: any) => {
        const filingType = String(filing?.["Filing Type"] || "").trim();
        return filingType && !excludedTypes.includes(filingType);
      }).length;

      setModulesData((prev: any) => ({
        ...prev,
        activist_filings: relevantCount,
      }));
    } catch (error) {
      return error;
    }
  };

  const getNotificationList = async (tab?: number) => {
    try {
      const targetIndex = typeof tab === "number" ? tab : activeTabIndex;
      const targetTabName = notificationTabs[targetIndex]?.tab_name;
      const param =
        notificationData?.notification_status === false
          ? targetTabName === "All"
            ? "?mark_viewed_all=true"
            : "?mark_viewed_company=true"
          : "";
      const res = await dashboardService.getNotifications(param);
      if (res?.result) {
        setNotificationData(res?.result);
      }
    } catch (error) {
      return error;
    } finally {
    }
  };

  const getTotalNotificationsCount = (): number => {
    const allTab = notificationTabs.find((tab) => tab.tab_name === "All");
    return getNotificationTabCount(allTab, true);
  };


  return isCompanyReportPage || isEmbedMode ? (
    <div className={clsx({ "h-full": isEmbedMode })}>
      <Outlet />
    </div>
  ) : (
    <div
      className={clsx([
        "echo group  h-full",
        "before:content-[''] before:h-[370px] before:w-screen  h-7 [&.background--hidden]:before:opacity-0 before:transition-[opacity,height] before:ease-in-out before:duration-300 before:top-0 before:fixed",
        "after:content-[''] after:h-[370px] after:w-screen [&.background--hidden]:after:opacity-0 after:transition-[opacity,height] after:ease-in-out after:duration-300 after:top-0 after:fixed after:bg-texture-white after:bg-contain after:bg-fixed after:bg-[center_-13rem] after:bg-no-repeat",
        topBarActive && "background--hidden",
        "",
      ])}
    >
      <div
        className={clsx([
          "xl:ml-0 shadow-xl transition-[margin,padding] duration-300 xl:shadow-none fixed top-0 left-0 z-50 side-menu group inset-y-0",
          "after:content-[''] after:fixed after:inset-0 after:bg-black/80 after:xl:hidden",
          { "side-menu--collapsed": compactMenu },
          { "side-menu--on-hover": compactMenuOnHover },
          { "ml-0 after:block": activeMobileMenu },
          { "-ml-[280px] after:hidden": !activeMobileMenu },
        ])}
      >
        <div
          className={clsx([
            "fixed ml-[280px] w-10 h-10 items-center justify-center xl:hidden z-50",
            { flex: activeMobileMenu },
            { hidden: !activeMobileMenu },
          ])}
        >
          <a
            href=""
            onClick={(event) => {
              event.preventDefault();
              setActiveMobileMenu(false);
            }}
            className="mt-5 ml-5"
          >
            <Lucide icon="X" className="w-8 h-8 text-white" />
          </a>
        </div>
        <div
          className={clsx([
            "h-full box border-none bg-gradient-to-b to-[#000000CC] from-[#9F1239] background rounded-none z-20 relative w-[300px] duration-300 transition-[width] group-[.side-menu--collapsed]:xl:w-[91px] group-[.side-menu--collapsed.side-menu--on-hover]:xl:shadow-[6px_0_12px_-4px_#0000000f] group-[.side-menu--collapsed.side-menu--on-hover]:xl:w-[300px] overflow-hidden flex flex-col",
          ])}
        >
          {/* Logo + sidebar toggle in a single row when expanded, stacked when collapsed */}
          <div
            className={clsx([
              "flex-none flex items-center justify-center px-5 mt-6 mb-1 gap-3 relative",
              "group-[.side-menu--collapsed]:xl:flex-col group-[.side-menu--collapsed]:xl:justify-center group-[.side-menu--collapsed]:xl:gap-2",
            ])}
          >
            <a className="flex items-center justify-center transition-all duration-700">
              <div className="flex items-center justify-center bg-white rounded-xl shadow-md w-[110px] h-[110px] p-3 group-[.side-menu--collapsed]:xl:w-[56px] group-[.side-menu--collapsed]:xl:h-[56px] group-[.side-menu--collapsed]:xl:p-1.5 group-[.side-menu--collapsed.side-menu--on-hover]:xl:w-[120px] group-[.side-menu--collapsed.side-menu--on-hover]:xl:h-[120px] group-[.side-menu--collapsed.side-menu--on-hover]:xl:p-3 transition-all duration-300">
                <img
                  alt="Logo"
                  src={headerLogo}
                  className="w-full h-full object-contain"
                />
              </div>
            </a>

            {/* Sidebar toggle arrow - pinned to the right when expanded, below logo when collapsed */}
            <div
              className={clsx([
                "hidden xl:flex items-center z-10",
                "absolute right-5 group-[.side-menu--collapsed]:xl:static group-[.side-menu--collapsed]:xl:right-auto",
              ])}
            >
              {compactMenu && (
                <a href="" className="flex items-center transition-[margin] duration-300">
                  <div onClick={handleToggleMenu}>
                    <img className="w-8 group-[.side-menu--collapsed]:xl:w-5" src={sideBarIcon} />
                  </div>
                </a>
              )}
              {!compactMenu && (
                <a href="" onClick={handleToggleMenu} className="flex items-center justify-center">
                  <img className="w-8 group-[.side-menu--collapsed]:xl:w-5 rotate-180" src={sideBarIcon} />
                </a>
              )}
            </div>
          </div>

          <div
            ref={scrollableRef}
            className={clsx([
              "w-full h-full z-20 px-5 overflow-y-auto overflow-x-hidden pb-3 [-webkit-mask-image:-webkit-linear-gradient(top,rgba(0,0,0,0),black_30px)] [&:-webkit-scrollbar]:w-0 [&:-webkit-scrollbar]:bg-transparent",
              "[&_.simplebar-content]:p-0 [&_.simplebar-track.simplebar-vertical]:w-[10px] [&_.simplebar-track.simplebar-vertical]:mr-0.5 [&_.simplebar-track.simplebar-vertical_.simplebar-scrollbar]:before:bg-slate-400/30",
            ])}
          >
            <ul className="scrollable">
              {/* Koyfin-style dashboard navigation for the selected company */}
              <DashboardSidebarNav
                modulesData={modulesData}
                expandedGroups={expandedGroups}
                onToggleGroup={handleToggleGroup}
              />
              {/* BEGIN: First Child */}
              {formattedMenu.map((menu, menuKey) => {
                const currentGroup = getSidebarGroup(menu);
                const previousGroup =
                  menuKey > 0 ? getSidebarGroup(formattedMenu[menuKey - 1]) : "";
                const showGroupHeading =
                  currentGroup &&
                  currentGroup !== previousGroup &&
                  (currentGroup !== "Administration" ||
                    user.user_type === "Admin" ||
                    user.user_type === "Analyst");
                const isGroupExpanded = currentGroup ? expandedGroups.includes(currentGroup) : false;

                return (
                  <Fragment key={menuKey}>
                    {showGroupHeading && (
                      <li
                        className="side-menu__divider side-menu__section-label !text-xs flex items-center justify-between cursor-pointer select-none"
                        onClick={() => handleToggleGroup(currentGroup)}
                      >
                        <span>{currentGroup}</span>
                        <Lucide
                          icon="ChevronRight"
                          className={clsx([
                            "w-5 h-5 transition-transform duration-200",
                            { "rotate-90": isGroupExpanded },
                          ])}
                        />
                      </li>
                    )}
                    {typeof menu == "string" || !isGroupExpanded ? null : (
                  <li>
                    <a
                      href=""
                      className={clsx([
                        "side-menu__link relative",
                        { "side-menu__link--active": menu.active },
                        {
                          "side-menu__link--active-dropdown":
                            menu.activeDropdown,
                        },
                      ])}
                      onClick={(event: MouseEvent) => {
                        event.preventDefault();
                        if (menu.title === "Email Alert") {
                          setWhatsNewFormVisible(true);
                        } else if (menu.title === "Podcasts") {
                          setPodcastModalVisible(true);
                        } else if (menu.title === "Company Search") {
                          // menu.pathname = `/?ticker=${companyGlobalSearchTicker}`
                          // menu.selectPathName = `/?ticker=${companyGlobalSearchTicker}`;
                          linkTo(menu, navigate, companyGlobalSearchName);
                        } else {
                          linkTo(menu, navigate, companyGlobalSearchName);
                        }
                        setFormattedMenu([...formattedMenu]);
                      }}
                      id={menu.title === "Investor Profile" ? "investor-profile-menu-link" : undefined}
                    >
                      <Tippy content={menu.title} options={{ theme: "light" }}>
                        {menu.title !== "Shareholder Proposals" && (
                          <>
                            <span className="relative">
                              <Lucide
                                icon={menu?.icon}
                                className={clsx(
                                  "side-menu__link__icon",
                                  menu.title === "Admin Panel" && "w-6 h-6"
                                )}
                              />
                              {menu.title === "Proxy Contest" &&
                                modulesData?.proxy_contest && (
                                  <span
                                    className="bg-[#DC661F] absolute  rounded-2xl w-2 h-2 p-2 text-[10px]  
                             font-semibold text-white top-0 flex items-center justify-center position-set"
                                  ></span>
                                )}
                            </span>
                          </>
                        )}

                        {menu.title === "Shareholder Proposals" && (
                          <>
                            <span className="relative">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                className="lucide  lucide-files side-menu__link__icon side-menu__link--active"
                              >
                                <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
                                <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" />
                                <path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8" />
                              </svg>

                            </span>
                          </>
                        )}
                      </Tippy>

                      <div className="side-menu__link__title link_color">{menu?.title}</div>
                      {menu.badge && (
                        typeof menu.badge === "string" ? (
                          <span className="absolute top-0.5 right-1.5 inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 py-1 text-[7px] font-extrabold uppercase tracking-tighter text-white leading-none shadow-sm">
                            {menu.badge}
                          </span>
                        ) : (
                          <div className="side-menu__link__badge">
                            {menu.badge}
                          </div>
                        )
                      )}
                      {menu.subMenu && (
                        <Lucide
                          icon="ChevronRight"
                          className={clsx([
                            "side-menu__link__chevron transition-transform duration-200",
                            { "rotate-90": menu.activeDropdown },
                          ])}
                        />
                      )}
                    </a>
                    {/* BEGIN: Second Child */}
                    {menu.subMenu && (
                      // <Transition
                      //   in={menu.activeDropdown}
                      //   onEnter={enter}
                      //   onExit={leave}
                      //   timeout={300}
                      // >
                      <ul
                        className={clsx([
                          "",
                          { block: menu.activeDropdown },
                          { hidden: !menu.activeDropdown },
                        ])}
                      >
                        {menu.subMenu.map((subMenu, subMenuKey) => (
                          <li key={subMenuKey}>
                            <a
                              href=""
                              className={clsx([
                                "side-menu__link !pl-8 relative",
                                { "side-menu__link--active": subMenu.active },
                                {
                                  "side-menu__link--active-dropdown":
                                    subMenu.activeDropdown,
                                },
                              ])}
                              onClick={(event: MouseEvent) => {
                                event.preventDefault();
                                linkTo(
                                  subMenu,
                                  navigate,
                                  companyGlobalSearchName
                                );
                                setFormattedMenu([...formattedMenu]);
                              }}
                            >
                              <Lucide
                                icon={subMenu.icon}
                                className="side-menu__link__icon"
                              />
                              <div className="side-menu__link__title link_color">
                                {subMenu.title}
                              </div>
                              {subMenu.badge && (
                                typeof subMenu.badge === "string" ? (
                                  <span className="absolute top-0.5 right-1.5 inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 py-1 text-[7px] font-extrabold uppercase tracking-tighter text-white leading-none shadow-sm">
                                    {subMenu.badge}
                                  </span>
                                ) : (
                                  <div className="side-menu__link__badge">
                                    {subMenu.badge}
                                  </div>
                                )
                              )}
                              {subMenu.subMenu && (
                                <Lucide
                                  icon="ChevronDown"
                                  className="side-menu__link__chevron"
                                />
                              )}
                            </a>
                            {/* BEGIN: Third Child */}
                            {subMenu.subMenu && (
                              // <Transition
                              //   in={subMenu.activeDropdown}
                              //   onEnter={enter}
                              //   onExit={leave}
                              //   timeout={300}
                              // >
                              <ul
                                className={clsx([
                                  "",
                                  {
                                    block: subMenu.activeDropdown,
                                  },
                                  { hidden: !subMenu.activeDropdown },
                                ])}
                              >
                                {subMenu.subMenu.map(
                                  (lastSubMenu, lastSubMenuKey) => (
                                    <li key={lastSubMenuKey}>
                                      <a
                                        href=""
                                        className={clsx([
                                          "side-menu__link !pl-12 relative",
                                          {
                                            "side-menu__link--active":
                                              lastSubMenu.active,
                                          },
                                          {
                                            "side-menu__link--active-dropdown":
                                              lastSubMenu.activeDropdown,
                                          },
                                        ])}
                                        onClick={(event: MouseEvent) => {
                                          event.preventDefault();
                                          linkTo(
                                            lastSubMenu,
                                            navigate,
                                            companyGlobalSearchName
                                          );
                                          setFormattedMenu([...formattedMenu]);
                                        }}
                                      >
                                        <Lucide
                                          icon={lastSubMenu.icon}
                                          className="side-menu__link__icon"
                                        />
                                        <div className="side-menu__link__title link_color">
                                          {lastSubMenu.title}
                                        </div>
                                        {lastSubMenu.badge && (
                                          typeof lastSubMenu.badge === "string" ? (
                                            <span className="absolute top-0.5 right-1.5 inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 py-1 text-[7px] font-extrabold uppercase tracking-tighter text-white leading-none shadow-sm">
                                              {lastSubMenu.badge}
                                            </span>
                                          ) : (
                                            <div className="side-menu__link__badge">
                                              {lastSubMenu.badge}
                                            </div>
                                          )
                                        )}
                                      </a>
                                    </li>
                                  )
                                )}
                              </ul>
                              // </Transition>
                            )}
                            {/* END: Third Child */}
                          </li>
                        ))}
                      </ul>
                      // </Transition>
                    )}
                    {/* END: Second Child */}
                  </li>
                    )}
                  </Fragment>
                );
              })}
              {/* END: First Child */}
            </ul>
          </div>
          <GetHelp
            helpFormVisible={helpFormVisible}
            setHelpFormVisible={setHelpFormVisible}
          />
          <GetWhatsNew
            whatsNewFormVisible={whatsNewFormVisible}
            setWhatsNewFormVisible={setWhatsNewFormVisible}
          />
          {!open && (
            <Tippy content="Help" options={{ theme: "light", placement: "left" }}>
              <button
                type="button"
                onClick={() => setHelpFormVisible(true)}
                className="fixed bottom-5 right-5 z-[60] flex h-12 w-[90px] items-center gap-1.5 rounded-full bg-gradient-to-r from-[#9F1239] to-[#6B102D] px-2 pr-3 text-white shadow-[0_12px_30px_rgba(82,16,38,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(82,16,38,0.4)] focus:outline-none focus:ring-2 focus:ring-[#9F1239] focus:ring-offset-2"
                aria-label="Open help"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/25 backdrop-blur-sm">
                  <Headphones className="h-4.5 w-4.5 text-white" />
                </span>
                <span className="text-xs font-semibold tracking-[0.02em]">Help</span>
              </button>
            </Tippy>
          )}
        </div>
        <div className="fixed h-[65px] transition-[margin] duration-100 xl:ml-[280px] group-[.side-menu--collapsed]:xl:ml-[90px] bg-white inset-x-0 top-0">
          <div
            className={clsx([
              "top-bar absolute left-0 xl:left-3.5 right-0 h-full mx-5 group",
              "before:content-[''] before:absolute before:top-0 before:inset-x-0 before:-mt-[15px] before:h-[20px] before:backdrop-blur",
              topBarActive && "top-bar--active",
            ])}
          >
            <div
              className="
                container flex items-center w-full h-full transition-[padding,background-color,border-color] ease-in-out duration-300 box bg-transparent border-transparent shadow-none 
                
              "
            >
              <div className="flex items-center gap-1 xl:hidden">
                <a
                  href=""
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveMobileMenu(true);
                  }}
                  className="p-2 text-[#545454] rounded-full bg-[#D9D9D926]"
                >
                  <Lucide icon="AlignJustify" className="w-[18px] h-[18px]" />
                </a>
              </div>

              <div className="md:hidden flex items-center ml-2">
                <a
                  href=""
                  className="p-2 lg:hidden text-[#545454] rounded-full bg-[#D9D9D926]"
                  onClick={(e) => {
                    e.preventDefault();
                    setQuickSearch(true);
                  }}
                >
                  <Lucide icon="Search" className="w-[18px] h-[18px]" />
                </a>
              </div>

              <>

                {[
                  "/notes",
                  "/proxy-contest-detail",
                  "/voting-data",
                  "/investor-profile",
                  "/engagement-question",
                  "/voting-guidelines",
                  "/proxy-contest",
                  "/executive-compensation",
                ]?.includes(location.pathname) ||
                  location.pathname.startsWith("/proxy-contest-detail/") ||
                  location.pathname.startsWith("/investor-profile/") ||
                  (["/case-studies", "/engagement-detail", "/shareholder-proposal"].includes(
                    location.pathname
                  ) &&
                    !isCompanySpecificView) ||
                  (location.pathname === "/" &&
                    activeSection === "investor-overview" &&
                    (activeSubSection === "voting_rationale" ||
                      !activeSubSection)) ? (
                  !isNotesPage && (
                    <h1 className="font-semibold text-2xl">
                      {pageTitles[location.pathname]}{" "}
                      {location.pathname.includes("/notes") &&
                        selectedName &&
                        `- ${selectedName}`}
                    </h1>
                  )
                ) : (
                  <div
                    className="relative justify-center hidden md:flex md:ml-2"
                    onClick={() => setQuickSearch(true)}
                  >
                    <div
                      className={clsx([
                        "bg-[#D9D9D926] border-transparent border w-[530px] flex items-center py-2 px-3.5 rounded-[0.5rem] cursor-pointer hover:bg-white/[0.15] transition-colors duration-300 hover:duration-100",
                        companyGlobalSearchName !== ""
                          ? "text-[#545454]"
                          : "text-[#545454]",
                      ])}
                    >
                      <Lucide icon="Search" className="w-[18px] h-[18px]" />
                      <div className="ml-2.5 mr-auto">
                        {"Search by company name, ticker, or symbol (US company only)"}
                      </div>
                    </div>
                  </div>
                )}

                {/* BEGIN: AI Assistant - Open /ai-assistant in new tab */}
                <AIAssistantButton 
                  href="/ai-assistant"
                  className="ml-2 hidden md:flex border-4 hover:border-transparent"
                  size="md"
                />
                {/* END: AI Assistant - Open /ai-assistant in new tab */}
              </>

              <QuickSearch
                quickSearch={quickSearch}
                setQuickSearch={setQuickSearch}
              />
              {/* END: Search */}
              {/* BEGIN: Notification & User Menu */}
              <div className="flex items-center flex-1">
                <div className="flex items-center gap-1 ml-auto">
                  {/* Your existing layout container */}
                  <VotingDataBanner />
                  <InvestorProfileTour compactMenu={compactMenu} />
                  {/* User Guide Button */}
                  <a
                    className="px-3 py-1.5 bg-red-100 rounded-full flex items-center justify-center transition-colors hover:bg-red-200"
                    href="https://scribehow.com/viewer/Dashboard_Tutorial__hFxWL0yqTJulsBdrjJLE7Q"
                    target="_blank"
                  >
                    <BookOpen className="w-4 h-4 text-[#800000]" />
                    <span className="ml-2 text-sm font-medium hidden xl:flex text-[#800000]">User Guide</span>
                  </a>
                  <div className="h-8"></div>
                  <div className="h-8"></div>

                  <Menu>
                    <Menu.Button>
                      <div
                        className="flex items-center justify-center w-10 mx-4 relative cursor-pointer"
                        onClick={() => {
                          const defaultTabIndex = getDefaultNotificationTabIndex(notificationTabs);
                          setActiveTabIndex(defaultTabIndex);
                          setSelectedCategory("All");
                          setOpen(true);
                          if (!notificationData?.notification_status) {
                            getNotificationList(defaultTabIndex);
                          }
                        }}
                      >
                        <img
                          src={notificationIcon2}
                          alt="ai icon"
                          className=" w-[30px] h-[30px]"
                        />

                        {!notificationData?.notification_status &&
                          getTotalNotificationsCount() > 0 && (
                            <span className="bg-[#DC661F] absolute rounded-2xl w-[20px] h-[20px] text-[9px] font-semibold text-white bottom-3 flex items-center justify-center left-[20px]">
                              {getTotalNotificationsCount()}
                            </span>
                          )}
                      </div>
                    </Menu.Button>
                    <Drawer
                      open={open}
                      setOpen={setOpen}
                      headerActions={
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setWhatsNewFormVisible(true);
                          }}
                          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-[#9F1239]/30 hover:text-[#9F1239] focus:outline-none focus:ring-2 focus:ring-[#9F1239]/30"
                        >
                          <Mail className="h-4 w-4" strokeWidth={1.8} />
                          Manage Alerts
                        </button>
                      }
                      headerContent={
                        notificationTabs.length > 0 ? (
                          <div className="rounded-2xl bg-slate-100 p-1">
                            <div
                              className="grid gap-1"
                              style={{
                                gridTemplateColumns: `repeat(${notificationTabs.length}, minmax(0, 1fr))`,
                              }}
                            >
                              {notificationTabs.map((tab, index) => {
                                const unreadCount = getNotificationTabCount(tab, true);
                                const totalCount = getNotificationTabCount(tab);

                                return (
                                  <button
                                    key={tab.tab_name}
                                    type="button"
                                    onClick={() => {
                                      setActiveTabIndex(index);
                                      getNotificationList(index);
                                      setSelectedCategory("All");
                                    }}
                                    className={`rounded-[14px] px-4 py-2.5 text-left transition-all ${activeTabIndex === index
                                      ? "bg-primary text-white shadow-[0_12px_30px_rgba(159,18,57,0.25)]"
                                      : "bg-transparent text-slate-600 hover:bg-white hover:text-slate-900"
                                      }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="line-clamp-2 whitespace-normal text-[13px] font-semibold leading-4.5 break-words [word-break:normal]">
                                        {tab.tab_name}
                                      </span>
                                      <span className={`mt-0.5 inline-flex min-w-[24px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${activeTabIndex === index
                                        ? "bg-white/20 text-white"
                                        : "bg-white text-slate-600"
                                        }`}>
                                        {unreadCount || totalCount}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null
                      }
                      children={
                        <>
                          {categories.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCategory("All")}
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all ${selectedCategory === "All"
                                    ? "bg-[#9F1239] text-white shadow"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                  <span>All</span>
                                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selectedCategory === "All"
                                    ? "bg-white/20 text-white"
                                    : "bg-white text-slate-500"
                                    }`}>
                                    {getNotificationTabCount(activeTab)}
                                  </span>
                                </button>
                                {categories.map((category) => {
                                  const categoryCount = getNotificationListCount(
                                    Array.isArray(activeTab?.tab_notifications?.[category])
                                      ? activeTab?.tab_notifications?.[category]
                                      : []
                                  );

                                  return (
                                    <button
                                      key={category}
                                      type="button"
                                      onClick={() => setSelectedCategory(category)}
                                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all ${selectedCategory === category
                                        ? "bg-[#9F1239] text-white shadow"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                    >
                                      <span>{category}</span>
                                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selectedCategory === category
                                        ? "bg-white/20 text-white"
                                        : "bg-white text-slate-500"
                                        }`}>
                                        {categoryCount}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                          {activeTab?.tab_notifications &&
                          Object.keys(activeTab.tab_notifications).length > 0 ? (
                            <div className="mt-4 space-y-4 pb-6">
                              {filteredNotificationSections.map(([category, rawNotifications]) => {
                                const notifications = Array.isArray(rawNotifications)
                                  ? rawNotifications
                                  : [];
                                const { standaloneItems, companyGroups } =
                                  groupCategoryNotifications(notifications);
                                const totalCount = getNotificationListCount(notifications);
                                const showCategoryHeader = selectedCategory === "All";

                                return (
                                  <section
                                    key={category}
                                    className={showCategoryHeader
                                      ? "rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
                                      : "space-y-3"}
                                  >
                                    {showCategoryHeader && (
                                      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                          <div className="rounded-2xl bg-white p-2.5 text-[#9F1239] shadow-sm ring-1 ring-slate-200">
                                            <Lucide
                                              icon={getNotificationModuleIcon(category)}
                                              className="h-5 w-5"
                                            />
                                          </div>
                                          <div className="min-w-0">
                                            <h2 className="text-sm font-semibold text-slate-900">
                                              {category}
                                            </h2>
                                          </div>
                                        </div>
                                        <span className="inline-flex min-w-[32px] items-center justify-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                          {totalCount}
                                        </span>
                                      </div>
                                    )}

                                    <div className={showCategoryHeader ? "mt-4 space-y-3" : "space-y-3"}>
                                      {companyGroups.map((group) => (
                                        <div
                                          key={`${category}-${group.company}`}
                                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)]"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                {group.unreadCount > 0 && (
                                                  <span className="h-2.5 w-2.5 rounded-full bg-[#DC661F]" />
                                                )}
                                                <h3 className="text-sm font-semibold text-slate-900">
                                                  {group.company}
                                                </h3>
                                              </div>
                                            </div>
                                            <span className="inline-flex min-w-[34px] items-center justify-center rounded-full bg-[#9F1239]/10 px-2.5 py-1 text-xs font-semibold text-[#9F1239]">
                                              {group.totalCount}
                                            </span>
                                          </div>

                                          <div className="mt-3 space-y-2">
                                            {group.items.map((item, index) => (
                                              <div
                                                key={`${category}-${group.company}-${item.institution || index}`}
                                                className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/80"
                                              >
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-800">
                                                      {item.institution || "Institution unavailable"}
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                      <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                        {item.date}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <div className="flex shrink-0 items-center gap-2">
                                                    <span className="inline-flex whitespace-nowrap rounded-full bg-[#9F1239]/10 px-3 py-1 text-xs font-semibold text-[#9F1239]">
                                                      {formatNotificationAction(item.action)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}

                                      {standaloneItems.map((noti, index) => (
                                        <div
                                          key={`${activeTabIndex}-${category}-${noti.institution || index}`}
                                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)]"
                                        >
                                          <div className="flex items-start gap-3">
                                            <div className="relative mt-0.5">
                                              {!noti.viewed && (
                                                <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#DC661F] ring-2 ring-white" />
                                              )}
                                              <div className="rounded-2xl bg-[#9F1239]/10 p-2.5 text-[#9F1239]">
                                                <Lucide
                                                  icon={getNotificationModuleIcon(
                                                    noti.module || category
                                                  )}
                                                  className="h-5 w-5"
                                                />
                                              </div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                  <h3 className="text-sm font-semibold text-slate-900">
                                                    {noti.company || noti.institution || "Notification"}
                                                  </h3>
                                                  {noti.company && noti.institution && (
                                                    <p className="mt-1 text-xs text-slate-500">
                                                      {noti.institution}
                                                    </p>
                                                  )}
                                                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                                      {noti.date}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                  <span className="inline-flex whitespace-nowrap rounded-full bg-[#9F1239]/10 px-3 py-1 text-xs font-semibold text-[#9F1239]">
                                                    {formatNotificationAction(noti.action)}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </section>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                              <div className="rounded-full bg-[#9F1239]/10 p-3 text-[#9F1239]">
                                <Lucide icon="BellRing" className="h-6 w-6" />
                              </div>
                              <div>
                                <h1 className="text-base font-semibold text-slate-900">
                                  No notifications yet
                                </h1>
                              </div>
                            </div>
                          )}
                        </>
                      }
                    />
                  </Menu>

                  {/* <a
                    href=""
                    className="p-2 text-[#000000] rounded-full hover:bg-white/5"
                    onClick={(e) => {
                      e.preventDefault();
                      requestFullscreen();
                    }}
                  >
                    <Lucide icon="Expand" className="w-[18px] h-[18px]" />
                  </a> */}
                </div>

                <h1 className="ml-3 mr-3 text-[#000000] font-bold">
                  Hi, {user?.first_name}
                </h1>
                <Menu className="">
                  <Menu.Button
                    className="overflow-hidden rounded-full w-[42px] h-[42px] border-[3px] border-white/[0.15]  image-fit"
                    style={{
                      backgroundColor: "#800000",
                    }}
                  >
                    <h4 className="text-white md:text-xl ">
                      {user?.user_name?.[0].toUpperCase() || ""}
                    </h4>
                  </Menu.Button>

                  <Menu.Items className="w-auto mt-1">
                    {/* <Menu.Item
                      onClick={() => {
                        setSwitchAccount(true);
                      }}
                    >
                      <Lucide icon="ToggleLeft" className="w-4 h-4 mr-2" />
                      Switch Account
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      onClick={() => {
                        navigate("settings?page=connected-services");
                      }}
                    >
                      <Lucide icon="Settings" className="w-4 h-4 mr-2" />
                      Connected Services
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => {
                        navigate("settings?page=email-settings");
                      }}
                    >
                      <Lucide icon="Inbox" className="w-4 h-4 mr-2" />
                      Email Settings
                    </Menu.Item> */}
                    {user?.email && (
                      <>
                        <Menu.Item>
                          <Mail strokeWidth={1} className="w-4 h-4 mr-2" />
                          <h2 className="text-[14px]">{user?.email}</h2>
                        </Menu.Item>
                        <Menu.Divider />
                      </>
                    )}
                    {/* <Menu.Item
                      onClick={() => {
                        navigate("settings?page=security");
                      }}
                    >
                      <Lucide icon="Lock" className="w-4 h-4 mr-2" />
                      Reset Password
                    </Menu.Item> */}
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          onClick={() => {
                            sessionStorage.removeItem('redirectPath');
                            sessionStorage.removeItem('dashboardActiveSection');
                            navigate("/login");
                            dispatch(logout());
                            persistor.purge();
                          }}
                        >
                          <Lucide icon="Power" className="w-4 h-4 mr-2" />
                          Logout
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Menu>
              </div>
              <ActivitiesPanel
                activitiesPanel={activitiesPanel}
                setActivitiesPanel={setActivitiesPanel}
              />
              <NotificationsPanel
                notificationsPanel={notificationsPanel}
                setNotificationsPanel={setNotificationsPanel}
              />
              <SwitchAccount
                switchAccount={switchAccount}
                setSwitchAccount={setSwitchAccount}
              />
              <NotificationAlert
                notificationModalVisible={notificationModalVisible}
                setNotificationModalVisible={setNotificationModalVisible}
              />
              {/* END: Notification & User Menu */}
            </div>
          </div>
        </div>
      </div>

      {/* <>
        {selectedText && (
          <div
            ref={tooltipRef}
            className="absolute bg-white shadow-lg rounded-lg px-4 py-2 cursor-pointer z-50 transform transition-transform hover:scale-105"
            style={{
              top: tooltipPosition.y,
              left: tooltipPosition.x,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={handleCreateNote}
          >
            <span className="text-sm font-medium text-primary flex justify-center items-center">
              <Lucide icon="Pen" className="w-4 h-4 stroke-[1.3] mr-1.5" />
              Create Note
            </span>
          </div>
        )}
      </> */}

      <div
        className={clsx([
          "transition-[margin,width] duration-500 pt-[54px] pb-8 relative z-10 group mode",
          { "xl:ml-[280px]": !compactMenu },
          { "xl:ml-[91px]": compactMenu },
          { "mode--light": !topBarActive },
        ])}
      >
        <div className={clsx({ "pt-[10px] h-full flex": shouldShowSidebar })}>
          <div className="px-5 mt-10 w-full">
            <div className={clsx({ container: !shouldShowSidebar })}>
              <div
                className={clsx(
                  "sticky header-card transition-[margin,width,opacity] duration-1000 ease-in-out",
                  { "opacity-0 pointer-events-none -mt-5": shouldHideHeader }
                )}
                style={{ top: "4rem" }}
              >
                {/* Place the banner here */}
                {/* <VotingDataBanner /> */}

                {/* Place the CountryInfoHeader here */}
                {!shouldHideHeader && <CountryInfoHeader />}
              </div>
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      {globalCreateNoteModalVisible && (
        <GlobalCreateNoteModal
          globalCreateNoteModalVisible={globalCreateNoteModalVisible}
          setGlobalCreateNoteModalVisible={setGlobalCreateNoteModalVisible}
          selectedText={noteText}
        />
      )}

      <Dialog size={"2xl"} open={basicModalPreview} onClose={handleCloseModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-2">
          <Dialog.Panel className="relative bg-white rounded-lg shadow-xl p-8 w-[90vw] h-[70vh] flex flex-col overflow-hidden">
            <Dialog.Title className="mb-3 relative">
              <div>
                <h2 className="text-lg font-semibold text-left">AI Assistant (Beta)</h2>
                <p className="text-xs text-gray-500 mt-1">AI Assistant can make mistakes. Verify important info.</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="absolute top-0 right-0 mt-0 mr-0 cursor-pointer hover:bg-gray-100 rounded-full p-1 transition-colors"
                aria-label="Close modal"
              >
                <Lucide icon="X" className="w-6 h-6 text-slate-400" />
              </button>
            </Dialog.Title>

            <div className="flex gap-3 flex-1 min-h-0 overflow-hidden">
              {/* Left Section - AI Assistant (65% width) */}
              <div className="w-[65%] flex flex-col min-h-0">
                <div className="w-full flex-1 border border-gray-200 rounded-lg overflow-hidden relative">
                  <SearchWidgetIframe />
                </div>
              </div>

              {/* Right Section - Logo and Recommended Questions (35% width) */}
              <div className="w-[35%] flex flex-col min-h-0">
                {/* ZMH Logo */}
                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2 mb-3">
                  <img
                    src={headerLogo}
                    alt="ZMH Analytics Logo"
                    className="w-12 h-12 object-contain"
                  />
                </div>

                {/* Recommended Questions */}
                <div className="flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-left text-gray-800">Recommended Questions</h3>
                    {copiedMessage && (
                      <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded-md transition-all duration-500 ease-in-out transform animate-in fade-in slide-in-from-right-2">
                        <Lucide icon="Info" className="w-2 h-2 mr-1" />
                        <span className="text-xs">{copiedMessage}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleCopyQuestion("What does Vanguard say about overboarding?")}
                      className="w-full text-left p-2 bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/20 transition-colors group"
                    >
                      <span className="text-primary text-xs group-hover:text-primary/80 line-clamp-2">
                        What does Vanguard say about overboarding?
                      </span>
                    </button>

                    <button
                      onClick={() => handleCopyQuestion("What are Blackrock's engagement priorities?")}
                      className="w-full text-left p-2 bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/20 transition-colors group"
                    >
                      <span className="text-primary text-xs group-hover:text-primary/80 line-clamp-2">
                        What are Blackrock's engagement priorities?
                      </span>
                    </button>

                    <button
                      onClick={() => handleCopyQuestion("What type of climate proposals does State Street support?")}
                      className="w-full text-left p-2 bg-primary/10 hover:bg-primary/20 rounded-md border border-primary/20 transition-colors group"
                    >
                      <span className="text-primary text-xs group-hover:text-primary/80 line-clamp-2">
                        What type of climate proposals does State Street support?
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Podcast Modal */}
      <Dialog size="xl" open={podcastModalVisible} onClose={() => setPodcastModalVisible(false)}>
        <Dialog.Panel className="p-6">
          <Dialog.Title>
            <div className="flex items-center justify-between w-[100%]">
              <h2 className="text-xl font-semibold">Podcasts</h2>
              <div
                onClick={() => setPodcastModalVisible(false)}
                className="cursor-pointer"
              >
                <Lucide icon="X" className="w-8 h-8 text-slate-400" />
              </div>
            </div>
          </Dialog.Title>
          <Dialog.Description>
            <div className="mt-4">
              <iframe
                src="https://player.rss.com/the-deep-dive-podcast/?theme=light&v=2"
                title="The Deep Dive Podcast"
                width="100%"
                height="393px"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                scrolling="no"
              >
                <a href="https://rss.com/podcasts/the-deep-dive-podcast/">The Deep Dive Podcast</a>
              </iframe>
            </div>
          </Dialog.Description>
        </Dialog.Panel>
      </Dialog>



      {/* AI Bot Modal & Button */}
    </div>
  );
}

export default Main;
