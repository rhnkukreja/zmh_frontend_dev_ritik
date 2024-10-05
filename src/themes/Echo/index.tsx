import "@/assets/css/vendors/simplebar.css";
import "@/assets/css/themes/echo.css";
import { Transition } from "react-transition-group";
import { useState, useEffect, createRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectSideMenu } from "@/stores/sideMenuSlice";
import { selectCompactMenu, setCompactMenu as setCompactMenuStore } from "@/stores/compactMenuSlice";
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
import { setDashboardGlobalSearch } from "@/stores/dashboardSlice";
import LoadingIcon from "@/components/Base/LoadingIcon";
import aiIcon from '@/assets/images/zmh-images/ai-Icon.png'

function Main() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.authentiction);
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
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const toggleCompactMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setCompactMenu(!compactMenu);
    // setCompactMenuOnHover(!compactMenuOnHover)
  };
  const { company_Global_Search } = useAppSelector((state: RootState) => state.dashboard);

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
  }

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
  }

  return (
    <div
      className={clsx([
        "echo group bg-[#0000000D]  h-full",
        "before:content-[''] before:h-[370px] before:w-screen bg-[#0000000D] h-7 [&.background--hidden]:before:opacity-0 before:transition-[opacity,height] before:ease-in-out before:duration-300 before:top-0 before:fixed",
        "after:content-[''] after:h-[370px] after:w-screen [&.background--hidden]:after:opacity-0 after:transition-[opacity,height] after:ease-in-out after:duration-300 after:top-0 after:fixed after:bg-texture-white after:bg-contain after:bg-fixed after:bg-[center_-13rem] after:bg-no-repeat",
        topBarActive && "background--hidden", 'bg-[#0000000D]'
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
        ])}>
        <div
          className={clsx([
            "fixed ml-[280px] w-10 h-10 items-center justify-center xl:hidden z-50",
            { flex: activeMobileMenu },
            { hidden: !activeMobileMenu },
          ])}>
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
          onMouseOver={(event) => {
            event.preventDefault();
            setCompactMenu(false);
          }}
          onMouseLeave={(event) => {
            event.preventDefault();
            setCompactMenu(true);
            // toggleCompactMenu(event);  
            // setCompactMenuOnHover(false);
          }}
        >
          {/* <div className={clsx([
              "flex-none hidden xl:flex items-center z-10 px-5 h-[65px] w-[280px] overflow-hidden relative duration-300 group-[.side-menu--collapsed]:xl:w-[91px] group-[.side-menu--collapsed.side-menu--on-hover]:xl:w-[280px]",
            ])} >
            {
              compactMenu && <a href=""
                className="flex tems-center transition-[margin] duration-300 group-[.side-menu--collapsed]:xl:ml-2 group-[.side-menu--collapsed.side-menu--on-hover]:xl:ml-0"
              >
                <div onClick={handleToggleMenu}>
                  <Lucide icon="AlignJustify" className="w-5 h-5 ml-2 stroke-[1.3] text-white" />
                </div>
              </a>
            }
            {
             !compactMenu && <a
              href=""
              onClick={handleToggleMenu}
              className="group-[.side-menu--collapsed.side-menu--on-hover]:xl:opacity-100 group-[.side-menu--collapsed]:xl:rotate-180 group-[.side-menu--collapsed]:xl:opacity-0 transition-[opacity,transform] 3xl:flex items-center justify-center w-[20px] h-[20px] ml-auto "
            >
              <Lucide icon="X" className="w-5 h-5 stroke-[1.3] text-white" />
            </a>
            }
          </div> */}

          <a
              href=""
              className="mt-5 flex items-center justify-center transition-[margin] duration-700"
            >
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
                    {menu}
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
                        linkTo(menu, navigate);
                        setFormattedMenu([...formattedMenu]);
                      }}
                    >
                        <Lucide
                          icon={menu?.icon}
                          className="side-menu__link__icon side-menu__link--active"
                        />

                      <div className="side-menu__link__title link_color">{menu.title}</div>
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
                <div className={clsx([
                  'bg-[#D9D9D926] border-transparent border w-[400px] flex items-center py-2 px-3.5 rounded-[0.5rem] cursor-pointer hover:bg-white/[0.15] transition-colors duration-300 hover:duration-100',
                  company_Global_Search !== '' ? 'text-[#545454]' : 'text-[#545454]'])}>
                  <Lucide icon="Search" className="w-[18px] h-[18px]" />
                  <div className="ml-2.5 mr-auto">{company_Global_Search !== '' ? company_Global_Search : 'Quick search...'}</div>
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
                    <img src={aiIcon} alt='ai icon'/>
                    <span className="ml-3 font-semibold hidden xl:flex">AI Assistant</span>
                    </div>
                  </a>
                  <a
                    href=""
                    className="p-2 text-[#000000] rounded-full hover:bg-white/5"
                    onClick={(e) => {
                      e.preventDefault();
                      requestFullscreen();
                    }}
                  >
                    <Lucide icon="Expand" className="w-[18px] h-[18px]" />
                  </a>
                </div>
                <h1 className="ml-3 mr-3 text-[#000000] font-bold">Hi, {user?.first_name}</h1>
                <Menu className="">
                  <Menu.Button
                    className="overflow-hidden rounded-full w-[42px] h-[42px] border-[3px] border-white/[0.15]  image-fit"
                    style={{
                      backgroundColor: '#800000'
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
                    {user?.email && 
                    <>
                    <Menu.Item >
                      <Mail strokeWidth={1} className="w-4 h-4 mr-2" />
                      <h2 className="text-[14px]">{user?.email}</h2>
                    </Menu.Item>
                    <Menu.Divider />
                    </>
                    } 
                    <Menu.Item
                      onClick={() => {
                        navigate("settings?page=security");
                      }}
                    >
                      <Lucide icon="Lock" className="w-4 h-4 mr-2" />
                      Reset Password
                    </Menu.Item>
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
        <div className="px-5 mt-16">
          <div className="container">
            <Outlet />
          </div>
        </div>
      </div>

      <Dialog size="xl" open={basicModalPreview} onClose={handleCloseModal}
      >
        <Dialog.Panel className="p-10 text-center h-full">
          <div className="relative w-full h-full">
            {isFrameLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <LoadingIcon color="#800000" icon="three-dots" className="w-16 h-16" /> 
              </div>
            )}

            {isError && !isFrameLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-600">
                <p>Failed to load the embedded content. Please try again later.</p>
              </div>
            )}

            <iframe
              className={`w-full h-full ${isFrameLoading || isError ? 'hidden' : ''}`}
              src="https://app.korra.ai/zmhdashboard/investorprofiles"
              title="Embedded Dashboard"
              onLoad={handleLoad}
              onError={handleError}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* AI Bot Modal & Button */}
    </div>
  );
}

export default Main;
