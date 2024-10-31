import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { proxyVotingGuidelineService } from "@/services/proxyVotingGuideline";
import { ProxyVotingGuideline } from "@/types/proxyVotingGuideline";
import { getPageNumbers } from "@/utils/helper";
import { userDetailService } from "@/services/userDetail";

const name = "userDetail";

interface UserDetailSlice {
  userDetailList: any[];
  totaluserDetail: number;
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  //   guidelineFilterOptions: {
  //     year: string[];
  //   };
  filters: {
    year: string;
    institution_name: string[];
  };
}

const initialState: UserDetailSlice = {
  userDetailList: [],
  totaluserDetail: 0,
  loading: false,
  error: null,
  totalPages: 1,
  page: 1,
  //   guidelineFilterOptions: {
  //     year: ["ALL", "2023", "2024"],
  //   },
  filters: {
    year: "",
    institution_name: [],
  },
};

export const fetchUserDetail = createAsyncThunk<
  { count: number; results: ProxyVotingGuideline[] },
  string
>(`${name}/fetchUserDetail`, async (url: string) => {
  return await userDetailService.getUserDetail(url);
});

const UserDetailSlice = createSlice({
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
      state.filters = {
        year: "",
        institution_name: [],
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchUserDetail.fulfilled,
        (
          state,
          action: PayloadAction<{
            count: number;
            results: any[];
          }>
        ) => {
          state.loading = false;
          state.userDetailList = action.payload.results;
          state.totaluserDetail = action.payload.count;
          state.totalPages = getPageNumbers(action.payload.count);
        }
      )
      .addCase(fetchUserDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch user detail";
      });
  },
});

export default UserDetailSlice;
export const { setPage, resetPage, setFilter, resetFilter } =
  UserDetailSlice.actions;
