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
  case_studies_id: number;
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
  vdsProxyAllInvestorDetails: any;
  vdsProxyAllInvestorLoading: boolean;
  npxProxyDetails: any;
  npxProxyLoading: boolean;
  investorProfileDetails: any;
  investorProfileLoading: boolean;
  tempSearch: string | null;
  percent: string;
  notificationDetails: any | null;
  notificationLoading: boolean;
  totalNotification: number,
  instituteName: string | null;
  companySearchLoading: boolean;
  totalNPXCount: number;
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
  vdsProxyAllInvestorDetails: "",
  vdsProxyAllInvestorLoading: true,
  totalNPXCount: 0,
  npxProxyDetails: "",
  npxProxyLoading: true,
  investorProfileDetails: "",
  investorProfileLoading: true,
  tempSearch: null,
  instituteName: null,
  percent: '',
  notificationDetails: [],
  notificationLoading: true,
  totalNotification: 0,
  companySearchLoading: true,
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
  { results: CompanyDashboard[], percent: string },
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

export const fetchVdsProxyAllInvestor = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchVdsProxyAllInvestor`, async (url: string) => {
  return await dashboardService.fetchVdsProxyAllInvestor(url);
});

export const fetchNpxProxyDashboard = createAsyncThunk<
{ results: any, count: number },
  string
>(`${name}/fetchNpxProxyDashboard`, async (url: string) => {
  return await dashboardService.fetchNpxProxyDashboard(url);
});

export const fetchInvestorProfileDetails = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchInvestorProfileDetails`, async (url: string) => {
  return await dashboardService.fetchInvestorProfileDetails(url);
});

export const fetchWhatNewNotification = createAsyncThunk<
  { results: any, count: number },
  string
>(`${name}/fetchWhatNewNotification`, async (url: string) => {
  return await dashboardService.fetchWhatNewNotification(url);
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
    setTempSearch(state, action: PayloadAction<string>) {
      state.tempSearch = action.payload;
    },
    setInstitution(state, action: PayloadAction<string>) {
      state.instituteName = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(fetchCompanyByName.pending, (state) => {
        state.companySearchLoading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanyByName.fulfilled,
        (state, action: PayloadAction<{ results: CompanyData[] }>) => {
          state.companySearchLoading = false;
          state.companyDataList = action.payload.results;
        }
      )
      .addCase(fetchCompanyByName.rejected, (state, action) => {
        state.companySearchLoading = false;
        state.error = action.error.message || "Failed to fetch company by name";
      })

      .addCase(fetchCompanyDashboard.pending, (state) => {
        state.dashboardDataList = [];
        state.investorCardLoading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanyDashboard.fulfilled,
        (state, action: PayloadAction<{ results: CompanyDashboard[], percent: string }>) => {
          state.dashboardDataList = action.payload.results;
          state.percent = action.payload.percent;
          state.investorCardLoading = false;
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
        }
      )
      .addCase(fetchCaseStudyDashboard.rejected, (state, action) => {
        state.caseStudyLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
          state.caseStudyDetails = [];
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
        }
      )
      .addCase(fetchVdsProxyDashboard.rejected, (state, action) => {
        state.vdsProxyLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })

      .addCase(fetchVdsProxyAllInvestor.pending, (state) => {
        state.vdsProxyAllInvestorDetails = "";
        state.vdsProxyAllInvestorLoading = true;
        state.error = null;
      })
      .addCase(
        fetchVdsProxyAllInvestor.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.vdsProxyAllInvestorLoading = false;
          state.vdsProxyAllInvestorDetails = action.payload.results;
        }
      )
      .addCase(fetchVdsProxyAllInvestor.rejected, (state, action) => {
        state.vdsProxyAllInvestorLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })
      

      .addCase(fetchNpxProxyDashboard.pending, (state) => {
        state.npxProxyDetails = "";
        state.npxProxyLoading = true;
        state.error = null;
      })
      .addCase(
        fetchNpxProxyDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any, count: number }>) => {
          state.npxProxyLoading = false;
          state.npxProxyDetails = action.payload.results;
          state.totalNPXCount = action.payload.count;

        }
      )
      .addCase(fetchNpxProxyDashboard.rejected, (state, action) => {
        state.npxProxyLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })

      .addCase(fetchInvestorProfileDetails.pending, (state) => {
        state.investorProfileDetails = "";
        state.investorProfileLoading = true;
        state.error = null;
      })
      .addCase(
        fetchInvestorProfileDetails.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.investorProfileLoading = false;
          state.investorProfileDetails = action.payload.results;
        }
      )
      .addCase(fetchInvestorProfileDetails.rejected, (state, action) => {
        state.investorProfileLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })
      .addCase(fetchWhatNewNotification.pending, (state) => {
        state.notificationDetails = "";
        state.notificationLoading = true;
        state.error = null;
      })
      .addCase(
        fetchWhatNewNotification.fulfilled,
        (state, action: PayloadAction<{ results: any, count: number }>) => {
          state.investorProfileLoading = false;
          state.notificationDetails = action.payload.results;
          state.totalNotification = action.payload.count;

        }
      )
      .addCase(fetchWhatNewNotification.rejected, (state, action) => {
        state.investorProfileLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      });
  },
});

export default companySlice;
export const { setPage, resetPage, setTempSearch, setInstitution } = companySlice.actions;
