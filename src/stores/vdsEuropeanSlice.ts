import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
// import {
//   VdsEuropean,
//   ProxyVotingSummaryType,
// } from "@/types/VdsEuropean";
import { getPageNumbers } from "@/utils/helper";
import { vdsEuropeanService } from "@/services/vdsEuropean";

const name = "vdsEuropean";

interface VdsEuropeanFilters {
  institution_name?: string[];
  year?: string[];
  category?: string[];
  sub_category?: string[];
  keyword?: string;
  region?: string[];
}

interface VdsEuropeanSlice {
  VdsEuropeans: any[];
  totalVdsEuropeans: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  count: number;
  page: number;
  filters: VdsEuropeanFilters;
  // Analytics state
  analytics: any;
  analyticsLoading: boolean;
  analyticsError: string | null;
  analyticsPage: number;
  analyticsFilters: any;
}

const initialState: VdsEuropeanSlice = {
  VdsEuropeans: [],
  totalVdsEuropeans: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  filters: {
    year: [],
    institution_name: [],
    region: [],
  },
  count: 0,
  // Analytics state
  analytics: {},
  analyticsLoading: false,
  analyticsError: null,
  analyticsPage: 1,
  analyticsFilters: {},
};

export const fetchVdsEuropeans = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}/fetchVdsEuropeans`, async (url: string) => {
  return await vdsEuropeanService.getVDSEuropean(url);
});

export const fetchVdsEuropeanAnalytics = createAsyncThunk<
  any,
  { url: string; body: any }
>(`${name}/fetchVdsEuropeanAnalytics`, async ({ url, body }) => {
  return await vdsEuropeanService.getVDSEuropeanAnalytics(url, body);
});


const VdsEuropeanSlice = createSlice({
  name,
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetPage(state) {
      state.page = 1;
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
      action: PayloadAction<Partial<VdsEuropeanFilters>>
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetVdsEuropeans(state) {
      state.filters = initialState.filters;
      state.page = 1;
    },

    setAnalyticsPage(state, action: PayloadAction<number>) {
      state.analyticsPage = action.payload;
    },
    resetAnalyticsPage(state) {
      state.analyticsPage = 1;
    },
    setAnalyticsFilters(state, action: PayloadAction<any>) {
      state.analyticsFilters = action.payload;
    },
    resetAnalyticsFilters(state) {
      state.analyticsFilters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVdsEuropeans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchVdsEuropeans.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.VdsEuropeans = action.payload.results;
          state.totalVdsEuropeans = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count, 20);
          state.count = action.payload.count;

        }
      )
      .addCase(fetchVdsEuropeans.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
      })
      .addCase(fetchVdsEuropeanAnalytics.pending, (state) => {
        state.analyticsLoading = true;
        state.analyticsError = null;
      })
      .addCase(fetchVdsEuropeanAnalytics.fulfilled, (state, action) => {
        state.analyticsLoading = false;
        state.analytics = action.payload.response;
      })
      .addCase(fetchVdsEuropeanAnalytics.rejected, (state, action) => {
        state.analyticsLoading = false;
        state.analyticsError = action.error.message || "Failed to fetch analytics";
      })
  },
});

export default VdsEuropeanSlice;
export const {
  setPage,
  resetPage,
  setFilter,
  resetFilter,
  setAllFilters,
  resetVdsEuropeans,
  setAnalyticsPage,
  resetAnalyticsPage,
  setAnalyticsFilters,
  resetAnalyticsFilters,
} = VdsEuropeanSlice.actions;
