import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  EngagementFormData,
} from "@/types/engagementQuestions";
import { engagementQuestionService } from "@/services/engagementQuestion";
import { getPageNumbers } from "@/utils/helper";
import { domainNotesService } from "@/services/domainNotes";
import { DomainNote } from "@/types/domainNotes";

const name = "domainNotes";

interface DomainNotesFilters {
  institution_name: string[];
  category: string[];
  year: string[];
}

interface DomainNotesState {
  results: any[];
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
  filters: DomainNotesFilters;
}

const initialState: DomainNotesState = {
  results: [],
  totalQuestions: 0,
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

export const fetchDomainNotes = createAsyncThunk<
  { results: any[] },
  string
>(`${name}/fetchDomainNotes`, async (url: string) => {
  return await domainNotesService.getDomainNotes(url);
});

export const addDomainNote = createAsyncThunk<
  { results: DomainNote; isEdit: boolean },
  { id?: number; data: Partial<DomainNote> }
>(`${name}/addNote`, async ({ data, id }) => {
  let response;
  if (id) {
    response = await domainNotesService.updateNote(id, data);
  } else {
    response = await domainNotesService.addNewNote(data);
  }
  return { results: response.results, isEdit: !!id };
});

export const deleteDomainNote = createAsyncThunk<
  {},
  { id?: number; }
>(`${name}/shareNote`, async ({ id }) => {
  let response;
  if (id) {
    response = await domainNotesService.deleteNote(id);
  }
  return { results: response.results, isEdit: !!id };
});

export const shareDomainNote = createAsyncThunk<
  {},
  { id?: number; }
>(`${name}/shareNote`, async ({ id }) => {
  let response;
  if (id) {
    response = await domainNotesService.shareNote(id);
  }
  return { results: response.results, isEdit: !!id };
});

const domainNotesSlice = createSlice({
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
      action: PayloadAction<Partial<DomainNotesFilters>>
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
      .addCase(fetchDomainNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDomainNotes.fulfilled,
        (
          state,
          action: PayloadAction<{
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.results = action.payload.results;
        }
      )
      .addCase(fetchDomainNotes.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch engagement questions";
      })
    // .addCase(getSingleEngagementQuestions.pending, (state) => {
    //   state.loading = true;
    //   state.error = null;
    // })
    // .addCase(
    //   getSingleEngagementQuestions.fulfilled,
    //   (
    //     state,
    //     action: PayloadAction<{
    //       results: any;
    //     }>
    //   ) => {
    //     state.loading = false;
    //     state.getSingleQuestion = action.payload.results;
    //   }
    // )
    // .addCase(getSingleEngagementQuestions.rejected, (state, action) => {
    //   state.loading = false;
    //   state.error =
    //     action.error.message || "Failed to fetch engagement questions";
    // })
    // .addCase(addEditEngagementQuestion.pending, (state) => {
    //   state.loading = true;
    //   state.error = null;
    // })
    // .addCase(addEditEngagementQuestion.fulfilled, (state, action) => {
    //   state.loading = false;
    //   if (action.payload.isEdit) {
    //     const index = state.questions.findIndex(
    //       (question) => question.id === action.payload.results.id
    //     );
    //     if (index !== -1) {
    //       state.questions[index] = action.payload.results;
    //     }
    //   } else {
    //     if (state.totalQuestions < 10) {
    //       state.questions = [...state.questions, action.payload.results];
    //     }
    //   }
    // })
    // .addCase(addEditEngagementQuestion.rejected, (state, action) => {
    //   state.loading = false;
    //   state.error =
    //     action.error.message || "Failed to create engagement question";
    // });
  },
});

export default domainNotesSlice;
export const {
  setPage,
  resetPage,
  setFilter,
  resetFilter,
  setAllFilters,
  resetEngagementQuestions,
} = domainNotesSlice.actions;
