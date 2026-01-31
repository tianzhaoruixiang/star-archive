import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { personAPI } from '@/services/api';
import type { PersonDetailData } from '@/types/person';

interface PersonState {
  list: any[];
  detail: PersonDetailData | null;
  tags: any[];
  tagsLoading: boolean;
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
  tagsLoading: false,
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
    const response = await personAPI.getPersonList(page, size) as { data?: { content?: unknown[]; page?: number; size?: number; totalElements?: number } };
    return response?.data ?? response;
  }
);

export const fetchPersonDetail = createAsyncThunk(
  'person/fetchDetail',
  async (personId: string) => {
    const response = await personAPI.getPersonDetail(personId) as { data?: unknown };
    return response?.data ?? response;
  }
);

export const fetchTags = createAsyncThunk('person/fetchTags', async () => {
  const response = await personAPI.getTags() as { data?: unknown };
  return response?.data ?? response;
});

export const fetchPersonListByTag = createAsyncThunk(
  'person/fetchListByTag',
  async ({ tag, page, size }: { tag: string; page: number; size: number }) => {
    const response = await personAPI.getPersonListByTags([tag], page, size) as { data?: { content?: unknown[]; page?: number; size?: number; totalElements?: number } };
    return response?.data ?? response;
  }
);

export const fetchPersonListByTags = createAsyncThunk(
  'person/fetchListByTags',
  async ({ tags, page, size }: { tags: string[]; page: number; size: number }) => {
    const response = await personAPI.getPersonListByTags(tags, page, size) as { data?: { content?: unknown[]; page?: number; size?: number; totalElements?: number } };
    return response?.data ?? response;
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
      .addCase(fetchPersonDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.detail = action.payload;
      })
      .addCase(fetchPersonDetail.rejected, (state, action) => {
        state.loading = false;
        state.detail = null;
        state.error = action.error.message || '加载失败';
      })
      .addCase(fetchTags.pending, (state) => {
        state.tagsLoading = true;
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.tagsLoading = false;
        state.tags = action.payload;
      })
      .addCase(fetchTags.rejected, (state) => {
        state.tagsLoading = false;
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
      })
      .addCase(fetchPersonListByTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonListByTags.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.content;
        state.pagination = {
          page: action.payload.page,
          size: action.payload.size,
          total: action.payload.totalElements,
        };
      })
      .addCase(fetchPersonListByTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载失败';
      });
  },
});

export default personSlice.reducer;
