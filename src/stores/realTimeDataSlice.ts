import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getPageNumbers } from "@/utils/helper";
import { realTimeService } from "@/services/realTimeData";

const name = "realTime";

interface realTimeFilters {
  institution_name?: string[];
  year?: string[];
  category?: string[];
  sub_category?: string[];
  keyword?: string;
  region?: string[];
}

interface realTimeSlice {
  realTimeData: any[];
  totalrealTimes: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  count: number;
  page: number;
  filters: realTimeFilters;
}

const initialState: realTimeSlice = {
  realTimeData: [],
  totalrealTimes: 0,
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

export const fetchRealTimes = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}/fetchRealTimes`, async (url: string) => {
  return await realTimeService.getrealTime(url);
});


const realTimeSlice = createSlice({
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
      action: PayloadAction<Partial<realTimeFilters>>
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetRealTimes(state) {
      state.filters = initialState.filters;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRealTimes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchRealTimes.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.realTimeData = action.payload.results;
          state.totalrealTimes = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count, 20);
          state.count = action.payload.count;

        }
      )
      .addCase(fetchRealTimes.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
      })
  },
});

export default realTimeSlice;
export const {
  setPage,
  resetPage,
  setFilter,
  resetFilter,
  setAllFilters,
  resetRealTimes,
} = realTimeSlice.actions;
