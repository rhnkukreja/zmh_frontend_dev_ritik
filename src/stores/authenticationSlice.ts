// store/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  LoginRequestDTO,
  SendOtpDTO,
  SignUpRequestDTO,
  VerifyOtpDTO,
  VerifySignUpOtpDTO,
} from "../services/authentiction/auth.type";
import { userService } from "../services/authentiction";
import { Login, OTP, Register, verifiedOTP, verifiedSignUpOTP } from "@/types/users";
import { persistor } from "./store";

const name = "authentication";

export interface Finhub {
  name: string;
  ticker: string;
  country: string;
  exchange: string;
  finnhub_industry: string;
  share_outstanding: number;
  phone: string;
  logo: string;
}

interface AuthState {
  user: Login | null;
  loading: boolean;
  error: string | null;
  companyGlobalSearchName: string;
  companyGlobalSearchId: number | undefined;
  companyGlobalSearchTicker: string | undefined;
  finhub: Finhub | null;
  isCompanySelected: boolean
}

const initialState: AuthState = {
  user: null,
  loading: false,
  companyGlobalSearchName: "",
  companyGlobalSearchId: undefined,
  companyGlobalSearchTicker: undefined,
  error: null,
  finhub: null,
  isCompanySelected: false
};

export const signUp = createAsyncThunk<Register, SignUpRequestDTO>(
  `${name}/signUp`,
  async (userRequest: SignUpRequestDTO) => {
    return (await userService.signUp(userRequest)) as Register;
  }
);
export const VerifySignUpOtp = createAsyncThunk<verifiedSignUpOTP ,VerifySignUpOtpDTO >(
  `${name}/verifySignUpOtp`,
  async (userRequest: VerifySignUpOtpDTO) => {
    return (await userService.verifySignUpOtp(userRequest)) as verifiedSignUpOTP;
  }
);
export const sendOtp = createAsyncThunk<OTP, SendOtpDTO>(
  `${name}/sendOtp`,
  async (userRequest: SendOtpDTO) => {
    return (await userService.sendOtp(userRequest)) as OTP;
  }
);
export const verifyOtp = createAsyncThunk<verifiedOTP, VerifyOtpDTO>(
  `${name}/verifyOtp`,
  async (userRequest: VerifyOtpDTO) => {
    return (await userService.verifyOtp(userRequest)) as verifiedOTP;
  }
);
export const login = createAsyncThunk<Login, LoginRequestDTO>(
  `${name}/login`,
  async (userRequest: LoginRequestDTO) => {
    return (await userService.login(userRequest)) as Login;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setDashboardGlobalSearch(
      state,
      action: PayloadAction<{
        name: string;
        id: number;
        ticker: string;
      }>
    ) {
      state.companyGlobalSearchName = action.payload.name;
      state.companyGlobalSearchId = action.payload.id;
      state.companyGlobalSearchTicker = action.payload.ticker;
    },
    setFinhub(state, action: PayloadAction<Finhub>) {
      state.finhub = action.payload;
    },
    setIsCompanySelected(state, action: PayloadAction<boolean>) {
      state.isCompanySelected = action.payload;
    },
    logout(state) {
      state.user = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem("token");
      localStorage.clear();
      persistor.purge();
    },

    setSavedSearch(state, action: PayloadAction<{ key: string; value: any }>) {
      if (state?.user) {
        const updatedSearch = {
          ...state.user.saved_search,
          [action.payload.key]: action.payload.value,
        };
        state.user.saved_search = updatedSearch;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action: PayloadAction<Register>) => {
        state.loading = false;
        localStorage.setItem("userType", action.payload.user_type);
      })
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to sign up";
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<Login>) => {
        state.loading = false;
        state.user = action.payload;
        localStorage.setItem("userType", action.payload.user_type);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to log in";
      })
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state, action) => {
        state.loading = false;

      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to send OTP";
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;

      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to verify OTP";
      })
      .addCase(VerifySignUpOtp.pending, (state) => {
       state.loading = true;
       state.error = null;
      })
      .addCase(VerifySignUpOtp.fulfilled, (state, action: PayloadAction<verifiedSignUpOTP>) => {
       state.loading = false;
 
       })
      .addCase(VerifySignUpOtp.rejected, (state, action) => {
       state.loading = false;
       state.error = action.error.message || "Failed to verify signup OTP";
      })

  },
});

export const { logout, setSavedSearch, setDashboardGlobalSearch, setFinhub, setIsCompanySelected } =
  authSlice.actions;

export default authSlice;
