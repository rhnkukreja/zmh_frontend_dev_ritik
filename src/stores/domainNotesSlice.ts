import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  EngagementFormData,
} from "@/types/engagementQuestions";
import { engagementQuestionService } from "@/services/engagementQuestion";
import { getPageNumbers } from "@/utils/helper";
import { domainNotesService } from "@/services/domainNotes";
import { DomainNote, DomainNoteComment } from "@/types/domainNotes";

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
  loadingCompanyDropdown: boolean;
  loadingInstitutionDropdown: boolean;
  page: number;
  count: number;
  error: string | null;
  engagementQuestionFilterOptions: {
    category: string[];
    year: string[];
  };
  filters: DomainNotesFilters;
  companyDropDown: any,
  institutionDropDown: any,
  institutionHierarchy: any[];
  loadingInstitutionHierarchy: boolean;
  companyHierarchy: any[];
  loadingCompanyHierarchy: boolean;
}

const initialState: DomainNotesState = {
  results: [],
  totalQuestions: 0,
  loading: false,
  loadingCompanyDropdown: false,
  loadingInstitutionDropdown: false,
  totalPages: 1,
  page: 1,
  error: null,
  engagementQuestionFilterOptions: {
    category: ["Environmental", "Governance", "Social", "Compensation"],
    year: [new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString(), (new Date().getFullYear() - 2).toString()],
  },
  filters: {
    institution_name: [],
    category: [],
    year: [],
  },
  count: 0,
  companyDropDown: {},
  institutionDropDown: {},
  institutionHierarchy: [],
  loadingInstitutionHierarchy: false,
  companyHierarchy: [],
  loadingCompanyHierarchy: false,
};

export const fetchDomainNotes = createAsyncThunk<
  { results: any[] },
  string
>(`${name}/fetchDomainNotes`, async (url: string) => {
  return await domainNotesService.getDomainNotes(url);
});


export const fetchDomainNotesDropDownValuesByCompany = createAsyncThunk<
  { results: any[] },
  string
>(`${name}/fetchDomainNotesDropDownValuesByCompany`, async (companyName: string) => {
  return await domainNotesService.domainNoteDropDownValuesByCompany(companyName);
});

export const fetchDomainNotesDropDownValuesByInstitution = createAsyncThunk<
  { results: any[] },
  string
>(`${name}/fetchDomainNotesDropDownValuesByInstitution`, async (institutionName: string) => {
  return await domainNotesService.domainNoteDropDownValuesByInstitution(institutionName);
});

export const fetchInstitutionHierarchyNotes = createAsyncThunk<
  any[],
  void
>(`${name}/fetchInstitutionHierarchyNotes`, async () => {
  const response = await domainNotesService.getInstitutionHierarchyNotes();
  return response.results;
});

export const fetchCompanyHierarchyNotes = createAsyncThunk<
  any[],
  void
>(`${name}/fetchCompanyHierarchyNotes`, async () => {
  const response = await domainNotesService.getCompanyHierarchyNotes();
  return response.results;
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

export const addDomainNoteComment = createAsyncThunk<
  { results: DomainNote; isEdit: boolean },
  { id?: number; data: Partial<DomainNoteComment> }
>(`${name}/addNoteComment`, async ({ data, id }) => {
  let response;
  if (id) {
    response = await domainNotesService.addNoteComment(id, data);
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
      .addCase(fetchDomainNotesDropDownValuesByCompany.pending, (state) => {
        state.loadingCompanyDropdown = true;
      })
      .addCase(fetchDomainNotesDropDownValuesByCompany.fulfilled, (state, action) => {
        state.loadingCompanyDropdown = false;
        state.companyDropDown = action.payload.results;
      })
      .addCase(fetchDomainNotesDropDownValuesByCompany.rejected, (state) => {
        state.loadingCompanyDropdown = false;
      })
      .addCase(fetchDomainNotesDropDownValuesByInstitution.pending, (state) => {
        state.loadingInstitutionDropdown = true;
      })
      .addCase(fetchDomainNotesDropDownValuesByInstitution.fulfilled, (state, action) => {
        state.loadingInstitutionDropdown = false;
        state.institutionDropDown = action.payload.results;
      })
      .addCase(fetchDomainNotesDropDownValuesByInstitution.rejected, (state) => {
        state.loadingInstitutionDropdown = false;
      })
      .addCase(fetchInstitutionHierarchyNotes.pending, (state) => {
        state.loadingInstitutionHierarchy = true;
        state.error = null;
      })
      .addCase(fetchInstitutionHierarchyNotes.fulfilled, (state, action) => {
        state.loadingInstitutionHierarchy = false;
        state.institutionHierarchy = action.payload;
      })
      .addCase(fetchInstitutionHierarchyNotes.rejected, (state, action) => {
        state.loadingInstitutionHierarchy = false;
        state.error = action.error.message || "Failed to fetch institution hierarchy";
      })
      .addCase(fetchCompanyHierarchyNotes.pending, (state) => {
        state.loadingCompanyHierarchy = true;
        state.error = null;
      })
      .addCase(fetchCompanyHierarchyNotes.fulfilled, (state, action) => {
        state.loadingCompanyHierarchy = false;
        state.companyHierarchy = action.payload;
      })
      .addCase(fetchCompanyHierarchyNotes.rejected, (state, action) => {
        state.loadingCompanyHierarchy = false;
        state.error = action.error.message || "Failed to fetch company hierarchy";
      });
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
