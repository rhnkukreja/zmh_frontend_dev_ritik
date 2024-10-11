import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getPageNumbers } from "@/utils/helper";
import { peerAnalysisService } from "@/services/peerAnalysis";
import { TypesPeerAnalysis } from "@/types/peerAnalysis";

const name = "peer_analysis";

export interface PeerAnalysis {
  peerAnalysisData: TypesPeerAnalysis[];
  getSinglePeerAnalysis: TypesPeerAnalysis | null;
  totalPeerAnalysisNoAction: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  filters: {
    global_search: string[];
    institution_name: string[];
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
  filters: {
    global_search: [],
    institution_name: [],
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
    resetFilter(state) {
      state.filters = {
        institution_name: [],
        global_search: [],
      };
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
export const { setPage, resetPage, resetFilter, setFilter } =
  peerAnalysisSlice.actions;
