import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { reportsService } from "@/services/reports";
import { CompanyReportData } from "@/types/companyReport";

const name = "companyReport";

interface CompanyReportState {
  reportData: CompanyReportData | null;
  loading: boolean;
  error: string | null;
  isReportModalOpen: boolean;
}

const initialState: CompanyReportState = {
  reportData: null,
  loading: false,
  error: null,
  isReportModalOpen: false,
};

export const generateCompanyReport = createAsyncThunk<
  CompanyReportData,
  string,
  { rejectValue: string }
>(`${name}/generateCompanyReport`, async (ticker: string, { rejectWithValue }) => {
  try {
    const data = await reportsService.generateCompanyReport(ticker);
    return data;
  } catch (error: any) {
    return rejectWithValue(error.message || "Failed to generate report");
  }
});

const companyReportSlice = createSlice({
  name,
  initialState,
  reducers: {
    clearReportData: (state) => {
      state.reportData = null;
      state.error = null;
    },
    openReportModal: (state) => {
      state.isReportModalOpen = true;
    },
    closeReportModal: (state) => {
      state.isReportModalOpen = false;
    },
    setReportModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isReportModalOpen = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateCompanyReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateCompanyReport.fulfilled, (state, action) => {
        state.loading = false;
        state.reportData = action.payload;
        state.isReportModalOpen = true;
      })
      .addCase(generateCompanyReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to generate report";
      });
  },
});

export const { 
  clearReportData, 
  openReportModal, 
  closeReportModal,
  setReportModalOpen 
} = companyReportSlice.actions;

export default companyReportSlice;
