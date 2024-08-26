import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { companyService } from "@/services/company";
import { CompanyData } from "@/types/company";
import { getPageNumbers } from "@/utils/helper";

const name = "company";

interface CompanySliceState {
  companies: CompanyData[];
  singleCompany: CompanyData | null;
  totalCompanies: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  companyFilterOptions: {
    sector: string[];
  };
  filters: {
    sector: string;
  };
}

const initialState: CompanySliceState = {
  companies: [],
  singleCompany: null,
  totalCompanies: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  companyFilterOptions: {
    sector: ["ALL", "Technology", "Healthcare", "Finance"],
  },
  filters: {
    sector: "",
  },
};

export const fetchCompanies = createAsyncThunk<
  { count: number; results: CompanyData[] },
  string
>(`${name}/fetchCompanies`, async (url: string) => {
  return await companyService.getCompanies(url);
});

export const getSingleCompany = createAsyncThunk<
  { results: CompanyData },
  number
>(`${name}/getSingleCompany`, async (id: number) => {
  return await companyService.getSingleCompany(id);
});

export const addEditCompany = createAsyncThunk<
  { results: CompanyData; isEdit: boolean },
  { id?: number; data: Partial<CompanyData> }
>(`${name}/addEditCompany`, async ({ id, data }) => {
  let response;
  if (id) {
    response = await companyService.updateCompany(id, data);
  } else {
    response = await companyService.createCompany(data);
  }

  return {
    results: response.result,
    isEdit: id ? true : false,
  };
});

const companySlice = createSlice({
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
        sector: "",
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanies.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: CompanyData[];
          }>
        ) => {
          state.loading = false;
          state.companies = action.payload.results;
          state.totalCompanies = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch companies";
      })

      .addCase(addEditCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEditCompany.fulfilled, (state, action) => {
        state.loading = false;
        console.log("action.payload: ", action.payload);
        if (action.payload.isEdit) {
          const index = state.companies.findIndex(
            (company) => company.id === action.payload.results.id
          );
          if (index !== -1) {
            state.companies[index] = action.payload.results;
          }
        } else {
          if (state.totalCompanies < 10) {
            state.companies.push(action.payload.results);
          }
        }
      })
      .addCase(addEditCompany.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to create or update company";
      })

      //single company
      .addCase(getSingleCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getSingleCompany.fulfilled,
        (state, action: PayloadAction<{ results: CompanyData }>) => {
          state.loading = false;
          state.singleCompany = action.payload.results;
        }
      )
      .addCase(getSingleCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch institution";
      });
  },
});

export default companySlice;
export const { setPage, resetPage, setFilter, resetFilter } =
  companySlice.actions;
