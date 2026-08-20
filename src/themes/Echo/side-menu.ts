import { NavigateFunction } from "react-router-dom";
import { Menu } from "@/stores/sideMenuSlice";
import { slideUp, slideDown } from "@/utils/helper";

interface Location {
  pathname: string;
  search: string;
  forceActiveMenu?: string;
}

const doesMenuPathMatchLocation = (pathname: string | undefined, location: Location) => {
  if (!pathname) {
    return false;
  }

  const [basePath, existingQuery] = pathname.split("?");

  if (location.pathname !== basePath) {
    return false;
  }

  const routeParams = new URLSearchParams(existingQuery || "");
  const currentParams = new URLSearchParams(location.search);

  const ignoredExtraParams = new Set(["page", "ticker"]);

  for (const [key, value] of currentParams.entries()) {
    if (ignoredExtraParams.has(key)) {
      continue;
    }

    if (key === "tab" && !routeParams.has("tab")) {
      if (value === "all") {
        continue;
      }
      return false;
    }

    if (!routeParams.has(key)) {
      return false;
    }

    if (routeParams.get(key) !== value) {
      return false;
    }
  }

  for (const [key, value] of routeParams.entries()) {
    const currentValue = currentParams.get(key);
    if (currentValue !== value) {
      return false;
    }
  }

  return true;
};

export interface FormattedMenu extends Menu {
  active?: boolean;
  activeDropdown?: boolean;
  subMenu?: FormattedMenu[];
}

// Setup side menu
const findActiveMenu = (subMenu: Menu[], location: Location): boolean => {
  let match = false;
  subMenu.forEach((item) => {
    if (
      ((location.forceActiveMenu !== undefined &&
        item.pathname === location.forceActiveMenu) ||
        (location.forceActiveMenu === undefined &&
          doesMenuPathMatchLocation(item.pathname, location))) &&
      !item.ignore
    ) {
      match = true;
    } else if (!match && item.subMenu) {
      match = findActiveMenu(item.subMenu, location);
    }
  });
  return match;
};

const nestedMenu = (menu: Array<Menu | string>, location: Location) => {
  const formattedMenu: Array<FormattedMenu | string> = [];

  menu.forEach((item) => {
    if (typeof item !== "string") {
      const menuItem: FormattedMenu = {
        icon: item.icon,
        title: item.title,
        badge: item.badge,
        pathname: item.pathname,
        subMenu: item.subMenu,
        ignore: item.ignore,
        isAdmin: item.isAdmin,
        isAnalyst: item.isAnalyst,
        selectPathName: item?.selectPathName,
      };

      menuItem.active =
        ((location.forceActiveMenu !== undefined &&
          menuItem.pathname === location.forceActiveMenu) ||
          (location.forceActiveMenu === undefined &&
            doesMenuPathMatchLocation(menuItem.pathname, location)) ||
          (menuItem.subMenu && findActiveMenu(menuItem.subMenu, location))) &&
        !menuItem.ignore &&
        !menuItem.subMenu;

      if (menuItem.subMenu) {
        menuItem.activeDropdown = findActiveMenu(menuItem.subMenu, location);

        const subMenu: Array<FormattedMenu> = [];
        nestedMenu(menuItem.subMenu, location).map(
          (menu) => typeof menu !== "string" && subMenu.push(menu)
        );
        menuItem.subMenu = subMenu;
      }

      formattedMenu.push(menuItem);
    } else {
      formattedMenu.push(item);
    }
  });

  return formattedMenu;
};

const linkTo = (menu: FormattedMenu, navigate: NavigateFunction, companyGlobalSearchName?: string) => {
  if (menu.subMenu) {
    const wasCollapsed = !menu.activeDropdown;
    menu.activeDropdown = !menu.activeDropdown;
    // On expand, navigate to first sub-item so it is selected by default
    if (wasCollapsed) {
      const firstSub = menu.subMenu.find((s) => s.pathname && s.pathname !== "Notes");
      if (firstSub?.pathname) {
        navigate(firstSub.pathname);
      }
    }
  } else {
    // Check if selectPathName is defined and title is "Company Search"
    if (
      menu.pathname !== undefined &&
      menu.title === "Company Search" &&
      menu.selectPathName
    ) {
      navigate(menu.selectPathName);
    }
    // Navigate to pathname if it's defined and not "Notes"
    else if (menu.pathname !== undefined && menu.pathname !== "Notes") {
      navigate(menu.pathname);
    }
  }
};

const enter = (el: HTMLElement) => {
  slideDown(el, 300);
};

const leave = (el: HTMLElement) => {
  slideUp(el, 300);
};

export { nestedMenu, linkTo, enter, leave };
