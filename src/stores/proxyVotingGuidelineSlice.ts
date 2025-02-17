import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { proxyVotingGuidelineService } from "@/services/proxyVotingGuideline";
import { ProxyVotingGuideline, ProxyVotingSummaryType } from "@/types/proxyVotingGuideline";
import { getPageNumbers } from "@/utils/helper";

const name = "proxyVotingGuideline";

interface ProxyVotingGuidelineFilters {
  institution_name?: string[];
  year?: string[];
  category?: string[];
  sub_category?: string[];
  keyword?: string;
  region?:string[];
}

interface ProxyVotingGuidelineSlice {
  proxyVotingGuidelines: ProxyVotingGuideline[];
  totalProxyVotingGuidelines: number;
  loading: boolean;
  proxyVotingSummary: ProxyVotingSummaryType[];
  totalProxyVotingSummary: number;
  summaryLoading: boolean;
  error: string | null;
  totalPages: number;
  summaryTotalPages: number;
  page: number;
  summaryPage: number;
  guidelineFilterOptions: {
    year: string[];
    region: string[];
  };
  filters: ProxyVotingGuidelineFilters;
  summaryFilters: ProxyVotingGuidelineFilters ;

}

const initialState: ProxyVotingGuidelineSlice = {
  proxyVotingGuidelines: [],
  totalProxyVotingGuidelines: 0,
  loading: false,
  proxyVotingSummary: [],
  totalProxyVotingSummary: 0,
  summaryLoading: false,
  error: null,
  totalPages: 1,
  summaryTotalPages: 1,
  page: 1,
  summaryPage: 1,
  guidelineFilterOptions: {
    year: ["2025", "2024", "2023"],
    region: ["North America", "EMEA", "APAC"],
  },
  
  filters: {
    year: [],
    institution_name: [],
    region:[]
  },
  summaryFilters: {
    year: [],
    institution_name: [],
    category: [],
    sub_category: [],
    keyword: '',
  },
};

export const fetchProxyVotingGuidelines = createAsyncThunk<
  { count: number; results: ProxyVotingGuideline[] },
  string
>(`${name}/fetchProxyVotingGuidelines`, async (url: string) => {
  return await proxyVotingGuidelineService.getProxyVotingGuideline(url);
});

export const fetchProxyVotingSummary = createAsyncThunk<
  { count: number; results: ProxyVotingSummaryType[] },
  string
>(`${name}/fetchProxyVotingSummary`, async (url: string) => {
  return await proxyVotingGuidelineService.getProxyVotingSummary(url);
});

export const addEditProxyVotingGuideline = createAsyncThunk<
  { results: ProxyVotingGuideline; isEdit: boolean, isFileUpload?:boolean },
  { id?: number; isFileUpload?:boolean; data: Partial<ProxyVotingGuideline> }
>(`${name}/addEditProxyVotingGuideline`, async ({ id, data, isFileUpload }) => {
  let response;
  if(isFileUpload){
    response = await proxyVotingGuidelineService.uploadSummaryFile(
      data
    );
  }
  if (id) {
    response = await proxyVotingGuidelineService.updateProxyVotingGuideline(
      id,
      data
    );
  } else {
    response = await proxyVotingGuidelineService.createProxyVotingGuideline(
      data
    );
  }
  return {
    results: response.result,
    isEdit: id ? true : false,
  };
});

export const uploadSummaryFile = createAsyncThunk<
  { results: ProxyVotingGuideline; isEdit: boolean },
  { id?: number; data: Partial<ProxyVotingGuideline> }
>(`${name}/uploadSummaryFile`, async ({ id, data }) => {
  let response;
  if (id) {
    response = await proxyVotingGuidelineService.updateProxyVotingGuideline(
      id,
      data
    );
  } else {
    response = await proxyVotingGuidelineService.uploadSummaryFile(
      data
    );
  }
  return {
    results: response.result,
    isEdit: id ? true : false,
  };
});


// export const uploadSummaryFile = createAsyncThunk<
//   { results: ProxyVotingGuideline},
//   { id?: number; data: Partial<ProxyVotingGuideline> }
// >(`${name}/addEditProxyVotingGuideline`, async ({ data }) => {
//   let response;
  
//     response = await proxyVotingGuidelineService.uploadSummaryFile(
//       data
//     );
//   return {
//     results: response.result,
//   };
// });

const proxyVotingGuidelineSlice = createSlice({
  name,
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetPage(state) {
      state.page = 1;
    },
    setSummaryPage(state, action: PayloadAction<number>) {
      state.summaryPage = action.payload;
    },
    resetSummaryPage(state) {
      state.summaryPage = 1;
    },
    setFilter(
      state,
      action: PayloadAction<{
        key: keyof typeof initialState.filters;
        value: string | string[];
      }>
    ) {
      state.filters[action.payload.key] = action.payload.value as any;
    },
    resetFilter(state) {
      state.filters = initialState.filters;
    },

    setAllFilters(
      state,
      action: PayloadAction<Partial<ProxyVotingGuidelineFilters>>
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },

    
    setSummaryFilters(
      state,
      action: PayloadAction<Partial<ProxyVotingGuidelineFilters>>
    ) {
      state.summaryFilters = { ...state.summaryFilters, ...action.payload };
    },

    resetSummaryFilter(state) {
      state.summaryFilters = initialState.summaryFilters;
    },

    resetProxyVotingGuidelines(state) {
      state.filters = initialState.filters;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProxyVotingGuidelines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchProxyVotingGuidelines.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: ProxyVotingGuideline[];
          }>
        ) => {
          state.loading = false;
          state.proxyVotingGuidelines = action.payload.results;
          state.totalProxyVotingGuidelines = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchProxyVotingGuidelines.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
      })

      .addCase(fetchProxyVotingSummary.pending, (state) => {
        state.summaryLoading = true;
        state.error = null;
      })
      .addCase(
        fetchProxyVotingSummary.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: ProxyVotingSummaryType[];
          }>
        ) => {
          state.summaryLoading = false;
          state.proxyVotingSummary = action.payload.results;
          state.totalProxyVotingSummary = action.payload.count;
          state.summaryTotalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchProxyVotingSummary.rejected, (state, action) => {
        state.summaryLoading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
      })

      .addCase(addEditProxyVotingGuideline.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEditProxyVotingGuideline.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.isEdit) {
          const index = state.proxyVotingGuidelines?.findIndex(
            (question) => question.id === action.payload.results.id
          );
          if (index !== -1) {
            state.proxyVotingGuidelines[index] = action.payload.results;
          }
        } else {
          if (state.totalProxyVotingGuidelines < 10) {
            state.proxyVotingGuidelines = [
              ...state.proxyVotingGuidelines,
              action.payload.results,
            ];
          }
        }
      })
      .addCase(addEditProxyVotingGuideline.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to create engagement question";
      });
  },
});

export default proxyVotingGuidelineSlice;
export const {
  setPage,
  resetPage,
  setFilter,
  resetFilter,
  setAllFilters,
  resetProxyVotingGuidelines,
  setSummaryPage,
  resetSummaryPage,
  resetSummaryFilter,
  setSummaryFilters
} = proxyVotingGuidelineSlice.actions;
