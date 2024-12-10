import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getPageNumbers } from "@/utils/helper";
import { caseStudiesService } from "@/services/caseStudies";

const name = "shareholder_proposal";

export interface CaseStudyFilter {
  keyword: string;
  market: string[];
  sector: string[];
  year: string[];
  institution_name?: string[];
  global_search?: any[];
  themes: string[];
  proposal_type: string[];
  vote: string[];
  company_name?: string[];
  [key: string]: any;
}

export interface CaseStudies {
  caseStudies: any[];
  singleCaseStudy: any;
  totalCaseStudies: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  isAllCompanySelected: boolean;
  filters: CaseStudyFilter;
}

const initialState: CaseStudies = {
  caseStudies: [],
  singleCaseStudy: null,
  totalCaseStudies: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  isAllCompanySelected: false,
  filters: {
    keyword: "",
    market: [],
    sector: [],
    year: [],
    themes: [],
    proposal_type: [],
    vote: [],
    institution_name: [],
    global_search: [],
  },
};

export const fetchCaseStudies = createAsyncThunk<
  { count: number; results: any[] },
  string
>(`${name}`, async (url: string) => {
  return await caseStudiesService.getCaseStudies(url);
});

export const getSingleSingleCaseStudy = createAsyncThunk<
  { result: any },
  number
>(`${name}/getSingleSingleCaseStudy`, async (id) => {
  return await caseStudiesService.getSingleSingleCaseStudy(id);
});

export const addEditNewCaseStudies = createAsyncThunk<{ results: any }, any>(
  `${name}/addEditNewCaseStudies`,
  async ({ id, data }) => {
    let response;
    if (id) {
      response = await caseStudiesService.updateCaseStudies(id, data);
    } else {
      response = await caseStudiesService.addNewCaseStudies(data);
    }
    return response;
  }
);
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

    setFilters(
      state,
      action: PayloadAction<{
        key: keyof typeof initialState.filters;
        value: string | string[];
      }>
    ) {
      state.filters[action.payload.key] = action.payload.value as any;
    },

    setAllFilters(state, action: PayloadAction<Partial<CaseStudyFilter>>) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilters(state) {
      state.filters = initialState.filters;
    },

    selectUnSelectAllCompany(state, action: PayloadAction<boolean>) {
      state.isAllCompanySelected = action.payload;
      if (action.payload === false) {
        state.page = 1;
      }
    },

    resetCaseStudy(state) {
      state.filters = initialState.filters;
      state.isAllCompanySelected = false;
      state.page = 1;
    },
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
      })
      //single case study
      .addCase(getSingleSingleCaseStudy.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSingleSingleCaseStudy.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.singleCaseStudy = action.payload.result;
      })
      .addCase(getSingleSingleCaseStudy.rejected, (state) => {
        state.loading = false;
        state.error = null;
      });
  },
});

export default caseStudies;
export const {
  setPage,
  resetPage,
  setFilters,
  resetFilters,
  setAllFilters,
  selectUnSelectAllCompany,
  resetCaseStudy,
} = caseStudies.actions;
