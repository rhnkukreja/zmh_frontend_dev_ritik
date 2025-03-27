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
  count: 0
};

export const fetchVdsEuropeans = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}/fetchVdsEuropeans`, async (url: string) => {
  return await vdsEuropeanService.getVDSEuropean(url);
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
} = VdsEuropeanSlice.actions;
