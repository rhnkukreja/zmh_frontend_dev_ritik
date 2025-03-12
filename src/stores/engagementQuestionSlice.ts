import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  EngagementFormData,
  EngagementQuestions,
} from "@/types/engagementQuestions";
import { engagementQuestionService } from "@/services/engagementQuestion";
import { getPageNumbers } from "@/utils/helper";

const name = "engagementQuestions";

interface EngagementQuestionsFilters {
  institution_name: string[];
  category: string[];
  year: string[];
}

interface EngagementQuestionsState {
  questions: EngagementQuestions[];
  getSingleQuestion: EngagementQuestions | null;
  totalQuestions: number;
  totalPages: number;
  loading: boolean;
  page: number;
  count: number;
  error: string | null;
  engagementQuestionFilterOptions: {
    category: string[];
    year: string[];
  };
  filters: EngagementQuestionsFilters;
}

const initialState: EngagementQuestionsState = {
  questions: [],
  totalQuestions: 0,
  getSingleQuestion: null,
  loading: false,
  totalPages: 1,
  page: 1,
  error: null,
  engagementQuestionFilterOptions: {
    category: ["Environmental", "Governance", "Social", "Compensation"],
    year: ["2024", "2023", "2022"],
  },
  filters: {
    institution_name: [],
    category: [],
    year: [],
  },
  count: 0
};

export const fetchEngagementQuestions = createAsyncThunk<
  { count: number; results: EngagementQuestions[] },
  string
>(`${name}/fetchEngagementQuestions`, async (url: string) => {
  return await engagementQuestionService.getEngagementQuestions(url);
});

export const getSingleEngagementQuestions = createAsyncThunk<
  { results: EngagementQuestions },
  number
>(`${name}/getSingleEngagementQuestions`, async (id: number) => {
  return await engagementQuestionService.getSingleEngagementQuestions(id);
});

export const addEditEngagementQuestion = createAsyncThunk<
  { results: EngagementQuestions; isEdit: boolean },
  { id?: number; data: EngagementFormData }
>(`${name}/addEditEngagementQuestion`, async ({ id, data }) => {
  let response;
  if (id) {
    response = await engagementQuestionService.updateEngagementQuestion(
      id,
      data
    );
  } else {
    response = await engagementQuestionService.createEngagementQuestion(data);
  }
  return {
    results: response.results,
    isEdit: id ? true : false,
  };
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
        value: string | string[];
      }>
    ) {
      state.filters[action.payload.key] = action.payload.value as any;
    },

    setAllFilters(
      state,
      action: PayloadAction<Partial<EngagementQuestionsFilters>>
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilter(state) {
      state.filters = initialState.filters;
    },

    resetEngagementQuestions(state) {
      state.filters = initialState.filters;
      state.page = 1;
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
          state.count = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count, 50);
        }
      )
      .addCase(fetchEngagementQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch engagement questions";
      })
      .addCase(getSingleEngagementQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getSingleEngagementQuestions.fulfilled,
        (
          state,
          action: PayloadAction<{
            results: EngagementQuestions;
          }>
        ) => {
          state.loading = false;
          state.getSingleQuestion = action.payload.results;
        }
      )
      .addCase(getSingleEngagementQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch engagement questions";
      })
      .addCase(addEditEngagementQuestion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEditEngagementQuestion.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.isEdit) {
          const index = state.questions.findIndex(
            (question) => question.id === action.payload.results.id
          );
          if (index !== -1) {
            state.questions[index] = action.payload.results;
          }
        } else {
          if (state.totalQuestions < 10) {
            state.questions = [...state.questions, action.payload.results];
          }
        }
      })
      .addCase(addEditEngagementQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to create engagement question";
      });
  },
});

export default engagementQuestionsSlice;
export const {
  setPage,
  resetPage,
  setFilter,
  resetFilter,
  setAllFilters,
  resetEngagementQuestions,
} = engagementQuestionsSlice.actions;
