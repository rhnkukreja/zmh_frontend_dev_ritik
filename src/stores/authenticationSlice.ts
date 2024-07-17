// store/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  LoginRequestDTO,
  UserResponseDTO,
  SignUpRequestDTO
} from "../services/authentiction/auth.type";
import { userService } from "../services/authentiction";

const name = "authentication";

interface AuthState {
  user: UserResponseDTO | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

export const signUp = createAsyncThunk<UserResponseDTO, SignUpRequestDTO>(
  `${name}/signUp`,
  async (userRequest: SignUpRequestDTO) => {
    return await userService.signUp(userRequest);
  }
);

export const login = createAsyncThunk<UserResponseDTO, LoginRequestDTO>(
  `${name}/login`,
  async (userRequest: LoginRequestDTO) => {
    return await userService.login(userRequest);
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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signUp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        signUp.fulfilled,
        (state, action: PayloadAction<UserResponseDTO>) => {
          state.loading = false;
          state.user = action.payload;
        }
      )
      .addCase(signUp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to sign up";
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        login.fulfilled,
        (state, action: PayloadAction<UserResponseDTO>) => {
          state.loading = false;
          state.user = action.payload;
        }
      )
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to log in";
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;
