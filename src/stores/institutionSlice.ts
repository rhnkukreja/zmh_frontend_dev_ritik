import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Institutions } from "@/types/institutions";
import { institutionService } from "@/services/institution";
import { getPageNumbers } from "@/utils/helper";

const name = "institutions";

interface InstitutionsState {
  institutions: Institutions[];
  singleInstitution: Institutions | null;
  totalInstitutions: number;
  totalPages: number;
  loading: boolean;
  page: number;
  error: string | null;
  institutionFilterOptions: {
    region: string[];
  };
  filters: {
    institution_name: string;
    region: string;
    investor_type: string;
  };
}

const initialState: InstitutionsState = {
  institutions: [],
  singleInstitution: null,
  totalInstitutions: 0,
  totalPages: 1,
  loading: false,
  page: 1,
  error: null,
  institutionFilterOptions: {
    region: ["NAM", "EMEA", "APAC"],
  },
  filters: {
    institution_name: "",
    region: "",
    investor_type: "",
  },
};

export const fetchInstitutions = createAsyncThunk<
  { count: number; results: Institutions[] },
  string
>(`${name}/fetchInstitutions`, async (url: string) => {
  return await institutionService.getInstitutions(url);
});

export const getSingleInstitution = createAsyncThunk<
  { results: Institutions },
  number
>(`${name}/getSingleInstitution`, async (id: number) => {
  return await institutionService.getSingleInstitution(id);
});

export const addEditInstitution = createAsyncThunk<
  { results: Institutions; isEdit: boolean },
  { id?: number; data: Partial<Institutions> }
>(`${name}/addEditInstitution`, async ({ id, data }) => {
  let response;
  if (id) {
    response = await institutionService.updateInstitution(id, data);
  } else {
    response = await institutionService.createInstitution(data);
  }
  return {
    results: response.results,
    isEdit: !!id,
  };
});

const institutionsSlice = createSlice({
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
        key: keyof InstitutionsState["filters"];
        value: string;
      }>
    ) {
      state.filters[action.payload.key] = action.payload.value;
    },
    resetFilter(state) {
      state.filters = {
        institution_name: "",
        region: "",
        investor_type: "",
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInstitutions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchInstitutions.fulfilled,
        (
          state,
          action: PayloadAction<{ count: number; results: Institutions[] }>
        ) => {
          console.log("results: ", action.payload.results);
          state.loading = false;
          state.institutions = action.payload.results;
          state.totalInstitutions = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchInstitutions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch institutions";
      })
      .addCase(getSingleInstitution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getSingleInstitution.fulfilled,
        (state, action: PayloadAction<{ results: Institutions }>) => {
          state.loading = false;
          state.singleInstitution = action.payload.results;
        }
      )
      .addCase(getSingleInstitution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch institution";
      })
      .addCase(addEditInstitution.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEditInstitution.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.isEdit) {
          const index = state.institutions.findIndex(
            (institution) => institution.id === action.payload.results.id
          );
          if (index !== -1) {
            state.institutions[index] = action.payload.results;
          }
        } else {
          if (state.totalInstitutions < 10) {
            state.institutions.push(action.payload.results);
          }
        }
      })
      .addCase(addEditInstitution.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to save institution";
      });
  },
});

export default institutionsSlice.reducer;
export const { setPage, resetPage, setFilter, resetFilter } =
  institutionsSlice.actions;
