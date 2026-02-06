import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { personAPI, type PersonListFilter } from '@/services/api';
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
    size: 16,
    total: 0,
  },
  loading: false,
  error: null,
};

/** 分页数据结构（与后端 PageResponse 一致） */
interface PagePayload {
  content?: unknown[];
  page?: number;
  size?: number;
  totalElements?: number;
}

function toPagePayload(response: unknown): PagePayload {
  const data = response && typeof response === 'object' && 'data' in response
    ? (response as { data?: PagePayload }).data
    : (response as PagePayload);
  if (data && typeof data === 'object') return data;
  return { content: [], page: 0, size: 16, totalElements: 0 };
}

export const fetchPersonList = createAsyncThunk(
  'person/fetchList',
  async ({ page, size, filter }: { page: number; size: number; filter?: PersonListFilter }) => {
    const response = await personAPI.getPersonList(page, size, filter);
    return toPagePayload(response);
  }
);

export const fetchPersonDetail = createAsyncThunk(
  'person/fetchDetail',
  async (personId: string) => {
    const response = await personAPI.getPersonDetail(personId) as { data?: unknown };
    return response?.data ?? response ?? null;
  }
);

export const fetchTags = createAsyncThunk('person/fetchTags', async () => {
  const response = await personAPI.getTags() as { data?: unknown };
  const raw = response?.data ?? response;
  return Array.isArray(raw) ? raw : [];
});

export const fetchPersonListByTag = createAsyncThunk(
  'person/fetchListByTag',
  async ({ tag, page, size }: { tag: string; page: number; size: number }) => {
    const response = await personAPI.getPersonListByTags([tag], page, size);
    return toPagePayload(response);
  }
);

export const fetchPersonListByTags = createAsyncThunk(
  'person/fetchListByTags',
  async ({ tags, page, size }: { tags: string[]; page: number; size: number }) => {
    const response = await personAPI.getPersonListByTags(tags, page, size);
    return toPagePayload(response);
  }
);

// @ts-ignore
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
        const p = action.payload as PagePayload;
        state.list = Array.isArray(p?.content) ? p.content : [];
        state.pagination = {
          page: typeof p?.page === 'number' ? p.page : 0,
          size: typeof p?.size === 'number' ? p.size : 20,
          total: typeof p?.totalElements === 'number' ? p.totalElements : 0,
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
        state.detail = action.payload ?? null;
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
        state.tags = Array.isArray(action.payload) ? action.payload : [];
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
        const p = action.payload as PagePayload;
        state.list = Array.isArray(p?.content) ? p.content : [];
        state.pagination = {
          page: typeof p?.page === 'number' ? p.page : 0,
          size: typeof p?.size === 'number' ? p.size : 20,
          total: typeof p?.totalElements === 'number' ? p.totalElements : 0,
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
        const p = action.payload as PagePayload;
        state.list = Array.isArray(p?.content) ? p.content : [];
        state.pagination = {
          page: typeof p?.page === 'number' ? p.page : 0,
          size: typeof p?.size === 'number' ? p.size : 20,
          total: typeof p?.totalElements === 'number' ? p.totalElements : 0,
        };
      })
      .addCase(fetchPersonListByTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '加载失败';
      });
  },
});

export default personSlice.reducer;
