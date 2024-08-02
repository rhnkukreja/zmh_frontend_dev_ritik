import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { proxyVotingGuidelineService } from "@/services/proxyVotingGuideline";
import { ProxyVotingGuideline } from "@/types/proxyVotingGuideline";
import { getPageNumbers } from "@/utils/helper";

const name = "proxyVotingGuideline";

interface ProxyVotingGuidelineSlice {
  proxyVotingGuidelines: ProxyVotingGuideline[];
  totalProxyVotingGuidelines: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  guidelineFilterOptions: {
    year: string[];
  };
  filters: {
    year: string;
  };
}

const initialState: ProxyVotingGuidelineSlice = {
  proxyVotingGuidelines: [],
  totalProxyVotingGuidelines: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  guidelineFilterOptions: {
    year: ["ALL", "2023", "2024"],
  },
  filters: {
    year: "",
  },
};

export const fetchProxyVotingGuidelines = createAsyncThunk<
  { count: number; results: ProxyVotingGuideline[] },
  string
>(`${name}/fetchProxyVotingGuidelines`, async (url: string) => {
  return await proxyVotingGuidelineService.getProxyVotingGuideline(url);
});

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
    setFilter(
      state,
      action: PayloadAction<{
        key: keyof typeof initialState.filters;
        value: string;
      }>
    ) {
      state.filters[action.payload.key] = action.payload.value;
    },
    resetFilter(state) {
      state.filters = {
        year: "",
      };
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
          action.error.message || "Failed to fetch proxy voting guidelines";
      });
  },
});

export default proxyVotingGuidelineSlice.reducer;
export const { setPage, resetPage, setFilter, resetFilter } =
  proxyVotingGuidelineSlice.actions;
