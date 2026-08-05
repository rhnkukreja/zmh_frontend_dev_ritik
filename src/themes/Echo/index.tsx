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
import Lucide from "@/components/Base/Lucide";
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
import { BellRing, FilterX, Mail } from "lucide-react";
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
      "Investor Profile",
      "Case Studies",
      "Engagement Details",
      "Shareholder Proposals",
      "Aggregate Voting",
      "Proxy Contest",
    ].includes(menu.title)
  ) {
    return "Market Analytics";
  }

  if (
    [
      "Custom Reports",
      "Podcasts",
      "Newsletter",
      "Email Alert",
      "Knowledge Base",
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
  const [expandedGroup, setExpandedGroup] = useState<string>("");
  const scrollableRef = createRef<HTMLDivElement>();
  const shouldShowSidebar = subSidebarRoutes.includes(location.pathname);
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
  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
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

    setFormattedMenu(filterMenu(sideMenu()));

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
      if (location.pathname !== basePath) {
        return false;
      }
      const routeParams = new URLSearchParams(existingQuery || "");
      const currentParams = new URLSearchParams(location.search);
      return Array.from(routeParams.entries()).every(
        ([key, value]) => currentParams.get(key) === value
      );
    };

    const computeActiveGroup = (): string => {
      if (companyGlobalSearchTicker) {
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

      return companyGlobalSearchTicker ? "Company" : "";
    };

    setExpandedGroup(computeActiveGroup());
  }, [
    location.pathname,
    location.search,
    activeSection,
    activeSubSection,
    formattedMenu,
    companyGlobalSearchTicker,
  ]);

  const handleToggleGroup = (group: string) => {
    setExpandedGroup((prev) => (prev === group ? "" : group));
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
  const shouldHideHeader = noCompanyHeaderRoutes?.some((route: string) =>
    location.pathname.includes(route)
  ) && !isCompanySpecificView;

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
  const [notificationData, setNotificationData] = useState<any>({});
  const [activeTabIndex, setActiveTabIndex] = useState(0); // default first tab
  const activeTab = notificationData?.notifications?.[activeTabIndex];
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = activeTab?.tab_notifications
    ? Object.keys(activeTab.tab_notifications)
    : [];
  const dummyData =
  {
    notification_status: false,
    notifications: [
      {
        tab_name: "Amazon.com, Inc.",
        tab_notifications: {

        },
      },
      {
        tab_name: "All",
        tab_notifications: {
          "Investor Profile": [
            {
              text: "Updated for Aberdeen Standard Investments",
              date: "August 12, 2025",
              viewed: false,
              module: "Investor Profile",
            },
          ],
          "Engagement Detail": [
            {
              text: "Updated for Aberdeen Standard Investments",
              date: "August 13, 2025",
              viewed: false,
              module: "Engagement Detail",
            },
          ],
          "Voting Data": [
            {
              text: "Updated for Aberdeen Standard Investments",
              date: "August 14, 2025",
              viewed: false,
              module: "Voting Data",
            },
          ],
          "Proxy Contest": [
            {
              text: "Updated for Aberdeen Standard Investments",
              date: "August 14, 2025",
              viewed: false,
              module: "Proxy Contest",
            },
          ],
          "Case Studies": [
            {
              text: "Updated for Aberdeen Standard Investments",
              date: "August 14, 2025",
              viewed: false,
              module: "Case Studies",
            },
          ],
        },
      },
    ],
  };
  useEffect(() => {
    getModulesCount();
    getNotificationList();
  }, [companyGlobalSearchName]);

  const getModulesCount = async () => {
    try {
      const res = await dashboardService.getModulesCount({
        global_search: companyGlobalSearchName,
      });
      if (res?.result) {
        setModulesData(res?.result);
      }
    } catch (error) {
      return error;
    } finally {
    }
  };

  const getNotificationList = async (tab?: number) => {
    try {
      const param =
        notificationData?.notification_status === false
          ? tab === 0
            ? "?mark_viewed_company=true"
            : "?mark_viewed_all=true"
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
    if (!notificationData?.notifications) return 0;


    const allTab = notificationData.notifications.find(
      (tab) => tab.tab_name === "All"
    );

    if (!allTab?.tab_notifications) return 0;


    let totalCount = 0;
    Object.values(allTab.tab_notifications).forEach((notiList) => {
      if (Array.isArray(notiList)) {
        totalCount += notiList.filter((noti) => noti.viewed === false).length;
      }
    });

    return totalCount;
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
                expandedGroup={expandedGroup}
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
                const isGroupExpanded = expandedGroup === currentGroup;

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
                        if (menu.title === "Help") {
                          setHelpFormVisible(true);
                        } else if (menu.title === "Email Alert") {
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

                      {menu?.title !== "Help" ? (
                        <div className="side-menu__link__title link_color">
                          {menu?.title}
                        </div>
                      ) : (
                        <div className="side-menu__link__title link_color">
                          {menu?.title}
                        </div>
                      )}
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
                  "/custom-reports",
                  "/voting-guidelines",
                ]?.includes(location.pathname) ||
                  location.pathname.startsWith("/proxy-contest-detail/") ||
                  location.pathname.startsWith("/investor-profile/") ? (
                  <h1 className="font-semibold text-2xl">
                    {pageTitles[location.pathname]}{" "}
                    {location.pathname.includes("/notes") &&
                      selectedName &&
                      `- ${selectedName}`}
                  </h1>
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
                          setOpen(true);
                          if (!notificationData?.notification_status) {
                            getNotificationList(activeTabIndex);
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
                      children={
                        <>
                          <div className="flex w-full gap-1 dark:bg-darkmode-800">
                            {notificationData?.notifications?.map(
                              (tab, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setActiveTabIndex(index);
                                    getNotificationList(index);
                                    setSelectedCategory("All");
                                  }}
                                  className={`w-1/2 px-5 py-2 rounded-t-lg font-semibold transition-all ${activeTabIndex === index
                                    ? "bg-primary text-white shadow"
                                    : "bg-gray-200 text-gray-700 dark:bg-darkmode-600 dark:text-gray-300"
                                    }`}
                                >
                                  {tab.tab_name}
                                </button>
                              )
                            )}
                          </div>

                          {/* Category Filter */}
                          <div className="flex gap-2 my-3 flex-wrap">
                            {categories?.length > 0 && (
                              <button
                                onClick={() => setSelectedCategory("All")}
                                className={`px-4 py-1 rounded ${selectedCategory === "All"
                                  ? "border-b-primary rounded-none border-b-2 text-primary"
                                  : "bg-gray-200 text-gray-700"
                                  }`}
                              >
                                All
                              </button>
                            )}
                            {categories.map((category) => (
                              <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-1 rounded ${selectedCategory === category
                                  ? "border-b-primary rounded-none border-b-2 text-primary"
                                  : "bg-gray-200 text-gray-700"
                                  }`}
                              >
                                {category}
                              </button>
                            ))}
                          </div>
                          {activeTab?.tab_notifications &&
                            Object.keys(activeTab.tab_notifications).length >
                            0 ? (
                            Object.entries(activeTab.tab_notifications)
                              .filter(([category]) =>
                                selectedCategory === "All"
                                  ? true
                                  : category === selectedCategory
                              )
                              .map(([category, notiList]) => (
                                <div key={category}>
                                  {/* Category title */}
                                  <h2 className="text-sm font-bold text-gray-600 dark:text-gray-300 mt-4 mb-2">
                                    {category}
                                  </h2>

                                  {(Array.isArray(notiList)
                                    ? notiList
                                    : []
                                  ).map((noti, i) => (
                                    <div
                                      key={`${activeTabIndex}-${category}-${i}`}
                                      className="py-4 border-b"
                                    >
                                      <p className="text-xs text-gray-400 pb-2">
                                        {getCustomRelativeDate(noti.date)}
                                      </p>
                                      <div className="flex items-center gap-4 text-left">
                                        <div className="flex flex-col items-end relative">
                                          {!noti.viewed && (
                                            <Lucide
                                              icon="Dot"
                                              className="stroke-[11] w-[18px] absolute top-[-7px] left-[-7px] text-[#DC661F]"
                                            />
                                          )}
                                          <div className="bg-[rgb(245,231,235)] rounded-md p-3">
                                            <img
                                              src={notificationIcon2}
                                              alt="ai icon"
                                              className="w-[20px] h-[20px] opacity-[0.7]"
                                            />
                                          </div>
                                        </div>
                                        <div className="w-[78%] flex-1 prose prose-sm">
                                          <p
                                            dangerouslySetInnerHTML={{ __html: noti.text }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ))
                          ) : (
                            <div className="flex items-center justify-center h-[100%]">
                              <img
                                src={notificationIcon2}
                                alt="ai icon"
                                className="w-4 h-4 mr-2 opacity-[0.7]"
                              />
                              <h1>No Notifications Found.</h1>
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
