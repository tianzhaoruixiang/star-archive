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

export const keyPersonLibraryAPI = {
  getDirectories: () => apiClient.get('/key-person-library/directories'),
  getPersonsByDirectory: (directoryId: number, page: number, size: number) =>
    apiClient.get(`/key-person-library/directories/${directoryId}/persons`, { params: { page, size } }),
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

export default apiClient;
