import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ProxyVotingGuideline } from "@/types/proxyVotingGuideline";
import { getPageNumbers } from "@/utils/helper";
import { shareHolderProposalService } from "@/services/shareholderProposal";

const name = "shareholder_proposal";

export interface SharedHolderPrposal {
  shareHolderProposal: any[];
  totalShareHolderNoAction: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  filters : {
    proponent_name: string, 
    year: number[],
    category: string,            
    sub_category: string,     
    keyword: string,
    active: string          
  };
}

const initialState: SharedHolderPrposal = {
  shareHolderProposal: [],
  totalShareHolderNoAction: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  filters : {
    proponent_name: '', 
    year: [],
    category: '',            
    sub_category: '',     
    keyword: '',
    active: ''          
  }
};

export const fetchShareHolderProposal = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}`, async (url: string) => {
  return await shareHolderProposalService.getShareHolderProposal(url);
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

      // .addCase(addEditProxyVotingGuideline.pending, (state) => {
      //   state.loading = true;
      //   state.error = null;
      // })
      // .addCase(addEditProxyVotingGuideline.fulfilled, (state, action) => {
      //   state.loading = false;
      //   if (action.payload.isEdit) {
      //     const index = state.proxyVotingGuidelines?.findIndex(
      //       (question) => question.id === action.payload.results.id
      //     );
      //     if (index !== -1) {
      //       state.proxyVotingGuidelines[index] = action.payload.results;
      //     }
      //   } else {
      //     if (state.totalProxyVotingGuidelines < 10) {
      //       state.proxyVotingGuidelines = [
      //         ...state.proxyVotingGuidelines,
      //         action.payload.results,
      //       ];
      //     }
      //   }
      // })
      // .addCase(addEditProxyVotingGuideline.rejected, (state, action) => {
      //   state.loading = false;
      //   state.error =
      //     action.error.message || "Failed to create engagement question";
      // });
  },
});

export default shareHolderProposal;
export const { setPage, resetPage, //resetFilter
   } =
  shareHolderProposal.actions;
