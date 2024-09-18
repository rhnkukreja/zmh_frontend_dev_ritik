import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getPageNumbers } from "@/utils/helper";
import { caseStudiesService } from "@/services/caseStudies";

const name = "shareholder_proposal";

export interface CaseStudies {
  caseStudies: any[];
  totalCaseStudies: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  filters: {
    keyword: string;
    market: string;
    sector: string;
    year: string;
    institution_name: string;
    themes: string;
    proposal_type: string;
    vote: string;
    company_name?: string;
  };
}

const initialState: CaseStudies = {
  caseStudies: [],
  totalCaseStudies: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  filters: {
    market: "",
    year: "",
    sector: "",
    institution_name: "",
    keyword: "",
    themes: "",
    proposal_type: "",
    vote: "",
    company_name: "",
  },
};

export const fetchCaseStudies = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}`, async (url: string) => {
  return await caseStudiesService.getCaseStudies(url);
});

const caseStudies = createSlice({
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
      .addCase(fetchCaseStudies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCaseStudies.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.caseStudies = action.payload.results;
          state.totalCaseStudies = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchCaseStudies.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
      });

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

export default caseStudies;
export const {
  setPage,
  resetPage, //resetFilter
} = caseStudies.actions;
