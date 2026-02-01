import axios from 'axios';
import type { OnlyOfficePreviewConfigDTO } from '@/types/archiveFusion';
import { getStoredAuthUsername } from '@/utils/authStorage';

/** 前端与 API 统一前缀 */
export const BASE_PATH = '/littlesmall';

const apiClient = axios.create({
  baseURL: '/littlesmall/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** 当前登录用户名，用于档案可见性（公开档案所有人可见，私有档案仅创建人可见） */
let apiUsername: string | null = null;
export function setApiUsername(username: string | null) {
  apiUsername = username ?? null;
}

/** 每次请求前确保 X-Username：优先用内存中的 apiUsername，刷新后未恢复 Redux 时从 sessionStorage 同步，避免首轮请求无用户信息 */
apiClient.interceptors.request.use((config) => {
  let username = apiUsername;
  if (!username) {
    const stored = getStoredAuthUsername();
    if (stored) {
      apiUsername = stored;
      username = stored;
    }
  }
  if (username) {
    config.headers['X-Username'] = username;
  }
  return config;
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
  /** 城市分布排名（该省行程按到达城市统计） */
  cityRank?: ProvinceStatsRankItem[];
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

/** 人员档案更新请求体（与后端 PersonUpdateDTO 对应，字段可选） */
export interface PersonUpdatePayload {
  chineseName?: string;
  originalName?: string;
  aliasNames?: string[];
  organization?: string;
  belongingGroup?: string;
  gender?: string;
  birthDate?: string | null;
  nationality?: string;
  nationalityCode?: string;
  householdAddress?: string;
  highestEducation?: string;
  phoneNumbers?: string[];
  emails?: string[];
  passportNumbers?: string[];
  idCardNumber?: string;
  visaType?: string;
  visaNumber?: string;
  personTags?: string[];
  workExperience?: string;
  educationExperience?: string;
  remark?: string;
  isKeyPerson?: boolean;
  /** 是否公开档案：true 所有人可见，false 仅创建人可见 */
  isPublic?: boolean;
}

/** 编辑历史变更项 */
export interface PersonEditHistoryChangeItem {
  field: string;
  label: string;
  oldVal: string;
  newVal: string;
}

/** 编辑历史记录 */
export interface PersonEditHistoryItem {
  historyId: string;
  personId: string;
  editTime: string;
  editor?: string;
  changes: PersonEditHistoryChangeItem[];
}

/** 人员列表筛选（可选；目的地省份可与 destinationCity/visaType/organization/belongingGroup 组合） */
export interface PersonListFilter {
  isKeyPerson?: boolean;
  organization?: string;
  visaType?: string;
  belongingGroup?: string;
  /** 目的地省份（有该省行程的人员） */
  destinationProvince?: string;
  /** 目的地城市（须与 destinationProvince 同时使用） */
  destinationCity?: string;
}

export const personAPI = {
  getPersonList: (page: number, size: number, filter?: PersonListFilter) =>
    apiClient.get('/persons', {
      params: {
        page,
        size,
        ...(filter?.isKeyPerson !== undefined && { isKeyPerson: filter.isKeyPerson }),
        ...(filter?.organization && { organization: filter.organization }),
        ...(filter?.visaType && { visaType: filter.visaType }),
        ...(filter?.belongingGroup && { belongingGroup: filter.belongingGroup }),
        ...(filter?.destinationProvince && { destinationProvince: filter.destinationProvince }),
        ...(filter?.destinationCity && { destinationCity: filter.destinationCity }),
      },
    }),
  getPersonDetail: (personId: string) =>
    apiClient.get(`/persons/${personId}`),
  updatePerson: (personId: string, data: PersonUpdatePayload, editor?: string) =>
    apiClient.put(`/persons/${personId}`, data, {
      headers: editor ? { 'X-Editor': editor } : undefined,
    }),
  getEditHistory: (personId: string) =>
    apiClient.get<PersonEditHistoryItem[]>(`/persons/${personId}/edit-history`),
  getTags: () => apiClient.get('/persons/tags'),
  createTag: (dto: TagCreateDTO) => apiClient.post<TagDTO>('/persons/tags', dto),
  deleteTag: (tagId: number) => apiClient.delete(`/persons/tags/${tagId}`),
  getPersonListByTag: (tag: string, page: number, size: number) =>
    apiClient.get('/persons/by-tag', { params: { tag, page, size } }),
  getPersonListByTags: (tags: string[], page: number, size: number) =>
    apiClient.get('/persons/by-tags', { params: { tags: tags.join(','), page, size } }),
};

/** 人物标签（与后端 TagDTO 一致，用于标签管理） */
export interface TagDTO {
  tagId: number;
  firstLevelName?: string;
  secondLevelName?: string;
  tagName: string;
  tagDescription?: string;
  parentTagId?: number;
  firstLevelSortOrder?: number;
  personCount?: number;
  children?: TagDTO[];
}

/** 新增人物标签请求体 */
export interface TagCreateDTO {
  firstLevelName?: string;
  secondLevelName?: string;
  tagName: string;
  tagDescription?: string;
  firstLevelSortOrder?: number;
}

/** 重点人员类别（单个目录项） */
export interface KeyPersonCategory {
  id: string;
  name: string;
  count: number;
}

/** 重点人员类别接口响应：allCount + 目录列表（不含「全部」，由前端单独展示） */
export interface KeyPersonCategoriesResponse {
  allCount: number;
  categories: KeyPersonCategory[];
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

/** 新闻列表项/详情（与后端 NewsDTO 对应） */
export interface NewsItem {
  newsId: string;
  mediaName?: string;
  title?: string;
  content?: string;
  authors?: string[];
  publishTime?: string | number | number[];
  tags?: string[];
  originalUrl?: string;
  category?: string;
}

export const newsAPI = {
  getNewsList: (page: number, size: number, keyword?: string) =>
    apiClient.get('/news', { params: { page, size, keyword } }),
  getNewsDetail: (newsId: string) => apiClient.get<NewsItem>(`/news/${newsId}`),
  getNewsAnalysis: () => apiClient.get('/news/analysis'),
};

export const socialAPI = {
  getSocialList: (page: number, size: number, platform?: string) =>
    apiClient.get('/social-dynamics', { params: { page, size, platform } }),
  getSocialAnalysis: () => apiClient.get('/social-dynamics/analysis'),
};

/** 系统配置（系统名称、Logo、前端 base URL、各导航显示隐藏、人物档案融合大模型配置） */
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
  showPersonDetailEdit?: boolean;
  /** 人物档案融合 · 大模型调用基础 URL */
  llmBaseUrl?: string;
  /** 人物档案融合 · 大模型名称 */
  llmModel?: string;
  /** 人物档案融合 · 大模型 API Key */
  llmApiKey?: string;
}

export const systemConfigAPI = {
  getPublicConfig: () => apiClient.get<SystemConfigDTO>('/system-config/public'),
  getConfig: () => apiClient.get<SystemConfigDTO>('/system-config'),
  updateConfig: (dto: SystemConfigDTO) => apiClient.put<SystemConfigDTO>('/system-config', dto),
  uploadLogo: (formData: FormData) =>
    apiClient.post<{ logoUrl: string }>('/system-config/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15000,
    }),
};

/** 系统用户（用户管理） */
export interface SysUserDTO {
  userId: number;
  username: string;
  role: string;
  createdTime?: string;
  updatedTime?: string;
}

export interface SysUserCreateDTO {
  username: string;
  password: string;
  role: string;
}

export const sysUserAPI = {
  list: () => apiClient.get<SysUserDTO[]>('/sys/users'),
  create: (dto: SysUserCreateDTO) => apiClient.post<SysUserDTO>('/sys/users', dto),
  delete: (userId: number) => apiClient.delete(`/sys/users/${userId}`),
};

/** 个人工作区目录项（文件或文件夹） */
export interface PersonalDriveEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  mtime?: string;
}

/** 个人工作区 API：列表、建目录、上传、删除、下载 */
export const personalDriveAPI = {
  list: (path: string) =>
    apiClient.get<PersonalDriveEntry[]>('/workspace/personal-drive/list', { params: { path: path || '/' } }),
  mkdir: (path: string) =>
    apiClient.post('/workspace/personal-drive/mkdir', null, { params: { path } }),
  upload: (path: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/workspace/personal-drive/upload', formData, {
      params: { path: path || '/' },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  delete: (path: string, isDir: boolean) =>
    apiClient.delete('/workspace/personal-drive/delete', { params: { path, isDir } }),
  getDownloadUrl: (path: string) =>
    `${BASE_PATH}/api/workspace/personal-drive/file?path=${encodeURIComponent(path)}&download=1`,
};

/** 人员档案导入融合：上传、任务列表、任务详情、确认导入 */
/** 预测模型（智能化模型管理） */
export interface PredictionModelDTO {
  modelId: string;
  name: string;
  description?: string;
  status: string;
  ruleConfig?: string;
  lockedCount?: number;
  accuracy?: string;
  createdTime?: string;
  updatedTime?: string;
}

/** 模型命中人员分页响应（与 persons 接口一致） */
export interface ModelLockedPersonsResponse {
  content?: unknown[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

export const modelAPI = {
  list: () => apiClient.get<PredictionModelDTO[]>('/models'),
  getById: (modelId: string) => apiClient.get<PredictionModelDTO>(`/models/${modelId}`),
  create: (dto: { name: string; description?: string; ruleConfig?: string; lockedCount?: number; accuracy?: string }) =>
    apiClient.post<PredictionModelDTO>('/models', dto),
  update: (modelId: string, dto: Partial<PredictionModelDTO>) =>
    apiClient.put<PredictionModelDTO>(`/models/${modelId}`, dto),
  delete: (modelId: string) => apiClient.delete(`/models/${modelId}`),
  start: (modelId: string) => apiClient.post<PredictionModelDTO>(`/models/${modelId}/start`),
  pause: (modelId: string) => apiClient.post<PredictionModelDTO>(`/models/${modelId}/pause`),
  getRuleConfig: (modelId: string) =>
    apiClient.get<{ ruleConfig: string }>(`/models/${modelId}/rule-config`),
  updateRuleConfig: (modelId: string, ruleConfig: string) =>
    apiClient.put<PredictionModelDTO>(`/models/${modelId}/rule-config`, { ruleConfig }),
  /** 分页查询模型命中（锁定）的人员列表 */
  getLockedPersons: (modelId: string, page: number, size: number) =>
    apiClient.get<ModelLockedPersonsResponse>(`/models/${modelId}/locked-persons`, { params: { page, size } }),
};

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
  /** 任务列表按当前登录用户过滤（X-Username），仅返回该用户创建的导入任务 */
  listTasks: (params: { page?: number; size?: number }) =>
    apiClient.get('/workspace/archive-fusion/tasks', { params }),
  getTaskDetail: (taskId: string) =>
    apiClient.get(`/workspace/archive-fusion/tasks/${taskId}`),
  /** 获取 OnlyOffice 预览配置（documentServerUrl、documentUrl、documentKey 等） */
  getPreviewConfig: (taskId: string) =>
    apiClient.get<{ data: OnlyOfficePreviewConfigDTO }>(`/workspace/archive-fusion/tasks/${taskId}/preview-config`),
  /** 档案文件下载地址（GET 该 URL 会返回文件流，download=1 时触发下载） */
  getFileDownloadUrl: (taskId: string) =>
    `${BASE_PATH}/api/workspace/archive-fusion/tasks/${taskId}/file?download=1`,
  /** 档案文件预览地址（内联打开，供 OnlyOffice 拉取） */
  getFilePreviewUrl: (taskId: string) =>
    `${BASE_PATH}/api/workspace/archive-fusion/tasks/${taskId}/file`,
  /** 导入档案：importAsPublic 仅系统管理员可传 true（公开档案所有人可见，私有仅创建人可见） */
  confirmImport: (taskId: string, resultIds: string[], tags?: string[], importAsPublic?: boolean) =>
    apiClient.post<{ data?: string[] }>(`/workspace/archive-fusion/tasks/${taskId}/confirm-import`, {
      resultIds,
      tags: tags?.filter(Boolean) ?? [],
      importAsPublic: importAsPublic === true,
    }),
};

export default apiClient;
