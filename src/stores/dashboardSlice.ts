import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { dashboardService } from "@/services/dashboard";
import { Filer } from "@/types/dashboard";
import { CompanyData } from "@/types/company";

const name = "dashboard";

export type CompanyDashboard = {
  revenue: number;
  profit: number;
  employees: number;
  filer_name: string;
  filers: Filer[];
  current_shares: number;
  filer_id: number;
  percent_ownership: number;
  source: string;
  source_date: Date
};

interface CompanySliceState {
  companyDataList: CompanyData[];
  companyData: CompanyData | null;
  dashboardDataList: CompanyDashboard[];
  dashboardData: CompanyDashboard | null;
  loading: boolean;
  error: string | null;
}

const initialState: CompanySliceState = {
  companyDataList: [],
  companyData: null,
  dashboardDataList: [],
  dashboardData: null,
  loading: false,
  error: null,
};

export const fetchCompanyByName = createAsyncThunk<
{ count: number; results: CompanyData[] },
  string
>(`${name}/fetchCompanyByName`, async (companyName: string) => {
  return await dashboardService.fetchCompanyByName(companyName);
});

export const fetchCompanyDashboard = createAsyncThunk<
  { count: number; all_holders_data: CompanyDashboard[] },
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
        (state, action: PayloadAction<{ results: CompanyData[] }>) => {
          state.loading = false;
          state.companyDataList = action.payload.results;
        }
      )
      .addCase(fetchCompanyByName.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch company by name";
      })

      .addCase(fetchCompanyDashboard.pending, (state) => {
        state.dashboardDataList = [];
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchCompanyDashboard.fulfilled,
        (state, action: PayloadAction<{ all_holders_data: CompanyDashboard[] }>) => {
          state.loading = false;
          state.dashboardDataList = action.payload.all_holders_data;
        }
      )
      .addCase(fetchCompanyDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch company dashboard";
      });
  },
});

export default companySlice.reducer;
