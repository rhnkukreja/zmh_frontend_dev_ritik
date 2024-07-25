import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { EngagementQuestions } from "@/types/engagementQuestions";
import { engagementQuestionService } from "@/services/engagementQuestion";
import { getPageNumbers } from "@/utils/helper";

const name = "engagementQuestions";

interface EngagementQuestionsState {
  questions: EngagementQuestions[];
  totalQuestions: number;
  totalPages: number;
  loading: boolean;
  page: number;
  error: string | null;
  engagementQuestionFilterOptions: {
    typeOfEngagement: string[];
    source: string[];
    category: string[];
  };
  filters: {
    category: string;
    source: string;
    typeOfEngagement: string;
    Institution_name: string;
  };
}

const initialState: EngagementQuestionsState = {
  questions: [],
  totalQuestions: 0,
  loading: false,
  totalPages: 1,
  page: 1,
  error: null,
  engagementQuestionFilterOptions: {
    typeOfEngagement: ["ESG", "Proxy"],
    source: ["Investor Engagement", "Letter Campaign"],
    category: ["Environmental", "Governance", "Social"],
  },
  filters: {
    category: "",
    source: "",
    typeOfEngagement: "",
    Institution_name: "",
  },
};

export const fetchEngagementQuestions = createAsyncThunk<
  { count: number; results: EngagementQuestions[] },
  string
>(`${name}/fetchEngagementQuestions`, async (url: string) => {
  return await engagementQuestionService.getEngagementQuestions(url);
});

const engagementQuestionsSlice = createSlice({
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
        category: "",
        source: "",
        typeOfEngagement: "",
        Institution_name: "",
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEngagementQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchEngagementQuestions.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: EngagementQuestions[];
          }>
        ) => {
          state.loading = false;
          state.questions = action.payload.results;
          state.totalQuestions = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchEngagementQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch engagement questions";
      });
  },
});

export default engagementQuestionsSlice.reducer;
export const { setPage, resetPage, setFilter, resetFilter } =
  engagementQuestionsSlice.actions;
