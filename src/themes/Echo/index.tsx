import "@/assets/css/vendors/simplebar.css";
import "@/assets/css/themes/echo.css";
import { Transition } from "react-transition-group";
import { useState, useEffect, createRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectSideMenu } from "@/stores/sideMenuSlice";
import {
  selectCompactMenu,
  setCompactMenu as setCompactMenuStore,
} from "@/stores/compactMenuSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { FormattedMenu, linkTo, nestedMenu, enter, leave } from "./side-menu";
import Lucide from "@/components/Base/Lucide";
import { Dialog } from "@/components/Base/Headless";
import clsx from "clsx";
import SimpleBar from "simplebar";
import { Menu } from "@/components/Base/Headless";
import QuickSearch from "@/components/QuickSearch";
import SwitchAccount from "@/components/SwitchAccount";
import NotificationsPanel from "@/components/NotificationsPanel";
import ActivitiesPanel from "@/components/ActivitiesPanel";
import { filterMenu, getColorForCharacter } from "@/utils/helper";
import logo from "../../assets/images/logo/zmh-logo.jpg";
import { logout } from "@/stores/authenticationSlice";
import { FilterX, Mail } from "lucide-react";
import { persistor, RootState } from "@/stores/store";

import LoadingIcon from "@/components/Base/LoadingIcon";
import aiIcon from "@/assets/images/zmh-images/ai-Icon.png";
import notificationIcon from "@/assets/images/zmh-images/notification_icon.png";

import sideBarIcon from "@/assets/images/zmh-images/Group 1597887028.png";
import Tippy from "@/components/Base/Tippy";
import CountryInfoHeader from "./components/countryHeader";
import GetHelp from "@/components/Help";
import { resetFilter as resetInvestorFilters } from "@/stores/investersProfileSlice";
import {
  resetFilter as resetCompanyFilters,
  selectUnSelectAllCompany as unCheckAllCompanyForCompany,
} from "@/stores/companySlice";
import { resetFilter as resetInstitutionFilters } from "@/stores/institutionSlice";
import {
  resetFilter as resetShareHolderFilters,
  selectUnSelectAllCompany as unCheckAllCompanyForShareHolder,
} from "@/stores/shareholderProposalSlice";
import { resetFilter as resetproxyVotingGuidelineFilters } from "@/stores/proxyVotingGuidelineSlice";
import { resetFilter as resetEngagementQuestionFilters } from "@/stores/engagementQuestionSlice";
import {
  resetFilter as resetPeerAnalysisFilter,
  selectUnSelectAllCompany as unCheckAllCompanyForPeerAnalysis,
} from "@/stores/peerAnalysisSlice";
import {
  resetFilters as resetCaseStudiesFilter,
  selectUnSelectAllCompany as unCheckAllCompanyForCaseStudies,
} from "@/stores/caseStudySlice";
import NotificationAlert from "@/components/NotificationAlert";
import { resetRouter } from "@/stores/themeSlice";

function Main() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.authentiction);
  const { noCompanyHeaderRoutes } = useAppSelector((state) => state.theme);

  const compactMenu = useAppSelector(selectCompactMenu);
  const setCompactMenu = (val: boolean) => {
    localStorage.setItem("compactMenu", val.toString());
    dispatch(setCompactMenuStore(val));
  };
  const [quickSearch, setQuickSearch] = useState(false);
  const [switchAccount, setSwitchAccount] = useState(false);
  const [notificationsPanel, setNotificationsPanel] = useState(false);
  const [activitiesPanel, setActivitiesPanel] = useState(false);
  const [compactMenuOnHover, setCompactMenuOnHover] = useState(false);
  const [activeMobileMenu, setActiveMobileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [formattedMenu, setFormattedMenu] = useState<
    Array<FormattedMenu | string>
  >([]);
  const sideMenuStore = useAppSelector(selectSideMenu);
  const sideMenu = () => nestedMenu(sideMenuStore, location);
  const scrollableRef = createRef<HTMLDivElement>();

  const [topBarActive, setTopBarActive] = useState(false);

  const [basicModalPreview, setBasicModalPreview] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] =
    useState(false);

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [helpFormVisible, setHelpFormVisible] = useState<boolean>(false);

  const toggleCompactMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setCompactMenu(!compactMenu);
    // setCompactMenuOnHover(!compactMenuOnHover)
  };
  const { companyGlobalSearchName, companyGlobalSearchTicker } = useAppSelector(
    (state: RootState) => state.authentiction
  );

  const compactLayout = () => {
    if (window.innerWidth <= 1600) {
      setCompactMenu(true);
    }
  };

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
    compactLayout();

    window.onresize = () => {
      compactLayout();
    };
  }, [sideMenuStore, location]);

  window.onscroll = () => {
    // Topbar
    if (document.body.scrollTop > 0 || document.documentElement.scrollTop > 0) {
      setTopBarActive(true);
    } else {
      setTopBarActive(false);
    }
  };

  const handleToggleMenu = (event: React.MouseEvent) => {
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

  const shouldHideHeader = noCompanyHeaderRoutes?.some((route: string) =>
    location.pathname.includes(route)
  );

  useEffect(() => {
    if (!location.pathname.includes("/case-studies")) {
      dispatch(resetCaseStudiesFilter());
      dispatch(unCheckAllCompanyForCaseStudies(false));
      dispatch(resetRouter());
    }
    if (!location.pathname.includes("/engagement-question")) {
      dispatch(resetEngagementQuestionFilters());
    }
    if (!location.pathname.includes("/peer-analysis")) {
      dispatch(resetPeerAnalysisFilter());
      dispatch(unCheckAllCompanyForPeerAnalysis(false));
      dispatch(resetRouter());
    }
    if (!location.pathname.includes("/proxy-voting-guideline")) {
      dispatch(resetproxyVotingGuidelineFilters());
    }
    if (!location.pathname.includes("/share-holder-proposal")) {
      dispatch(resetShareHolderFilters());
      dispatch(unCheckAllCompanyForShareHolder(false));
      dispatch(resetRouter());
    }
    if (!location.pathname.includes("/institution")) {
      dispatch(resetInstitutionFilters());
    }
    if (!location.pathname.includes("/company")) {
      dispatch(resetCompanyFilters());
      dispatch(unCheckAllCompanyForCompany(false));
      dispatch(resetRouter());
    }
    if (!location.pathname.includes("/investor-profile")) {
      dispatch(resetInvestorFilters());
    }
  }, [location.pathname]);

  return (
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
            "h-full box border-none bg-gradient-to-b to-[#000000CC] from-[#9F1239] background rounded-none z-20 relative w-[280px] duration-300 transition-[width] group-[.side-menu--collapsed]:xl:w-[91px] group-[.side-menu--collapsed.side-menu--on-hover]:xl:shadow-[6px_0_12px_-4px_#0000000f] group-[.side-menu--collapsed.side-menu--on-hover]:xl:w-[280px] overflow-hidden flex flex-col",
          ])}
          // onMouseOver={(event) => {
          //   event.preventDefault();
          //   setCompactMenu(false);
          // }}
          // onMouseLeave={(event) => {
          //   event.preventDefault();
          //   setCompactMenu(true);
          //   // toggleCompactMenu(event);
          //   // setCompactMenuOnHover(false);
          // }}
        >
          <div
            className={clsx([
              "flex-none hidden xl:flex items-center z-10 px-5 h-[65px] w-[280px] overflow-hidden relative duration-300 group-[.side-menu--collapsed]:xl:w-[91px] group-[.side-menu--collapsed.side-menu--on-hover]:xl:w-[280px]",
            ])}
          >
            {compactMenu && (
              <a
                href=""
                className="flex tems-center transition-[margin] duration-300 group-[.side-menu--collapsed]:xl:ml-2 group-[.side-menu--collapsed.side-menu--on-hover]:xl:ml-0"
              >
                <div onClick={handleToggleMenu}>
                  <img className=" w-8" src={sideBarIcon} />
                  {/* <Lucide icon="AlignJustify" className="w-5 h-5 ml-2 stroke-[1.3] text-white" /> */}
                </div>
              </a>
            )}
            {!compactMenu && (
              <a
                href=""
                onClick={handleToggleMenu}
                className="group-[.side-menu--collapsed.side-menu--on-hover]:xl:opacity-100 group-[.side-menu--collapsed]:xl:rotate-180 group-[.side-menu--collapsed]:xl:opacity-0 transition-[opacity,transform] 3xl:flex items-center justify-center  ml-auto "
              >
                <img className=" w-8 rotate-180" src={sideBarIcon} />
                {/* <Lucide icon="X" className="w-5 h-5 stroke-[1.3] text-white" /> */}
              </a>
            )}
          </div>

          <a className="mt-5 flex items-center justify-center transition-[margin] duration-700">
            <div className="flex items-center justify-center w-auto h-[80px] transition-transform ease-in group-[.side-menu--collapsed]:h-[40px] ">
              <div className="w-full h-full overflow-hidden transition-transform duration-700 ease-in">
                <img
                  alt="Logo"
                  src={logo}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* <div className="ml-3.5 group-[.side-menu--collapsed.side-menu--on-hover]:xl:opacity-100 group-[.side-menu--collapsed]:xl:opacity-0 transition-opacity font-medium">
                ZMH
              </div> */}
          </a>
          {/* <hr /> */}

          {/* <div className=" border-t text-white"></div> */}

          <div
            ref={scrollableRef}
            className={clsx([
              "w-full h-full z-20 px-5 overflow-y-auto overflow-x-hidden pb-3 [-webkit-mask-image:-webkit-linear-gradient(top,rgba(0,0,0,0),black_30px)] [&:-webkit-scrollbar]:w-0 [&:-webkit-scrollbar]:bg-transparent",
              "[&_.simplebar-content]:p-0 [&_.simplebar-track.simplebar-vertical]:w-[10px] [&_.simplebar-track.simplebar-vertical]:mr-0.5 [&_.simplebar-track.simplebar-vertical_.simplebar-scrollbar]:before:bg-slate-400/30",
            ])}
          >
            <ul className="scrollable">
              {/* BEGIN: First Child */}
              {formattedMenu.map((menu, menuKey) =>
                typeof menu == "string" ? (
                  <li className="side-menu__divider" key={menuKey}>
                    {user.user_type === "Admin" ? (
                      <>{menu}</>
                    ) : user.user_type !== "Admin" && menu === "Admin" ? (
                      <>{}</>
                    ) : (
                      <>{menu}</>
                    )}
                  </li>
                ) : (
                  <li key={menuKey}>
                    <a
                      href=""
                      className={clsx([
                        "side-menu__link",
                        { "side-menu__link--active": menu.active },
                        {
                          "side-menu__link--active-dropdown":
                            menu.activeDropdown,
                        },
                      ])}
                      onClick={(event: React.MouseEvent) => {
                        event.preventDefault();
                        if (menu.title === "Help") {
                          setHelpFormVisible(true);
                        } else if (menu.title === "Company Search") {
                          // menu.pathname = `/?ticker=${companyGlobalSearchTicker}`
                          menu.selectPathName = `/?ticker=${companyGlobalSearchTicker}`;
                          linkTo(menu, navigate);
                        } else if (menu.title !== "Notes") {
                          linkTo(menu, navigate);
                        }
                        setFormattedMenu([...formattedMenu]);
                      }}
                    >
                      <Tippy content={menu.title} options={{ theme: "light" }}>
                        {menu.title !== "Shareholder Proposals" && (
                          <Lucide
                            icon={menu?.icon}
                            className="side-menu__link__icon side-menu__link--active"
                          />
                        )}

                        {menu.title === "Shareholder Proposals" && (
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
                            className="lucide lucide-files side-menu__link__icon side-menu__link--active"
                          >
                            <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
                            <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" />
                            <path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8" />
                          </svg>
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
                        <div className="side-menu__link__badge">
                          {menu.badge}
                        </div>
                      )}
                      {menu.subMenu && (
                        <Lucide
                          icon="ChevronDown"
                          className="side-menu__link__chevron"
                        />
                      )}
                    </a>
                    {/* BEGIN: Second Child */}
                    {menu.subMenu && (
                      <Transition
                        in={menu.activeDropdown}
                        onEnter={enter}
                        onExit={leave}
                        timeout={300}
                      >
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
                                  "side-menu__link",
                                  { "side-menu__link--active": subMenu.active },
                                  {
                                    "side-menu__link--active-dropdown":
                                      subMenu.activeDropdown,
                                  },
                                ])}
                                onClick={(event: React.MouseEvent) => {
                                  event.preventDefault();
                                  linkTo(subMenu, navigate);
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
                                  <div className="side-menu__link__badge">
                                    {subMenu.badge}
                                  </div>
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
                                <Transition
                                  in={subMenu.activeDropdown}
                                  onEnter={enter}
                                  onExit={leave}
                                  timeout={300}
                                >
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
                                              "side-menu__link",
                                              {
                                                "side-menu__link--active":
                                                  lastSubMenu.active,
                                              },
                                              {
                                                "side-menu__link--active-dropdown":
                                                  lastSubMenu.activeDropdown,
                                              },
                                            ])}
                                            onClick={(
                                              event: React.MouseEvent
                                            ) => {
                                              event.preventDefault();
                                              linkTo(lastSubMenu, navigate);
                                              setFormattedMenu([
                                                ...formattedMenu,
                                              ]);
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
                                              <div className="side-menu__link__badge">
                                                {lastSubMenu.badge}
                                              </div>
                                            )}
                                          </a>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </Transition>
                              )}
                              {/* END: Third Child */}
                            </li>
                          ))}
                        </ul>
                      </Transition>
                    )}
                    {/* END: Second Child */}
                  </li>
                )
              )}
              {/* END: First Child */}
            </ul>
          </div>
          <GetHelp
            helpFormVisible={helpFormVisible}
            setHelpFormVisible={setHelpFormVisible}
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
                <a
                  href=""
                  className="p-2 text-[#545454] rounded-full bg-[#D9D9D926]"
                  onClick={(e) => {
                    e.preventDefault();
                    setQuickSearch(true);
                  }}
                >
                  <Lucide icon="Search" className="w-[18px] h-[18px]" />
                </a>
              </div>

              <div
                className="relative justify-center hidden xl:flex"
                onClick={() => setQuickSearch(true)}
              >
                <div
                  className={clsx([
                    "bg-[#D9D9D926] border-transparent border w-[400px] flex items-center py-2 px-3.5 rounded-[0.5rem] cursor-pointer hover:bg-white/[0.15] transition-colors duration-300 hover:duration-100",
                    companyGlobalSearchName !== ""
                      ? "text-[#545454]"
                      : "text-[#545454]",
                  ])}
                >
                  <Lucide icon="Search" className="w-[18px] h-[18px]" />
                  <div className="ml-2.5 mr-auto">
                    {/* {companyGlobalSearchName !== ""
                      ? companyGlobalSearchName
                      : "Quick search..."} */}
                    {"Search by company name, ticker, or symbol"}
                  </div>
                  {/* <div>⌘K</div> */}
                </div>
              </div>

              <QuickSearch
                quickSearch={quickSearch}
                setQuickSearch={setQuickSearch}
              />
              {/* END: Search */}
              {/* BEGIN: Notification & User Menu */}
              <div className="flex items-center flex-1">
                <div className="flex items-center gap-1 ml-auto">
                  <a
                    href=""
                    // bg-gradient-to-b to-[#000000CC] from-[#9F1239]
                    className="p-2 bg-gradient-to-b to-[#000000CC] from-[#9F1239]
                   border-white border-2 text-white rounded-md "
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      setBasicModalPreview(true);
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <img src={aiIcon} alt="ai icon" />
                      <span className="ml-3 font-semibold hidden xl:flex">
                        AI Assistant
                      </span>
                    </div>
                  </a>

                  <a
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      setNotificationModalVisible(true);
                    }}
                  >
                    <div className="flex items-center justify-center w-10 mx-4 relative cursor-pointer">
                      <img src={notificationIcon} alt="ai icon" />
                      <span
                        className="bg-[#DC661F] absolute  rounded-2xl w-5 h-5 p-2 text-[11px]  
                          font-semibold text-white top-0 flex items-center justify-center left-[25px]"
                      >
                        {2}
                      </span>
                    </div>
                  </a>
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
                    <Menu.Item
                      onClick={() => {
                        navigate("login");
                        dispatch(logout());
                        persistor.purge();
                      }}
                    >
                      <Lucide icon="Power" className="w-4 h-4 mr-2" />
                      Logout
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

      <div
        className={clsx([
          "transition-[margin,width] duration-100 xl:pl-3.5 pt-[54px] pb-16 relative z-10 group mode",
          { "xl:ml-[280px]": !compactMenu },
          { "xl:ml-[91px]": compactMenu },
          { "mode--light": !topBarActive },
        ])}
      >
        {/* <div className={clsx([!shouldHideHeader && 'mt-4', shouldHideHeader && 'mt-10' , 'px-5'])}> */}
        <div className="px-5 mt-10 ">
          <div className="container">
            {/* <div className="sticky top-20 z-10 "> */}
            <div className="sticky z-10 " style={{ top: "4rem" }}>
              {!shouldHideHeader && <CountryInfoHeader />}
            </div>
            <Outlet />
          </div>
        </div>
      </div>

      <Dialog size="xl" open={basicModalPreview} onClose={handleCloseModal}>
        <Dialog.Panel className="p-10 text-center h-full">
          <Dialog.Title>
            {/* <h2 className="mr-auto text-xl font-semibold">Add New Shareholder No Action</h2> */}
            <div
              onClick={handleCloseModal}
              className="absolute top-0 right-0 mt-5 mr-5 cursor-pointer"
            >
              <Lucide icon="X" className="w-8 h-8 text-slate-400" />
            </div>
          </Dialog.Title>
          {/* <Dialog.Description > */}
          <div className="relative w-full h-full">
            {isFrameLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <LoadingIcon
                  color="#800000"
                  icon="three-dots"
                  className="w-16 h-16"
                />
              </div>
            )}

            {isError && !isFrameLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-600">
                <p>
                  Failed to load the embedded content. Please try again later.
                </p>
              </div>
            )}

            <iframe
              className={`w-full h-full ${
                isFrameLoading || isError ? "hidden" : ""
              }`}
              src="https://app.korra.ai/zmhdashboard/globalsearchengine"
              title="Embedded Dashboard"
              onLoad={handleLoad}
              onError={handleError}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          {/* </Dialog.Description> */}
        </Dialog.Panel>
      </Dialog>

      {/* AI Bot Modal & Button */}
    </div>
  );
}

export default Main;
