import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";
// import Hurricane from "../themes/Hurricane";
// import Ravage from "../themes/Ravage";
import Echo from "../themes/Echo";
// import Hook from "../themes/Hook";
// import Razor from "../themes/Razor";
// import Havoc from "../themes/Havoc";
// import Dagger from "../themes/Dagger";
// import Shuriken from "../themes/Shuriken";
// import Raze from "../themes/Raze";
// import Exort from "../themes/Exort";
// import Viper from "../themes/Viper";

export const themes = [
  {
    name: "echo",
    component: Echo,
  },
  // {
  //   name: "hurricane",
  //   component: Hurricane,
  // },
  // {
  //   name: "ravage",
  //   component: Ravage,
  // },
  // {
  //   name: "hook",
  //   component: Hook,
  // },
  // {
  //   name: "razor",
  //   component: Razor,
  // },
  // {
  //   name: "havoc",
  //   component: Havoc,
  // },
  // {
  //   name: "dagger",
  //   component: Dagger,
  // },
  // {
  //   name: "shuriken",
  //   component: Shuriken,
  // },
  // {
  //   name: "raze",
  //   component: Raze,
  // },
  // {
  //   name: "exort",
  //   component: Exort,
  // },
  // {
  //   name: "viper",
  //   component: Viper,
  // },
] as const;

export type Themes = (typeof themes)[number];

interface ThemeState {
  value: Themes["name"];
  noCompanyHeaderRoutes: string[];
}

export const getTheme = (search?: Themes["name"]) => {
  const theme = search === undefined ? localStorage.getItem("theme") : search;
  return themes.filter((item, key) => {
    return item.name === theme;
  })[0];
};

const initialState: ThemeState = {
  value:
    localStorage.getItem("theme") === null ? themes[0].name : getTheme().name,
  noCompanyHeaderRoutes: [
    "investor-profile",
    "engagement-question",
    "voting-guidelines",
    "notes",
    "investor-company-details",
    "proxy-contest",
    "voting-data",
    "2025-shareholder-meetings"
  ],
};

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (
      state: { value: any },
      action: PayloadAction<Themes["name"]>
    ) => {
      state.value = action.payload;
    },

    modifyRoute: (
      state,
      action: PayloadAction<{
        route: string;
        type: boolean;
      }>
    ) => {
      const { route, type } = action.payload;

      if (type === true) {
        if (!state.noCompanyHeaderRoutes.includes(route)) {
          state.noCompanyHeaderRoutes.push(route);
        }
      } else if (type === false) {
        state.noCompanyHeaderRoutes = state.noCompanyHeaderRoutes.filter(
          (existingRoute) => existingRoute !== route
        );
      }
    },

    resetRouter: (state) => {
      state.noCompanyHeaderRoutes = initialState.noCompanyHeaderRoutes;
    },
  },
});

export const { setTheme, modifyRoute, resetRouter } = themeSlice.actions;

export const selectTheme = (state: RootState) => {
  if (localStorage.getItem("theme") === null) {
    localStorage.setItem("theme", "echo");
  }

  return state.theme.value;
};

export default themeSlice;
