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
  | "voting-data"
  | "company-case-studies"
  | "company-engagement-details"
  | "company-shareholder-proposals";

export interface DashboardNavState {
  activeSection: DashboardSection;
  // Optional sub-section within a section (e.g. Company Overview -> "summary").
  // Child components can read this to sync their internal sub-tab / scroll anchor.
  activeSubSection: string | null;
}

const initialState: DashboardNavState = {
  activeSection: "company-overview",
  activeSubSection: null,
};

export const dashboardNavSlice = createSlice({
  name: "dashboardNav",
  initialState,
  reducers: {
    setActiveSection: (state, action: PayloadAction<DashboardSection>) => {
      state.activeSection = action.payload;
      state.activeSubSection = null;
    },
    setActiveSubSection: (
      state,
      action: PayloadAction<{ section: DashboardSection; subSection: string | null }>
    ) => {
      state.activeSection = action.payload.section;
      state.activeSubSection = action.payload.subSection;
    },
  },
});

export const { setActiveSection, setActiveSubSection } = dashboardNavSlice.actions;

export const selectDashboardNav = (state: RootState) => state.dashboardNav;

export default dashboardNavSlice;
