// store/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  LoginRequestDTO,
  SignUpRequestDTO,
} from "../services/authentiction/auth.type";
import { userService } from "../services/authentiction";
import { Login, Register } from "@/types/users";
import { persistor } from "./store";

const name = "authentication";

interface AuthState {
  user: Login | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

export const signUp = createAsyncThunk<Register, SignUpRequestDTO>(
  `${name}/signUp`,
  async (userRequest: SignUpRequestDTO) => {
    return (await userService.signUp(userRequest)) as Register;
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
    logout(state) {
      state.user = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem("token");
      localStorage.clear();
      persistor.purge();
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
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice;
