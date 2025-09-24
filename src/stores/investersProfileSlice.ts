import { investersProfileService } from "@/services/investersProfile";
import { AddNewInvesterType, InvestersProfile } from "@/types/investerProfiles";
import { getPageNumbers } from "@/utils/helper";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

const name = "investersProfile";

interface UpdateInvestersProfilePayload {
  id: number;
  type: string;
  data: Partial<InvestersProfile>;
}

interface nvestersProfileSlice {
  investersProfile: InvestersProfile[];
  singleInvesterProfile: InvestersProfile | null;
  totalInvestersProfile: number;
  count: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  investerProfileFilterOption: {
    region: string[];
  };
  filters: {
    region: string[];
    institution_name: string[];
  };
}

const initialState: nvestersProfileSlice = {
  investersProfile: [],
  singleInvesterProfile: null,
  totalInvestersProfile: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  investerProfileFilterOption: {
    region: ["North America", "EMEA", "APAC"],
  },
  filters: {
    region: [],
    institution_name: [],
  },
  count: 0

};

export const fetchInvestersProfiles = createAsyncThunk<
  { count: number; results: InvestersProfile[] },
  string
>(`${name}/fetchInvestersProfiles`, async (url: string) => {
  return await investersProfileService.getInvestersProfile(url);
});
export const fetchSingleInvestersProfile = createAsyncThunk<
  { results: InvestersProfile },
  { id: number; type: string }
>(`${name}/fetchSingleInvestersProfile`, async ({ id, type }) => {
  return await investersProfileService.getSingleInvester(id, type);
});

export const updateInvestersProfile = createAsyncThunk<
  { results: InvestersProfile },
  UpdateInvestersProfilePayload
>(
  `${name}/updateInvestersProfile`,
  async ({ id, type, data }: UpdateInvestersProfilePayload) => {
    const response = await investersProfileService.updateInvestersProfile(
      id,
      type,
      data
    );
    return response;
  }
);

export const addNewInvestersProfile = createAsyncThunk<
  { results: InvestersProfile },
  AddNewInvesterType
>(`${name}/addNewInvestersProfile`, async (data: AddNewInvesterType) => {
  const response = await investersProfileService.AddNewInvestersProfile(data);
  return response;
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

    setFilter(
      state,
      action: PayloadAction<{
        key: keyof typeof initialState.filters;
        value: string | string[];
      }>
    ) {
      state.filters[action.payload.key] = action.payload.value as any;
    },

    resetFilter(state) {
      state.filters = initialState.filters;
    },
    resetInvestorProfiles(state) {
      state.investersProfile = [];
      state.page = 1;
      state.totalInvestersProfile = 0;
      state.totalPages = 1;
      state.filters = initialState.filters;
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
          state.count = action.payload.count;
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
      })
      // update investers
      .addCase(updateInvestersProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvestersProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.singleInvesterProfile = action.payload.results;
      })
      .addCase(updateInvestersProfile.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch investers profile";
      })
      // Add invester
      .addCase(addNewInvestersProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addNewInvestersProfile.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addNewInvestersProfile.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch investers profile";
      });
  },
});

export default investersProfileSlice;
export const {
  setPage,
  resetPage,
  setFilter,
  resetFilter,
  resetInvestorProfiles,
} = investersProfileSlice.actions;
