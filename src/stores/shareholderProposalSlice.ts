import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getPageNumbers } from "@/utils/helper";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import { ShareHolderData } from "@/types/shareHolder";
import { ShareHolderFilter } from "@/types/ShareholdeFilter";

const name = "shareholder_proposal";

export interface SharedHolderPrposal {
  shareHolderProposal: any[];
  getSingleShareHolder: any | null;
  totalShareHolderNoAction: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  tab: "proposal" | "no-action" | "withdrawn" | "";
  applyFilters: ShareHolderFilter | undefined;
  filters: {
    proponent_name: string;
    year: number[];
    category: string;
    sub_category: string;
    keyword: string;
    active: string;
  };
  shareHolderFilterOption: {
    category: string[];
  };
}

const initialState: SharedHolderPrposal = {
  shareHolderProposal: [],
  getSingleShareHolder: null,
  totalShareHolderNoAction: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  applyFilters: undefined,
  tab: "proposal",
  filters: {
    proponent_name: "",
    year: [],
    category: "",
    sub_category: "",
    keyword: "",
    active: "",
  },
  shareHolderFilterOption: {
    category: [
      "Corporate Governance",
      "Environmental",
      "Executive Compensation",
      "Social",
    ],
  },
};

export const fetchShareHolderProposal = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}`, async (url: string) => {
  return await shareHolderProposalService.getShareHolderProposal(url);
});

export const getSingleShareHolderData = createAsyncThunk<
  { results: any },
  { url: string; id: number }
>(`${name}/getSingleShareHolder`, async ({ url, id }) => {
  return await shareHolderProposalService.getSingleShareHolder(url, id);
});

const shareHolderProposal = createSlice({
  name,
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetPage(state) {
      state.page = 1;
    },
    setTabs(state, action: PayloadAction<"proposal" | "no-action" | "withdrawn" | "">) {
      state.tab = action.payload;
    },
    setApplyFilters(state, action: PayloadAction<ShareHolderFilter | undefined>) {
      if (action.payload) {
        state.applyFilters = {...state.applyFilters, ...action.payload };
      }
    },
    //

    // setFilter(
    //   state,
    //   action: PayloadAction<{
    //     key: keyof typeof initialState.filters;
    //     value: string | string[];
    //   }>
    // ) {
    //   state.filters[action.payload.key] = action.payload.value as any;
    // },
    // resetFilter(state) {
    //   state.filters = {
    //     year: "",
    //     institution_name: [],
    //   };
    // },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShareHolderProposal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchShareHolderProposal.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.shareHolderProposal = action.payload.results;
          state.totalShareHolderNoAction = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchShareHolderProposal.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
      })
      .addCase(getSingleShareHolderData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getSingleShareHolderData.fulfilled,
        (
          state,
          action: PayloadAction<{
            results: ShareHolderData;
          }>
        ) => {
          state.loading = false;
          state.getSingleShareHolder = action.payload.results;
        }
      )
      .addCase(getSingleShareHolderData.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch engagement questions";
      });
  },
});

export default shareHolderProposal;
export const {
  setPage,
  resetPage, //resetFilter
  setTabs,
  setApplyFilters,
} = shareHolderProposal.actions;
