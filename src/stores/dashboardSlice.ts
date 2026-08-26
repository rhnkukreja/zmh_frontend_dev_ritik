import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { dashboardService } from "@/services/dashboard";
import { institutionStatsService } from "@/services/institutionStats";
import {
  BoardDirectorMembers,
  Filer,
  ProxyVotingRationale,
} from "@/types/dashboard";
import { CompanyData } from "@/types/company";
import { getPageNumbers } from "@/utils/helper";
const name = "dashboard";

export type CompanyDashboard = {
  notes: any;
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
  voted_against_directors: any;
  investor_profile_id: number;
  case_studies_id: number;
  institution_id: number;
  is_doc: boolean;
  unpri_signatory: boolean;
  voted_against_say_on_pay: any;
  voted_against_directors_message?: string;
  voted_against_say_on_pay_message?: string;
  company_id: number;
  company_name: string;
  engagement_questions: boolean
  results: any
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
  agmRequestStatus: 'idle' | 'loading' | 'success' | 'error';
  agmRequestId: string | null;
  agmHasData: boolean;
  agmErrorMessage: string | null;
  agmSummaryProxyContest: any;
  caseStudyDetails: any;
  caseStudyLoading: boolean;
  investorCardLoading: boolean;
  vdsProxyDetails: any;
  vdsProxyLoading: boolean;
  proxyContestReleaseDetails: any;
  proxyContestReleaseLoading: boolean;
  proxyContestTopFiveDetails: any;
  proxyContestTopFiveLoading: boolean;
  vdsProxyAllInvestorDetails: any;
  vdsProxyAllInvestorLoading: boolean;
  npxProxyDetails: any[];
  npxProxyLoading: boolean;
  investorProfileDetails: any;
  investorProfileLoading: boolean;
  tempSearch: string | null;
  percent: string;
  notificationDetails: any | null;
  notificationLoading: boolean;
  totalNotification: number;
  instituteName: string | null;
  companySearchLoading: boolean;
  totalNPXCount: number;
  searchCompletion: number;
  tab: "Top-20" | "All-Investor" | "Top-5" | "";
  proxyContestinvestorFilter: any;
  proxyContestTopFilter: any;
  caseStudiesTopProxy: any;
  totalCaseStudiesTopProxyPages: number;
  agmSummaryAllProxyContest: any;
  caseStudiesAllProxy: any;
  totalCaseStudiesAllProxyPages: number;
  getBoardDirectorMembersLoading: boolean;
  getProxyVotingRationaleLoading: boolean;
  boardDirectorMembers: BoardDirectorMembers[];
  votingRationale: any[]; // Keep for backward compatibility
  votingRationaleTop20: any[]; // Separate storage for Top 20 tab
  votingRationaleAllInvestors: any[]; // Separate storage for All Investors tab
  graphQLBoardDataLoading: boolean;
  graphQLBoardData: any;
  companyOverviewData: any;
  companyOverviewLoading: boolean;
  companyOverviewRequestKey: string | null;
  companyOverviewGPTData: any;
  companyOverviewGPTLoading: boolean;
  companyOverviewGPTRequestKey: string | null;
  resultsCache: Record<string, any>;
  modulesCount: any | null;
  institutionStats: any | null;
  institutionStatsLoading: boolean;
}

const getSortedMeetingYears = (results: any): string[] => {
  if (Array.isArray(results?.total_year) && results.total_year.length > 0) {
    return results.total_year
      .map((year: any) => year?.toString())
      .filter(Boolean)
      .sort((a: string, b: string) => Number(b) - Number(a));
  }

  if (results?.meeting_details_yearly_data) {
    return Object.keys(results.meeting_details_yearly_data)
      .filter(Boolean)
      .sort((a: string, b: string) => Number(b) - Number(a));
  }

  return [];
};

const normalizeAGMSummaryResults = (results: any) => {
  if (!results?.meeting_details_yearly_data) {
    return results;
  }

  const availableYears = getSortedMeetingYears(results);
  const latestYearKey = availableYears[0];
  const latestYearData = latestYearKey
    ? results.meeting_details_yearly_data?.[latestYearKey]
    : undefined;

  if (!latestYearData) {
    return results;
  }

  return {
    ...results,
    ...latestYearData,
    total_year: latestYearData?.total_year || availableYears.map((year) => Number(year)),
    meeting_details_yearly_data: results.meeting_details_yearly_data,
    meeting_details_years_data: results.meeting_details_years_data,
  };
};

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
  agmRequestStatus: 'idle',
  agmRequestId: null,
  agmHasData: false,
  agmErrorMessage: null,
  agmSummaryProxyContest: "",
  investorCardLoading: true,
  caseStudyDetails: "",
  caseStudyLoading: true,
  vdsProxyDetails: "",
  vdsProxyLoading: true,
  vdsProxyAllInvestorDetails: "",
  vdsProxyAllInvestorLoading: true,
  proxyContestTopFiveDetails: "",
  proxyContestTopFiveLoading: true,
  totalNPXCount: 0,
  npxProxyDetails: [],
  npxProxyLoading: false,
  investorProfileDetails: "",
  investorProfileLoading: true,
  tempSearch: null,
  institutionStats: null,
  institutionStatsLoading: false,
  instituteName: null,
  percent: "",
  notificationDetails: [],
  notificationLoading: true,
  totalNotification: 0,
  companySearchLoading: true,
  tab: "Top-20",
  searchCompletion: 0,
  proxyContestReleaseLoading: true,
  proxyContestReleaseDetails: "",
  proxyContestinvestorFilter: { institution_name: [], company_name: [] },
  proxyContestTopFilter: { company_name: [], top: false },
  caseStudiesTopProxy: "",
  totalCaseStudiesTopProxyPages: 0,
  agmSummaryAllProxyContest: "",
  caseStudiesAllProxy: "",
  totalCaseStudiesAllProxyPages: 0,
  getBoardDirectorMembersLoading: false,
  getProxyVotingRationaleLoading: false,
  boardDirectorMembers: [],
  votingRationale: [],
  votingRationaleTop20: [],
  votingRationaleAllInvestors: [],
  companyOverviewData: null,
  companyOverviewLoading: false,
  companyOverviewRequestKey: null,
  companyOverviewGPTData: null,
  companyOverviewGPTLoading: false,
  companyOverviewGPTRequestKey: null,
  graphQLBoardDataLoading: false,
  graphQLBoardData: null,
  resultsCache: {},
  modulesCount: null,

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
  { results: any },
  string
>(`${name}/fetchCompanyDashboard`, async (url: string) => {
  return await dashboardService.fetchCompanyDashboard(url);
});

export const fetchCompanyOverview = createAsyncThunk(
  `${name}/fetchCompanyOverview`,
  async (url: string) => {
    const response = await dashboardService.getCompanyOverview(url);
    return response;
  }
);

export const fetchCompanyOverviewGPT = createAsyncThunk(
  `${name}/fetchCompanyOverviewGPT`,
  async (url: string) => {
    const response = await dashboardService.getCompanyOverview(url);
    return response;
  }
);

export const fetchAGMSummaryDashboard = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchAGMSummaryDashboard`, async (url: string) => {
  return await dashboardService.fetchAGMSummaryDashboard(url);
});

export const fetchInstitutionStats = createAsyncThunk<
  any,
  { institutionId: number; year?: number }
>(`${name}/fetchInstitutionStats`, async ({ institutionId, year }) => {
  return await institutionStatsService.getInstitutionStats(institutionId, year);
});

export const fetchAGMProxyContestDashboard = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchAGMProxyContestDashboard`, async (url: string) => {
  return await dashboardService.fetchAGMSummaryDashboard(url);
});

export const fetchCaseStudiesTopProxyContext = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}/fetchCaseStudiesTopProxyContext`, async (url: string) => {
  return await dashboardService.fetchCaseStudiesTopProxyContext(url);
});

export const fetchAGMProxyAllContestDashboard = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchAGMProxyAllContestDashboard`, async (url: string) => {
  return await dashboardService.fetchAGMSummaryDashboard(url);
});

export const fetchCaseStudiesAllProxyContext = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}/fetchCaseStudiesAllProxyContext`, async (url: string) => {
  return await dashboardService.fetchCaseStudiesTopProxyContext(url);
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
  { results: any; count: number },
  string
>(`${name}/fetchNpxProxyDashboard`, async (url: string) => {
  // Make sure URL contains year parameter
  let finalUrl = url;
  if (!url.includes('year=')) {
    // Get year from URL or use default
    const urlParams = new URLSearchParams(window.location.search);
    const yearParam = urlParams.get('year') || '2024';
    
    // Add year parameter to the URL
    finalUrl = url.includes('?') ? `${url}&year=${yearParam}` : `${url}?year=${yearParam}`;
  }
  console.log("fetchNpxProxyDashboard with URL:", finalUrl);
  return await dashboardService.fetchNpxProxyDashboard(finalUrl);
});

export const fetchInvestorProfileDetails = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchInvestorProfileDetails`, async (url: string) => {
  return await dashboardService.fetchInvestorProfileDetails(url);
});

export const fetchWhatNewNotification = createAsyncThunk<
  { results: any; count: number },
  string
>(`${name}/fetchWhatNewNotification`, async (url: string) => {
  return await dashboardService.fetchWhatNewNotification(url);
});

export const fetchProxyContestReleaseDashboard = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchProxyContestReleaseDashboard`, async (url: string) => {
  return await dashboardService.fetchProxyContestReleaseDashboard(url);
});

export const fetchProxyTopFiveContestDashboard = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchProxyTopFiveContestDashboard`, async (url: string) => {
  return await dashboardService.fetchProxyTopFiveContestDashboard(url);
});

export const getBoardDirectorMembers = createAsyncThunk<
  BoardDirectorMembers[],
  string
>(`${name}/getBoardDirectorMembers`, async (ticker: string) => {
  const response = await dashboardService.getBoardDirectorMembers(ticker);
  return response.result;
});

export const getProxyVotingRationale = createAsyncThunk<
  { result: ProxyVotingRationale[] },
  string
>(`${name}/getProxyVotingRationale`, async (url: string) => {
  const response = await dashboardService.getProxyVotingRationale(url);
  return { result: response.result };
});

export const getProxyVotingRationaleTop20 = createAsyncThunk<
  { result: ProxyVotingRationale[] },
  string
>(`${name}/getProxyVotingRationaleTop20`, async (url: string) => {
  const response = await dashboardService.getProxyVotingRationale(url);
  return { result: response.result };
});

export const getProxyVotingRationaleAllInvestors = createAsyncThunk<
  { result: ProxyVotingRationale[] },
  string
>(`${name}/getProxyVotingRationaleAllInvestors`, async (url: string) => {
  const response = await dashboardService.getProxyVotingRationale(url);
  return { result: response.result };
});

// export const getGraphQLBoardData = createAsyncThunk<
//   { result: any },
//   string
// >(`${name}/getGraphQLBoardData`, async (searchKeyword: string) => {
//   const response = await dashboardService.getGraphQLData(searchKeyword);
//   return { result: response.result };
// });

export const fetchVotingRationaleBasedOnInstitution = createAsyncThunk<
  { results: any },
  string
>(`${name}/fetchVotingRationaleBasedOnInstitution`, async (url: string) => {
  return await dashboardService.fetchVdsProxyAllInvestor(url);
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
    // setVotingRationalePage(state, action: PayloadAction<number>) {
    //   state.votingRationlePage = action.payload;
    // },
    // resetVotingRationalePage(state) {
    //   state.votingRationlePage = 1;
    // },
    setTempSearch(state, action: PayloadAction<string>) {
      state.tempSearch = action.payload;
    },
    setInstitution(state, action: PayloadAction<string>) {
      state.instituteName = action.payload;
    },
    setTabs(
      state,
      action: PayloadAction<"Top-20" | "All-Investor" | "Top-5" | "">
    ) {
      state.tab = action.payload;
    },

    setProxyContestInvestorFilter(
      state,
      action: PayloadAction<{
        key: any;
        value: string | string[];
      }>
    ) {
      state.proxyContestinvestorFilter[action.payload.key] = action.payload
        .value as any;
    },

    setProxyTopFilter(
      state,
      action: PayloadAction<{
        key: any;
        value: string | string[] | boolean;
      }>
    ) {
      state.proxyContestTopFilter[action.payload.key] = action.payload
        .value as any;
    },

    clearVotingRationale(state) {
      state.votingRationale = [];
    },

    setVotingRationaleTop20(state, action: PayloadAction<any[]>) {
      state.votingRationaleTop20 = action.payload;
    },

    setVotingRationaleAllInvestors(state, action: PayloadAction<any[]>) {
      state.votingRationaleAllInvestors = action.payload;
    },

    clearVotingRationaleTop20(state) {
      state.votingRationaleTop20 = [];
    },

    clearVotingRationaleAllInvestors(state) {
      state.votingRationaleAllInvestors = [];
    },

    saveToCache(state, action: PayloadAction<string>) {
      const ticker = action.payload;
      state.resultsCache[ticker] = {
        dashboardDataList: state.dashboardDataList,
        dashboardData: state.dashboardData,
        agmSummaryDetails: state.agmSummaryDetails,
        companyOverviewData: state.companyOverviewData,
        boardDirectorMembers: state.boardDirectorMembers,
        modulesCount: state.modulesCount,
        institutionStats: state.institutionStats,
        timestamp: Date.now(),
      };
    },

    loadFromCache(state, action: PayloadAction<string>) {
      const ticker = action.payload;
      const cached = state.resultsCache[ticker];
      if (cached) {
        state.dashboardDataList = cached.dashboardDataList;
        state.dashboardData = cached.dashboardData;
        state.agmSummaryDetails = cached.agmSummaryDetails;
        state.companyOverviewData = cached.companyOverviewData;
        state.boardDirectorMembers = cached.boardDirectorMembers;
        state.modulesCount = cached.modulesCount;
        state.institutionStats = cached.institutionStats;
        state.loading = false;
        state.investorCardLoading = false;
        state.companyOverviewLoading = false;
        state.getBoardDirectorMembersLoading = false;
        state.institutionStatsLoading = false;
      }
    },

    setModulesCount(state, action: PayloadAction<any>) {
      state.modulesCount = action.payload;
    },
    resetInstitutionStats(state) {
      state.institutionStats = null;
      state.institutionStatsLoading = false;
    },
    patchInstitutionInDashboard(
      state,
      action: PayloadAction<{
        institutionName: string;
        proxyAdvisorInfluence: string;
        unpriSignatory: boolean;
      }>
    ) {
      const { institutionName, proxyAdvisorInfluence, unpriSignatory } = action.payload;
      const nameLower = institutionName.toLowerCase();
      const patchHoldings = (holdings: any[]) => {
        holdings.forEach((h) => {
          if (h.institution_name?.toLowerCase() === nameLower) {
            h.proxy_advisor_influence = proxyAdvisorInfluence;
            h.unpri_signatory = unpriSignatory;
          }
        });
      };
      const list = state.dashboardDataList as any;
      if (list?.all_year_data) {
        list.all_year_data.forEach((yearData: any) => {
          if (Array.isArray(yearData.holdings_data)) {
            patchHoldings(yearData.holdings_data);
          }
        });
      }
      // Keep resultsCache in sync so navigating back doesn't revert the patch
      Object.values(state.resultsCache).forEach((cached: any) => {
        if (cached?.dashboardDataList?.all_year_data) {
          cached.dashboardDataList.all_year_data.forEach((yearData: any) => {
            if (Array.isArray(yearData.holdings_data)) {
              patchHoldings(yearData.holdings_data);
            }
          });
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(fetchCompanyByName.pending, (state) => {
        state.companySearchLoading = true;
        state.error = null;
        state.searchCompletion = 0;
      })
      .addCase(
        fetchCompanyByName.fulfilled,
        (state, action: PayloadAction<{ results: CompanyData[] }>) => {
          state.companySearchLoading = false;
          state.companyDataList = action.payload.results;
          if (state.companyDataList.length > 0) {
            state.searchCompletion = 1;
          } else {
            state.searchCompletion = 2;
          }
        }
      )
      .addCase(fetchCompanyByName.rejected, (state, action) => {
        state.companySearchLoading = false;
        state.error = action.error.message || "Failed to fetch company by name";
        state.searchCompletion = 0;
      })

      .addCase(fetchCompanyDashboard.pending, (state) => {
        state.dashboardDataList = [];
        state.investorCardLoading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanyDashboard.fulfilled,
        (
          state,
          action: PayloadAction<{
            results: any[];
          }>
        ) => {
          state.dashboardDataList = action.payload.results;
          // state.percent = action.payload.percent;
          state.investorCardLoading = false;
        }
      )
      .addCase(fetchCompanyDashboard.rejected, (state, action) => {
        state.investorCardLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })
      .addCase(fetchAGMSummaryDashboard.pending, (state, action) => {
        state.agmRequestId = action.meta.requestId;
        state.agmSummaryDetails = "";
        state.loading = true;
        state.error = null;
        state.agmRequestStatus = 'loading';
        state.agmErrorMessage = null;
      })
      .addCase(
        fetchAGMSummaryDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any }> & { meta: { requestId: string } }) => {
          if (state.agmRequestId !== action.meta.requestId) return;
          state.loading = false;
          const results = normalizeAGMSummaryResults(action.payload.results);
          const availableYears = getSortedMeetingYears(results);
          
          // Check if backend explicitly says no data
          if (results?.has_data === false) {
            state.agmRequestStatus = 'success';
            state.agmHasData = false;
            state.agmSummaryDetails = results;
            state.agmErrorMessage = null;
          } else if (results?.has_data === true) {
            state.agmRequestStatus = 'success';
            state.agmHasData = Boolean(results?.Year || availableYears.length > 0);
            state.agmSummaryDetails = results;
            state.agmErrorMessage = null;
          } else {
            // Fallback: infer from Year field (backward compatibility)
            state.agmRequestStatus = 'success';
            state.agmHasData = Boolean(results?.Year || availableYears.length > 0);
            state.agmSummaryDetails = results;
            state.agmErrorMessage = null;
          }
        }
      )
      .addCase(fetchAGMSummaryDashboard.rejected, (state, action) => {
        if (state.agmRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.agmRequestStatus = 'error';
        const errorMsg = action.error.message || "Failed to fetch AGM summary";
        state.agmErrorMessage = errorMsg;
        state.error = errorMsg;
        state.agmSummaryDetails = "";
        state.agmHasData = false;
        // Log error for debugging
        console.error('[AGM Summary Error]:', errorMsg, action.error);
      })
      .addCase(fetchAGMProxyContestDashboard.pending, (state) => {
        state.agmSummaryProxyContest = "";
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAGMProxyContestDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.loading = false;
          state.agmSummaryProxyContest = action.payload.results;
        }
      )
      .addCase(fetchAGMProxyContestDashboard.rejected, (state, action) => {
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

      .addCase(fetchProxyTopFiveContestDashboard.pending, (state) => {
        state.proxyContestTopFiveDetails = "";
        state.proxyContestTopFiveLoading = true;
        state.error = null;
      })
      .addCase(
        fetchProxyTopFiveContestDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.proxyContestTopFiveLoading = false;
          state.proxyContestTopFiveDetails = action.payload.results;
        }
      )
      .addCase(fetchProxyTopFiveContestDashboard.rejected, (state, action) => {
        state.proxyContestTopFiveLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })
      .addCase(fetchCaseStudiesTopProxyContext.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCaseStudiesTopProxyContext.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.caseStudiesTopProxy = action.payload.results;
          state.totalCaseStudiesTopProxyPages = getPageNumbers(
            action.payload.count
          );
        }
      )
      .addCase(fetchCaseStudiesTopProxyContext.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
      })

      .addCase(fetchCaseStudiesAllProxyContext.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCaseStudiesAllProxyContext.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.caseStudiesAllProxy = action.payload.results;
          state.totalCaseStudiesAllProxyPages = getPageNumbers(
            action.payload.count
          );
          // state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchCaseStudiesAllProxyContext.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
      })

      .addCase(fetchAGMProxyAllContestDashboard.pending, (state) => {
        state.agmSummaryAllProxyContest = "";
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAGMProxyAllContestDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.loading = false;
          state.agmSummaryAllProxyContest = action.payload.results;
        }
      )
      .addCase(fetchAGMProxyAllContestDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })

      .addCase(fetchProxyContestReleaseDashboard.pending, (state) => {
        state.proxyContestReleaseDetails = "";
        state.proxyContestReleaseLoading = true;
        state.error = null;
      })
      .addCase(
        fetchProxyContestReleaseDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any }>) => {
          state.proxyContestReleaseLoading = false;
          state.proxyContestReleaseDetails = action.payload.results;
        }
      )
      .addCase(fetchProxyContestReleaseDashboard.rejected, (state, action) => {
        state.proxyContestReleaseLoading = false;
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
        // state.npxProxyDetails = [];
        state.npxProxyLoading = true;
        state.error = null;
      })
      .addCase(
        fetchNpxProxyDashboard.fulfilled,
        (state, action: PayloadAction<{ results: any; count: number }>) => {
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
        (state, action: PayloadAction<{ results: any; count: number }>) => {
          state.investorProfileLoading = false;
          state.notificationDetails = action.payload.results;
          state.totalNotification = action.payload.count;
        }
      )
      .addCase(fetchWhatNewNotification.rejected, (state, action) => {
        state.investorProfileLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })

      //director board memebers

      .addCase(getBoardDirectorMembers.pending, (state) => {
        state.getBoardDirectorMembersLoading = true;
        state.error = null;
      })
      .addCase(getBoardDirectorMembers.fulfilled, (state, action) => {
        state.getBoardDirectorMembersLoading = false;
        state.boardDirectorMembers = action.payload;
        state.error = null;
      })
      .addCase(getBoardDirectorMembers.rejected, (state, action) => {
        state.investorProfileLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })

      //voting rationale

      .addCase(getProxyVotingRationale.pending, (state) => {
        state.getProxyVotingRationaleLoading = true;
        state.error = null;
      })
      .addCase(getProxyVotingRationale.fulfilled, (state, action) => {
        state.getProxyVotingRationaleLoading = false;
        state.votingRationale = action.payload.result;
        state.error = null;
      })
      .addCase(getProxyVotingRationale.rejected, (state, action) => {
        state.getProxyVotingRationaleLoading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      })

      // Top 20 voting rationale reducers
      .addCase(getProxyVotingRationaleTop20.pending, (state) => {
        state.getProxyVotingRationaleLoading = true;
        state.error = null;
      })
      .addCase(getProxyVotingRationaleTop20.fulfilled, (state, action) => {
        state.getProxyVotingRationaleLoading = false;
        state.votingRationaleTop20 = action.payload.result;
        state.error = null;
      })
      .addCase(getProxyVotingRationaleTop20.rejected, (state, action) => {
        state.getProxyVotingRationaleLoading = false;
        state.error =
          action.error.message || "Failed to fetch Top 20 voting rationale";
      })

      // All Investors voting rationale reducers  
      .addCase(getProxyVotingRationaleAllInvestors.pending, (state) => {
        state.getProxyVotingRationaleLoading = true;
        state.error = null;
      })
      .addCase(getProxyVotingRationaleAllInvestors.fulfilled, (state, action) => {
        state.getProxyVotingRationaleLoading = false;
        state.votingRationaleAllInvestors = action.payload.result;
        state.error = null;
      })
      .addCase(getProxyVotingRationaleAllInvestors.rejected, (state, action) => {
        state.getProxyVotingRationaleLoading = false;
        state.error =
          action.error.message || "Failed to fetch All Investors voting rationale";
      })

      // GraphQL board data

      // .addCase(getGraphQLBoardData.pending, (state) => {
      //   state.graphQLBoardDataLoading = true;
      //   state.error = null;
      // })
      // .addCase(getGraphQLBoardData.fulfilled, (state, action) => {
      //   state.graphQLBoardDataLoading = false;
      //   state.graphQLBoardData = action.payload.result;
      //   state.error = null;
      // })
      // .addCase(getGraphQLBoardData.rejected, (state, action) => {
      //   state.graphQLBoardDataLoading = false;
      //   state.error =
      //     action.error.message || "Failed to fetch GraphQL board data";
      // });

      // Company Overview - SWR Pattern: Keep previous data while revalidating
      .addCase(fetchCompanyOverview.pending, (state, action) => {
        state.companyOverviewLoading = true;
        state.companyOverviewRequestKey = action.meta.arg;
        // DO NOT clear data - keep previous data visible (SWR pattern)
        state.error = null;
      })
      .addCase(fetchCompanyOverview.fulfilled, (state, action) => {
        if (state.companyOverviewRequestKey !== action.meta.arg) {
          return;
        }
        state.companyOverviewLoading = false;
        state.companyOverviewData = action.payload;
        state.companyOverviewRequestKey = null;
        state.error = null;
      })
      .addCase(fetchCompanyOverview.rejected, (state, action) => {
        if (state.companyOverviewRequestKey !== action.meta.arg) {
          return;
        }
        state.companyOverviewLoading = false;
        state.companyOverviewRequestKey = null;
        // Only clear data on error, not on revalidation
        if (!state.companyOverviewData) {
          state.companyOverviewData = null;
        }
        state.error = action.error.message || "Failed to fetch company overview";
      })

      // Company Overview GPT - SWR Pattern: Keep previous data while revalidating
      .addCase(fetchCompanyOverviewGPT.pending, (state, action) => {
        state.companyOverviewGPTLoading = true;
        state.companyOverviewGPTRequestKey = action.meta.arg;
        // DO NOT clear data - keep previous data visible (SWR pattern)
        state.error = null;
      })
      .addCase(fetchCompanyOverviewGPT.fulfilled, (state, action) => {
        if (state.companyOverviewGPTRequestKey !== action.meta.arg) {
          return;
        }
        state.companyOverviewGPTLoading = false;
        state.companyOverviewGPTData = action.payload;
        state.companyOverviewGPTRequestKey = null;
        state.error = null;
      })
      .addCase(fetchCompanyOverviewGPT.rejected, (state, action) => {
        if (state.companyOverviewGPTRequestKey !== action.meta.arg) {
          return;
        }
        state.companyOverviewGPTLoading = false;
        state.companyOverviewGPTRequestKey = null;
        // Only clear data on error, not on revalidation
        if (!state.companyOverviewGPTData) {
          state.companyOverviewGPTData = null;
        }
        state.error = action.error.message || "Failed to fetch company overview GPT";
      })

      // Institution Stats
      .addCase(fetchInstitutionStats.pending, (state) => {
        state.institutionStatsLoading = true;
        state.error = null;
      })
      .addCase(fetchInstitutionStats.fulfilled, (state, action) => {
        state.institutionStatsLoading = false;
        state.institutionStats = action.payload;
        state.error = null;
      })
      .addCase(fetchInstitutionStats.rejected, (state, action) => {
        state.institutionStatsLoading = false;
        state.error = action.error.message || "Failed to fetch institution stats";
      });
  },
});

export default companySlice;
export const {
  setPage,
  resetPage,
  setTempSearch,
  setInstitution,
  setTabs,
  setProxyContestInvestorFilter,
  setProxyTopFilter,
  // setVotingRationalePage,
  clearVotingRationale,
  setVotingRationaleTop20,
  setVotingRationaleAllInvestors,
  clearVotingRationaleTop20,
  clearVotingRationaleAllInvestors,
  saveToCache,
  loadFromCache,
  setModulesCount,
  resetInstitutionStats,
  patchInstitutionInDashboard,
} = companySlice.actions;
