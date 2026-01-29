import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { personAPI } from '@/services/api';

interface PersonState {
  list: any[];
  detail: any | null;
  tags: any[];
  pagination: {
    page: number;
    size: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

const initialState: PersonState = {
  list: [],
  detail: null,
  tags: [],
  pagination: {
    page: 0,
    size: 20,
    total: 0,
  },
  loading: false,
  error: null,
};

export const fetchPersonList = createAsyncThunk(
  'person/fetchList',
  async ({ page, size }: { page: number; size: number }) => {
    const response = await personAPI.getPersonList(page, size);
    return response.data;
  }
);

export const fetchPersonDetail = createAsyncThunk(
  'person/fetchDetail',
  async (personId: string) => {
    const response = await personAPI.getPersonDetail(personId);
    return response.data;
  }
);

export const fetchTags = createAsyncThunk('person/fetchTags', async () => {
  const response = await personAPI.getTags();
  return response.data;
});

export const fetchPersonListByTag = createAsyncThunk(
  'person/fetchListByTag',
  async ({ tag, page, size }: { tag: string; page: number; size: number }) => {
    const response = await personAPI.getPersonListByTag(tag, page, size);
    return response.data;
  }
);

const personSlice = createSlice({
  name: 'person',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPersonList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonList.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.content;
        state.pagination = {
          page: action.payload.page,
          size: action.payload.size,
          total: action.payload.totalElements,
        };
      })
      .addCase(fetchPersonList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载失败';
      })
      .addCase(fetchPersonDetail.fulfilled, (state, action) => {
        state.detail = action.payload;
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.tags = action.payload;
      })
      .addCase(fetchPersonListByTag.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonListByTag.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.content;
        state.pagination = {
          page: action.payload.page,
          size: action.payload.size,
          total: action.payload.totalElements,
        };
      })
      .addCase(fetchPersonListByTag.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载失败';
      });
  },
});

export default personSlice.reducer;
