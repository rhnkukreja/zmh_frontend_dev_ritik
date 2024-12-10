import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getPageNumbers } from "@/utils/helper";
import { peerAnalysisService } from "@/services/peerAnalysis";
import { TypesPeerAnalysis } from "@/types/peerAnalysis";

const name = "peer_analysis";

export interface PeerAnalysisFilter {
  year: string[];
  sector: string[];
  institution_name?: string[];
  global_search?: any[];

  category?: string[];
  [key: string]: any;
}

export interface PeerAnalysis {
  peerAnalysisData: TypesPeerAnalysis[];
  getSinglePeerAnalysis: TypesPeerAnalysis | null;
  totalPeerAnalysisNoAction: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  isAllCompanySelected: boolean;
  page: number;
  filters: PeerAnalysisFilter;
  filterOptions: {
    category: string[];
    year: string[];
  };
}

const initialState: PeerAnalysis = {
  peerAnalysisData: [],
  getSinglePeerAnalysis: null,

  totalPeerAnalysisNoAction: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  isAllCompanySelected: false,
  filters: {
    global_search: [],
    institution_name: [],
    year: [],
    category: [],
    sector: [],
  },
  filterOptions: {
    category: ["Social", "Governance", "Environment"],
    year: ["2023", "2024"],
  },
};

export const fetchPeerAnalysis = createAsyncThunk<
  { count: number; results: TypesPeerAnalysis[] },
  string
>(`${name}`, async (url: string) => {
  return await peerAnalysisService.getPeerAnalysis(url);
});

const peerAnalysisSlice = createSlice({
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

    setAllFilters(state, action: PayloadAction<Partial<PeerAnalysisFilter>>) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilter(state) {
      state.filters = initialState.filters;
    },
    selectUnSelectAllCompany(state, action: PayloadAction<boolean>) {
      state.isAllCompanySelected = action.payload;

      if (action.payload === false) {
        state.page = 1;
      }
    },

    resetPeerAnalysis(state) {
      state.filters = initialState.filters;
      state.page = 1;
      state.isAllCompanySelected = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPeerAnalysis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchPeerAnalysis.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.peerAnalysisData = action.payload.results;
          state.totalPeerAnalysisNoAction = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchPeerAnalysis.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch peer analysis data";
      });
  },
});

export default peerAnalysisSlice;
export const {
  setPage,
  resetPage,
  resetFilter,
  setFilter,
  setAllFilters,
  selectUnSelectAllCompany,
  resetPeerAnalysis,
} = peerAnalysisSlice.actions;
