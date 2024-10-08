import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { dashboardService } from "@/services/dashboard";
import { Filer } from "@/types/dashboard";
import { CompanyData } from "@/types/company";
const name = "dashboard";

export type CompanyDashboard = {
  revenue: number;
  profit: number;
  employees: number;
  filer_name: string;
  filers: Filer[];
  current_shares: number;
  filer_id: number;
  percent_ownership: number;
  source: string;
  source_date: Date;
  proxy_advisor_influence: string;
  institution_name: string;
  institution_logo_url: string;
  esg_integration: boolean;
  company_engaged: boolean;
  flag_13d: boolean;
  engagement_topic: string;
  voted_against_directors: boolean;
  investor_profile_id: number;
  // percent_ownership: string;
};

interface CompanySliceState {
  companyDataList: CompanyData[];
  companyData: CompanyData | null;
  dashboardDataList: CompanyDashboard[];
  dashboardData: CompanyDashboard | null;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCompanyDashboard: number;
  agmSummaryDetails: any;
  caseStudyDetails: any;
  caseStudyLoading: boolean;
  investorCardLoading: boolean;
  vdsProxyDetails: any;
  vdsProxyLoading: boolean;
}

const initialState: CompanySliceState = {
  companyDataList: [],
  companyData: null,
  dashboardDataList: [],
  dashboardData: null,
  loading: true,
  error: null,
  page: 1,
  totalPages: 1,
  totalCompanyDashboard: 0,
  agmSummaryDetails: "",
  investorCardLoading: true,
  caseStudyDetails: "",
  caseStudyLoading: true,
  vdsProxyDetails: "",
  vdsProxyLoading: true,

  // {
  //   nominees: [],
  //   proposals: [],
  // },
  // totalCompanyPages: 1,
  // totalSearchBarCount: 0
};

export const fetchCompanyByName = createAsyncThunk<
  { results: CompanyData[] },
  string
>(`${name}/fetchCompanyByName`, async (companyName: string) => {
  return await dashboardService.fetchCompanyByName(companyName);
});

export const fetchCompanyDashboard = createAsyncThunk<
  { results: CompanyDashboard[] },
  string
>(`${name}/fetchCompanyDashboard`, async (url: string) => {
  return await dashboardService.fetchCompanyDashboard(url);
});

export const fetchAGMSummaryDashboard = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchAGMSummaryDashboard`, async (url: string) => {
  return await dashboardService.fetchAGMSummaryDashboard(url);
});

export const fetchCaseStudyDashboard = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchCaseStudyDashboard`, async (url: string) => {
  return await dashboardService.fetchCaseStudyDashboard(url);
});

export const fetchVdsProxyDashboard = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchVdsProxyDashboard`, async (url: string) => {
  return await dashboardService.fetchVdsProxyDashboard(url);
});

const companySlice = createSlice({
  name,
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetPage(state) {
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(fetchCompanyByName.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanyByName.fulfilled,
        (state, action: PayloadAction<{ results: CompanyData[] }>) => {
          state.loading = false;
          state.companyDataList = action.payload.results;
          // state.totalSearchBarCount = action.payload.count;
          // state.totalCompanyPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchCompanyByName.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch company by name";
      })

      .addCase(fetchCompanyDashboard.pending, (state) => {
        state.dashboardDataList = [];
        state.investorCardLoading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanyDashboard.fulfilled,
        (state, action: PayloadAction<{ results: CompanyDashboard[] }>) => {
          state.dashboardDataList = action.payload.results;
          state.investorCardLoading = false;
          // state.totalCompanyDashboard = action.payload.count;
          // state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchCompanyDashboard.rejected, (state, action) => {
        state.investorCardLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })
      .addCase(fetchAGMSummaryDashboard.pending, (state) => {
        state.agmSummaryDetails = "";
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAGMSummaryDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.loading = false;
          state.agmSummaryDetails = action.payload.results;
          // state.totalCompanyDashboard = action.payload.count;
          // state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchAGMSummaryDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })

      .addCase(fetchCaseStudyDashboard.pending, (state) => {
        state.caseStudyDetails = "";
        state.caseStudyLoading = true;
        state.error = null;
      })
      .addCase(
        fetchCaseStudyDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.caseStudyLoading = false;
          state.caseStudyDetails = action.payload.results;
          // state.totalCompanyDashboard = action.payload.count;
          // state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchCaseStudyDashboard.rejected, (state, action) => {
        state.caseStudyLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })

      .addCase(fetchVdsProxyDashboard.pending, (state) => {
        state.vdsProxyDetails = "";
        state.vdsProxyLoading = true;
        state.error = null;
      })
      .addCase(
        fetchVdsProxyDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.vdsProxyLoading = false;
          state.vdsProxyDetails = action.payload.results;
          // state.totalCompanyDashboard = action.payload.count;
          // state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchVdsProxyDashboard.rejected, (state, action) => {
        state.vdsProxyLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      });
  },
});

export default companySlice;
export const { setPage, resetPage } = companySlice.actions;
