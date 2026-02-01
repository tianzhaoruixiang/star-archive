import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '@/services/api';
import { getStoredAuthUsername, setStoredAuthUsername } from '@/utils/authStorage';

export { getStoredAuthUsername } from '@/utils/authStorage';

interface AuthState {
  isAuthenticated: boolean;
  user: { username: string; role: string; userId?: number } | null;
  loading: boolean;
  restoring: boolean;
  /** 是否已尝试过恢复会话（用于刷新后仅在没有用户时重定向一次） */
  restoreAttempted: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  restoring: false,
  restoreAttempted: false,
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

/** 从后端恢复当前用户（刷新后调用，依赖 sessionStorage 中的 username） */
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    const username = getStoredAuthUsername();
    if (!username) {
      return rejectWithValue('no_stored_user');
    }
    const response = (await authAPI.getCurrentUser(username)) as {
      result?: string;
      data?: { username: string; role: string; userId?: number };
    };
    if (response?.result !== 'SUCCESS' || !response?.data) {
      return rejectWithValue('invalid_session');
    }
    return response.data;
  }
);

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
        setStoredAuthUsername(action.payload.username);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || '登录失败';
      })
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        setStoredAuthUsername(null);
      })
      .addCase(restoreSession.pending, (state) => {
        state.restoring = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.restoring = false;
        state.restoreAttempted = true;
        state.isAuthenticated = true;
        state.user = action.payload;
        setStoredAuthUsername(action.payload.username);
      })
      .addCase(restoreSession.rejected, (state) => {
        state.restoring = false;
        state.restoreAttempted = true;
        setStoredAuthUsername(null);
      });
  },
});

export default authSlice.reducer;
