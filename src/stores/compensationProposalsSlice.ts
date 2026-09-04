import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { compensationProposalsService } from "@/services/compensationProposals";

const name = "compensationProposals";

interface CompensationProposalsState {
  data: any;
  loading: boolean;
  error: string | null;
  requestKey: string | null;
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
  "BlackRock Active Investment Stewardship (BAIS)",
  "BlackRock Investment Stewardship (BIS)",
  "Vanguard Capital Management",
  "State Street Investment Management",
  "Vanguard Portfolio Management",
];

const INSTITUTION_NAME_MAP: Record<string, string> = {
  "BlackRock (BAIS)": "BlackRock Active Investment Stewardship (BAIS)",
  "BlackRock (BIS)": "BlackRock Investment Stewardship (BIS)",
};

const normalizeInvestorNames = (values: any) => {
  if (!Array.isArray(values)) return values;
  return values.map((value) => INSTITUTION_NAME_MAP[value] ?? value);
};

const CURRENT_YEAR = new Date().getFullYear();

const initialState: CompensationProposalsState = {
  data: null,
  loading: false,
  error: null,
  requestKey: null,
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
  { filters?: any; requestKey?: string },
  { rejectValue: string }
>(
  `${name}/fetchCompensationProposals`,
  async ({ filters }, { rejectWithValue }) => {
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
  },
  {
    condition: ({ requestKey }, { getState }) => {
      if (!requestKey) return true;
      const state = getState() as any;
      const compensationState = state.compensationProposals;
      return !(
        compensationState?.requestKey === requestKey &&
        compensationState?.data
      );
    },
  }
);

const compensationProposalsSlice = createSlice({
  name,
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<{ key: string; value: any }>) {
      const nextValue =
        action.payload.key === "investor_company"
          ? normalizeInvestorNames(action.payload.value)
          : action.payload.value;
      (state.filters as any)[action.payload.key] = nextValue;
    },
    setFilters(state, action: PayloadAction<Partial<typeof initialState.filters>>) {
      state.filters = {
        ...state.filters,
        ...action.payload,
        investor_company: normalizeInvestorNames(
          action.payload.investor_company ?? state.filters.investor_company ?? DEFAULT_INVESTORS
        ),
      };
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
        state.requestKey = (action as any)?.meta?.arg?.requestKey ?? null;
      })
      .addCase(fetchCompensationProposals.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || CLEAN_ERROR;
        state.requestKey = (action as any)?.meta?.arg?.requestKey ?? state.requestKey;
      });
  },
});

export default compensationProposalsSlice;
export const { setFilter, setFilters, resetFilters } = compensationProposalsSlice.actions;
