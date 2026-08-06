import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { compensationProposalsService } from "@/services/compensationProposals";

const name = "compensationProposals";

interface CompensationProposalsState {
  data: any;
  loading: boolean;
  error: string | null;
  filters: {
    year?: (string | number)[];
    index?: string;
    vote?: string[];
    investor_company?: string[];
    category?: string;
    keyword?: string;
    page_size?: number;
  };
}

const DEFAULT_INVESTORS = [
  "BlackRock, Inc.",
  "The Vanguard Group",
  "State Street Investment Management",
];

const CURRENT_YEAR = new Date().getFullYear();

const initialState: CompensationProposalsState = {
  data: null,
  loading: false,
  error: null,
  filters: {
    year: [CURRENT_YEAR],
    index: "S&P 500",
    vote: [],
    investor_company: DEFAULT_INVESTORS,
    category: "Say on Pay",
    keyword: "",
    page_size: 25,
  },
};

const CLEAN_ERROR = "Unable to load compensation proposal voting stats. Please try again.";

export const fetchCompensationProposals = createAsyncThunk<
  any,
  { filters?: any },
  { rejectValue: string }
>(`${name}/fetchCompensationProposals`, async ({ filters }, { rejectWithValue }) => {
  try {
    return await compensationProposalsService.getCompensationStats(filters);
  } catch (error: any) {
    const responseData = error?.response?.data;
    if (typeof responseData === "string" && responseData.trim().startsWith("<!DOCTYPE")) {
      return rejectWithValue(CLEAN_ERROR);
    }
    return rejectWithValue(
      responseData?.detail ||
        responseData?.message ||
        error?.message ||
        CLEAN_ERROR
    );
  }
});

const compensationProposalsSlice = createSlice({
  name,
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<{ key: string; value: any }>) {
      (state.filters as any)[action.payload.key] = action.payload.value;
    },
    setFilters(state, action: PayloadAction<Partial<typeof initialState.filters>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompensationProposals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompensationProposals.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchCompensationProposals.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || CLEAN_ERROR;
      });
  },
});

export default compensationProposalsSlice;
export const { setFilter, setFilters, resetFilters } = compensationProposalsSlice.actions;
