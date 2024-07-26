import { investersProfileService } from "@/services/investersProfile";
import { InvestersProfile } from "@/types/investerProfiles";
import { getPageNumbers } from "@/utils/helper";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

const name = "investersProfile";

interface nvestersProfileSlice {
  investersProfile: InvestersProfile[];
  singleInvesterProfile: InvestersProfile | null;
  totalInvestersProfile: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
}

const initialState: nvestersProfileSlice = {
  investersProfile: [],
  singleInvesterProfile: null,
  totalInvestersProfile: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
};

export const fetchInvestersProfiles = createAsyncThunk<
  { count: number; results: InvestersProfile[] },
  number
>(`${name}/fetchInvestersProfiles`, async (page: number) => {
  return await investersProfileService.getInvestersProfile(page);
});
export const fetchSingleInvestersProfile = createAsyncThunk<
  { results: InvestersProfile },
  number
>(`${name}/fetchSingleInvestersProfile`, async (id: number) => {
  return await investersProfileService.getSingleInvester(id);
});

const investersProfileSlice = createSlice({
  name,
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetPage(state) {
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvestersProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchInvestersProfiles.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: InvestersProfile[];
          }>
        ) => {
          state.loading = false;
          state.investersProfile = action.payload.results;
          state.totalInvestersProfile = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchInvestersProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch investers profile";
      })
      .addCase(fetchSingleInvestersProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSingleInvestersProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.singleInvesterProfile = action.payload.results;
      })
      .addCase(fetchSingleInvestersProfile.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch investers profile";
      });
  },
});

export default investersProfileSlice.reducer;
export const { setPage, resetPage } = investersProfileSlice.actions;
