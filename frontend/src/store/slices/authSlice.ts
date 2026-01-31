import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '@/services/api';

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string; role: string } | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (
    { username, password }: { username: string; password: string },
    { rejectWithValue }
  ) => {
    const response = (await authAPI.login(username, password)) as {
      result?: string;
      message?: string;
      data?: { username: string; role: string; userId?: number };
    };
    if (response?.result !== 'SUCCESS' || !response?.data) {
      return rejectWithValue(response?.message ?? '用户名或密码错误');
    }
    return response.data;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authAPI.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || '登录失败';
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export default authSlice.reducer;
