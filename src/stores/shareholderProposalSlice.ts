import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { getPageNumbers } from "@/utils/helper";
import { shareHolderProposalService } from "@/services/shareholderProposal";
import {
  AddNoActionType,
  AddShareholderType,
  AddWithdrawnType,
  ShareHolderData,
} from "@/types/shareHolder";
import { ShareHolderFilter } from "@/types/ShareholdeFilter";

const name = "shareholder_proposal";

type SharedHolderFiltersType = {
  proponent_name: string[];
  year: string[];
  category: string[];
  sub_category: string[];
  sector: string[];
  keyword: string;
  status: string[];

  global_search: string[];
};

type ProposalCounts = {
  Environment: number;
  Social: number;
  Governance: number;
  Compensation: number;
};

export interface Subcategory {
  sub_category: string;
  count: number;
}

export interface TopSubcategories {
  Environment?: Subcategory[];
  Social?: Subcategory[];
  Governance?: Subcategory[];
  Compensation?: Subcategory[];
}


export interface SharedHolderPrposal {
  shareHolderProposal: any[];
  getSingleShareHolder: any | null;
  totalShareHolderNoAction: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  tab: "proposal" | "no-action" | "withdrawn" | "";

  proposalCount: number;
  withdrawnCount: number;
  noActionCount: number;
  filters: SharedHolderFiltersType;
  isAllCompanySelected: boolean;
  shareHolderFilterOption: {
    category: string[];
  };

  proposalCounts: {
    [key: string]: number;
  };
  topSubcategories: {
    [key: string]: any[];
  };

  topCategories: any[];
  yearlySummary: any[];
  topProponents: any[];
  pieChartOutcome: any
}



const initialState: SharedHolderPrposal = {
  shareHolderProposal: [],
  getSingleShareHolder: null,
  totalShareHolderNoAction: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,

  tab: "proposal",
  isAllCompanySelected: false,
  filters: {
    proponent_name: [],
    year: [],
    category: [],
    sub_category: [],
    sector: [],
    keyword: "",
    status: [],

    global_search: [],
  },
  proposalCount: 0,
  withdrawnCount: 0,
  noActionCount: 0,
  shareHolderFilterOption: {
    category: [
      "Corporate Governance",
      "Environmental",
      "Executive Compensation",
      "Social",
    ],
  },
  proposalCounts: {
    Environment: 0,
    Social: 0,
    Governance: 0,
    Compensation: 0,
  },
  topCategories: [],
  topSubcategories: {
    Environment: [],
    Social: [],
    Governance: [],
    Compensation: [],
  },
  yearlySummary: [],
  topProponents: [],
  pieChartOutcome: {}
};

export const fetchShareHolderProposal = createAsyncThunk<
  {
    count: number;
    results: any[];
    proposalCount: number;
    withdrawnCount: number;
    noActionCount: number;
    proposalCounts: {
      [key: string]: number;
    };
    topSubcategories: {
      [key: string]: any[];
    };
    topCategories: any[];
    yearlySummary: any[];
    topProponents: any[];
    pieChartOutcome: any
  },
  string
>(`${name}`, async (url: string) => {
  return await shareHolderProposalService.getShareHolderProposal(url);
});

export const getSingleShareHolderData = createAsyncThunk<
  { results: any },
  { url: string; id: number }
>(`${name}/getSingleShareHolder`, async ({ url, id }) => {
  return await shareHolderProposalService.getSingleShareHolder(url, id);
});

export const addEditNewShareHolder = createAsyncThunk<
  { results: AddShareholderType },
  any
>(`${name}/addEditNewShareHolder`, async ({ id, data }) => {
  let response;
  if (id) {
    response = await shareHolderProposalService.updateNewShareHolder(id, data);
  } else {
    response = await shareHolderProposalService.addNewShareHolder(data);
  }
  return response;
});

export const addEditNewWithdrawn = createAsyncThunk<
  { results: AddWithdrawnType },
  any
>(`${name}/addEditNewWithdrawn`, async ({ id, data }) => {
  let response;
  if (id) {
    response = await shareHolderProposalService.updateNewWithdrawn(id, data);
  } else {
    response = await shareHolderProposalService.AddNewWithdrawn(data);
  }
  return response;
});

export const addEditNewNoAction = createAsyncThunk<
  { results: AddNoActionType },
  any
>(`${name}/addEditNewNoAction`, async ({ id, data }) => {
  let response;
  if (id) {
    response = await shareHolderProposalService.updateNoAction(id, data);
  } else {
    response = await shareHolderProposalService.AddNewNoAction(data);
  }
  return response;
});

const shareHolderProposal = createSlice({
  name,
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetPage(state) {
      state.page = 1;
    },
    setTabs(
      state,
      action: PayloadAction<"proposal" | "no-action" | "withdrawn" | "">
    ) {
      state.tab = action.payload;
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

    selectUnSelectAllCompany(state, action: PayloadAction<boolean>) {
      state.isAllCompanySelected = action.payload;
      if (action.payload === false) {
        state.page = 1;
      }
    },

    setAllFilters(
      state,
      action: PayloadAction<Partial<SharedHolderFiltersType>>
    ) {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetShareholderProposal(state) {
      state.filters = initialState.filters;
      state.page = 1;
      state.isAllCompanySelected = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchShareHolderProposal.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.totalShareHolderNoAction = 0;
      })
      .addCase(
        fetchShareHolderProposal.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
            proposalCount: number;
            withdrawnCount: number;
            noActionCount: number;
            topCategories: any[];
            proposalCounts: {
              [key: string]: number;
            };
            topSubcategories: {
              [key: string]: any[];
            };
            yearlySummary: any[];
            topProponents: any[];
            pieChartOutcome: any
          }>
        ) => {
          state.loading = false;
          state.shareHolderProposal = action.payload.results;
          state.totalShareHolderNoAction = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
          state.topCategories = action.payload.topCategories
          state.topSubcategories = action.payload.topSubcategories;
          state.yearlySummary = action.payload.yearlySummary;
          state.proposalCounts = action.payload.proposalCounts;
          state.topProponents = action.payload.topProponents;
          state.pieChartOutcome = action.payload.pieChartOutcome;
          // state.proposalCount = action?.payload?.proposalCount  ?? 0;
          // state.withdrawnCount = action?.payload?.withdrawnCount ?? 0;
          // state.noActionCount = action?.payload?.noActionCount ?? 0;
        }
      )
      .addCase(fetchShareHolderProposal.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch voting guidelines";
        state.totalShareHolderNoAction = 0;
      })
      .addCase(getSingleShareHolderData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getSingleShareHolderData.fulfilled,
        (
          state,
          action: PayloadAction<{
            results: ShareHolderData;
          }>
        ) => {
          state.loading = false;
          state.getSingleShareHolder = action.payload.results;
        }
      )
      .addCase(getSingleShareHolderData.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch engagement questions";
      });
    // .addCase(addNewShareHolder.pending, (state) => {
    //   state.loading = true;
    //   state.error = null;
    // })
    // .addCase(addNewShareHolder.fulfilled, (state) => {
    //   state.loading = false;
    // })
    // .addCase(addNewShareHolder.rejected, (state, action) => {
    //   state.loading = false;
    //   state.error =
    //     action.error.message || "Failed to fetch investers profile";
    // });
  },
});

export default shareHolderProposal;
export const {
  setPage,
  resetPage, //resetFilter
  setTabs,
  setAllFilters,
  setFilter,
  selectUnSelectAllCompany,
  resetFilter,
  resetShareholderProposal,
} = shareHolderProposal.actions;
