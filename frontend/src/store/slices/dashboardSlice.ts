import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardAPI } from '@/services/api';

interface DashboardStats {
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
    const response = await dashboardAPI.getStatistics();
    return response.data;
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
        state.statistics = action.payload;
      })
      .addCase(fetchStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载失败';
      });
  },
});

export default dashboardSlice.reducer;
