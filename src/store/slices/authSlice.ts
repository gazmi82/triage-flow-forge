import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { mockApi, type AuthPayload, type Role } from "@/data/mockData";

const SESSION_KEY = "triage.auth.user";

interface AuthState {
  user: AuthPayload | null;
  isLoading: boolean;
  error: string | null;
}

const getStoredUser = (): AuthPayload | null => {
  if (typeof window === "undefined" || typeof window.localStorage?.getItem !== "function") {
    return null;
  }
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthPayload;
  } catch {
    return null;
  }
};

const setStoredUser = (value: AuthPayload) => {
  if (typeof window === "undefined" || typeof window.localStorage?.setItem !== "function") {
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(value));
};

const clearStoredUser = () => {
  if (typeof window === "undefined" || typeof window.localStorage?.removeItem !== "function") {
    return;
  }
  window.localStorage.removeItem(SESSION_KEY);
};

const initialState: AuthState = {
  user: getStoredUser(),
  isLoading: false,
  error: null,
};

export const loginThunk = createAsyncThunk<AuthPayload, { email: string; password: string }, { rejectValue: string }>(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      return await mockApi.login(payload.email, payload.password);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }
);

export const registerThunk = createAsyncThunk<
  AuthPayload,
  { name: string; email: string; password: string; role: Role; department: string },
  { rejectValue: string }
>("auth/register", async (payload, { rejectWithValue }) => {
  try {
    return await mockApi.register(payload);
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Unable to register.");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.error = null;
      clearStoredUser();
    },
    clearAuthError(state) {
      state.error = null;
    },
    restoreSession(state, action: PayloadAction<AuthPayload | null>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        setStoredUser(action.payload);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unable to sign in.";
      })
      .addCase(registerThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        setStoredUser(action.payload);
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unable to register.";
      });
  },
});

export const { logout, clearAuthError, restoreSession } = authSlice.actions;
export default authSlice.reducer;
