import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/login', { username, password }),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: (username: string) =>
    apiClient.get('/auth/current', { params: { username } }),
};

export const dashboardAPI = {
  getStatistics: () => apiClient.get('/dashboard/statistics'),
  getMapStats: () => apiClient.get('/dashboard/map-stats'),
};

export const personAPI = {
  getPersonList: (page: number, size: number) =>
    apiClient.get('/persons', { params: { page, size } }),
  getPersonDetail: (personId: string) =>
    apiClient.get(`/persons/${personId}`),
  getTags: () => apiClient.get('/persons/tags'),
  getPersonListByTag: (tag: string, page: number, size: number) =>
    apiClient.get('/persons/by-tag', { params: { tag, page, size } }),
};

/** 重点人员类别（全部 + 目录） */
export interface KeyPersonCategory {
  id: string;
  name: string;
  count: number;
}

export const keyPersonLibraryAPI = {
  getDirectories: () => apiClient.get('/key-person-library/directories'),
  getCategories: () => apiClient.get('/key-person-library/categories'),
  getPersonsByCategory: (categoryId: string, page: number, size: number) =>
    apiClient.get('/key-person-library/persons', { params: { categoryId, page, size } }),
  getPersonsByDirectory: (directoryId: number, page: number, size: number) =>
    apiClient.get(`/key-person-library/directories/${directoryId}/persons`, { params: { page, size } }),
  removePersonFromDirectory: (directoryId: number, personId: string) =>
    apiClient.delete(`/key-person-library/directories/${directoryId}/persons/${personId}`),
};

export const newsAPI = {
  getNewsList: (page: number, size: number, keyword?: string) =>
    apiClient.get('/news', { params: { page, size, keyword } }),
  getNewsDetail: (newsId: string) => apiClient.get(`/news/${newsId}`),
  getNewsAnalysis: () => apiClient.get('/news/analysis'),
};

export const socialAPI = {
  getSocialList: (page: number, size: number, platform?: string) =>
    apiClient.get('/social-dynamics', { params: { page, size, platform } }),
  getSocialAnalysis: () => apiClient.get('/social-dynamics/analysis'),
};

/** 人员档案导入融合：上传、任务列表、任务详情、确认导入 */
export const archiveFusionAPI = {
  createTask: (formData: FormData) =>
    apiClient.post('/workspace/archive-fusion/tasks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  /** 批量上传：FormData 中多个 file 使用 key「files」 */
  batchCreateTasks: (formData: FormData) =>
    apiClient.post('/workspace/archive-fusion/tasks/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
    }),
  listTasks: (params: { creatorUserId?: number; page?: number; size?: number }) =>
    apiClient.get('/workspace/archive-fusion/tasks', { params }),
  getTaskDetail: (taskId: string) =>
    apiClient.get(`/workspace/archive-fusion/tasks/${taskId}`),
  confirmImport: (taskId: string, resultIds: string[]) =>
    apiClient.post<{ data?: string[] }>(`/workspace/archive-fusion/tasks/${taskId}/confirm-import`, { resultIds }),
};

export default apiClient;
