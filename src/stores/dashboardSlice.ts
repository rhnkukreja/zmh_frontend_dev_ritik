import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { dashboardService } from "@/services/dashboard";
import { Filer } from "@/types/dashboard";
import { CompanyData } from "@/types/company";

const name = "dashboard";

export type CompanyDashboard = {
  revenue: number;
  profit: number;
  employees: number;
  filers: Filer[];
};

interface CompanySliceState {
  companyData: CompanyData | null;
  dashboardData: CompanyDashboard | null;
  loading: boolean;
  error: string | null;
}

const initialState: CompanySliceState = {
  companyData: null,
  dashboardData: null,
  loading: false,
  error: null,
};

export const fetchCompanyByName = createAsyncThunk<
  { results: CompanyData },
  string
>(`${name}/fetchCompanyByName`, async (companyName: string) => {
  return await dashboardService.fetchCompanyByName(companyName);
});

export const fetchCompanyDashboard = createAsyncThunk<
  { results: CompanyDashboard },
  string
>(`${name}/fetchCompanyDashboard`, async (ticker: string) => {
  return await dashboardService.fetchCompanyDashboard(ticker);
});

const companySlice = createSlice({
  name,
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder

      .addCase(fetchCompanyByName.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanyByName.fulfilled,
        (state, action: PayloadAction<{ results: CompanyData }>) => {
          state.loading = false;
          state.companyData = action.payload.results;
        }
      )
      .addCase(fetchCompanyByName.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch company by name";
      })

      .addCase(fetchCompanyDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanyDashboard.fulfilled,
        (state, action: PayloadAction<{ results: CompanyDashboard }>) => {
          state.loading = false;
          state.dashboardData = action.payload.results;
        }
      )
      .addCase(fetchCompanyDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      });
  },
});

export default companySlice;
