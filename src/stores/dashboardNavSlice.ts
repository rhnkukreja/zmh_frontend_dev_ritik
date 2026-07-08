import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";

// Dashboard sections shown in the Koyfin-style sidebar navigation.
export type DashboardSection =
  | "company-overview"
  | "governance-profile"
  | "compensation"
  | "investor-overview"
  | "ownership"
  | "shareholder-meeting-results"
  | "voting-data";

export interface DashboardNavState {
  activeSection: DashboardSection;
  // Optional sub-section within a section (e.g. Company Overview -> "summary").
  // Child components can read this to sync their internal sub-tab / scroll anchor.
  activeSubSection: string | null;
}

const STORAGE_KEY = "dashboardActiveSection";

const getInitialSection = (): DashboardSection => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY) as DashboardSection | null;
    if (
      stored === "company-overview" ||
      stored === "governance-profile" ||
      stored === "compensation" ||
      stored === "investor-overview" ||
      stored === "ownership" ||
      stored === "shareholder-meeting-results" ||
      stored === "voting-data"
    ) {
      return stored;
    }
  } catch {
    // ignore storage access errors
  }
  return "company-overview";
};

const initialState: DashboardNavState = {
  activeSection: getInitialSection(),
  activeSubSection: null,
};

export const dashboardNavSlice = createSlice({
  name: "dashboardNav",
  initialState,
  reducers: {
    setActiveSection: (state, action: PayloadAction<DashboardSection>) => {
      state.activeSection = action.payload;
      state.activeSubSection = null;
      try {
        sessionStorage.setItem(STORAGE_KEY, action.payload);
      } catch {
        // ignore storage access errors
      }
    },
    setActiveSubSection: (
      state,
      action: PayloadAction<{ section: DashboardSection; subSection: string | null }>
    ) => {
      state.activeSection = action.payload.section;
      state.activeSubSection = action.payload.subSection;
      try {
        sessionStorage.setItem(STORAGE_KEY, action.payload.section);
      } catch {
        // ignore storage access errors
      }
    },
  },
});

export const { setActiveSection, setActiveSubSection } = dashboardNavSlice.actions;

export const selectDashboardNav = (state: RootState) => state.dashboardNav;

export default dashboardNavSlice;
