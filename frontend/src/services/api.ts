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

/** 机构/排行项（name=机构名, value=人数） */
export interface OrganizationRankItem {
  name: string;
  value: number;
}

/** 签证类型排行项（name=签证类型, value=行程数） */
export type VisaTypeRankItem = OrganizationRankItem;

/** 省份排行项（name=省份, value=数量） */
export type ProvinceRankItem = OrganizationRankItem;

/** 各地排名（全部 / 昨日新增 / 昨日流出 / 驻留） */
export interface ProvinceRanksDTO {
  all: ProvinceRankItem[];
  yesterdayArrival: ProvinceRankItem[];
  yesterdayDeparture: ProvinceRankItem[];
  stay: ProvinceRankItem[];
}

/** 人物行程趋势（按日、按类型） */
export interface TravelTrendSeriesItem {
  name: string;
  data: number[];
}

export interface TravelTrendDTO {
  dates: string[];
  series: TravelTrendSeriesItem[];
}

/** 省份下钻统计（人物分布） */
export interface ProvinceStatsRankItem {
  name: string;
  value: number;
}

export interface ProvinceStatsDTO {
  totalPersonCount: number;
  travelRecordCount: number;
  visaTypeRank: ProvinceStatsRankItem[];
  organizationRank: ProvinceStatsRankItem[];
  belongingGroupRank: ProvinceStatsRankItem[];
}

export const dashboardAPI = {
  getStatistics: () => apiClient.get('/dashboard/statistics'),
  getMapStats: () => apiClient.get('/dashboard/map-stats'),
  getOrganizationTop15: () => apiClient.get<OrganizationRankItem[]>('/dashboard/organization-top15'),
  getVisaTypeTop15: () => apiClient.get<VisaTypeRankItem[]>('/dashboard/visa-type-top15'),
  getProvinceRanks: () => apiClient.get<ProvinceRanksDTO>('/dashboard/province-ranks'),
  getTravelTrend: (days?: number) =>
    apiClient.get<TravelTrendDTO>('/dashboard/travel-trend', { params: { days: days ?? 14 } }),
  getGroupCategoryStats: () => apiClient.get<OrganizationRankItem[]>('/dashboard/group-category-stats'),
  getProvinceStats: (provinceName: string) =>
    apiClient.get<ProvinceStatsDTO>(`/dashboard/province/${encodeURIComponent(provinceName)}/stats`),
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

/** 系统配置（系统名称、Logo、前端 base URL、各导航显示隐藏） */
export interface SystemConfigDTO {
  systemName?: string;
  systemLogoUrl?: string;
  frontendBaseUrl?: string;
  navDashboard?: boolean;
  navPersons?: boolean;
  navKeyPersonLibrary?: boolean;
  navWorkspace?: boolean;
  navModelManagement?: boolean;
  navSituation?: boolean;
  navSystemConfig?: boolean;
}

export const systemConfigAPI = {
  getPublicConfig: () => apiClient.get<SystemConfigDTO>('/system-config/public'),
  getConfig: () => apiClient.get<SystemConfigDTO>('/system-config'),
  updateConfig: (dto: SystemConfigDTO) => apiClient.put<SystemConfigDTO>('/system-config', dto),
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
