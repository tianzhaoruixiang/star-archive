import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardAPI } from '@/services/api';

export interface DashboardStats {
  totalPersonCount: number;
  keyPersonCount: number;
  todayNewsCount: number;
  todaySocialDynamicCount: number;
}

interface DashboardState {
  statistics: DashboardStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  statistics: null,
  loading: false,
  error: null,
};

export const fetchStatistics = createAsyncThunk(
  'dashboard/fetchStatistics',
  async () => {
    const response = await dashboardAPI.getStatistics() as { data?: DashboardStats };
    return response?.data ?? response;
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStatistics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStatistics.fulfilled, (state, action) => {
        state.loading = false;
        // 保证类型安全，只允许 DashboardStats 或 null
        if (
          action.payload &&
          typeof action.payload === 'object' &&
          'totalPersonCount' in action.payload &&
          'keyPersonCount' in action.payload &&
          'todayNewsCount' in action.payload &&
          'todaySocialDynamicCount' in action.payload
        ) {
          state.statistics = action.payload as DashboardStats;
        } else {
          state.statistics = null;
        }
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载失败';
      });
  },
});

export default dashboardSlice.reducer;
