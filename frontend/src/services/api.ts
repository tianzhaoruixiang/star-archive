import axios from 'axios';
import type { ArchiveImportTaskDTO, OnlyOfficePreviewConfigDTO } from '@/types/archiveFusion';
import { getStoredAuthUsername } from '@/utils/authStorage';

/** 前端与 API 统一前缀 */
export const BASE_PATH = '/littlesmall';

const apiClient = axios.create({
  baseURL: '/littlesmall/api',
  timeout: 120000, // 所有接口统一 2 分钟超时
  headers: {
    'Content-Type': 'application/json',
  },
});

/** 当前登录用户名，用于档案可见性（公开档案所有人可见，私有档案仅创建人可见） */
let apiUsername: string | null = null;
export function setApiUsername(username: string | null) {
  apiUsername = username ?? null;
}

/** 每次请求前确保 X-Username；若 body 为 FormData 则移除 Content-Type，由浏览器自动设置 multipart/form-data; boundary=... */
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
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
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
  /** 省份间人员流动（出发省→目的省，去重人数），用于地图流动线 */
  getProvinceFlow: () =>
    apiClient.get<ProvinceFlowItemDTO[]>('/dashboard/province-flow'),
};

/** 省份流动项（与后端 ProvinceFlowItemDTO 一致） */
export interface ProvinceFlowItemDTO {
  fromProvince: string;
  toProvince: string;
  personCount: number;
}

/** 人员档案更新请求体（与后端 PersonUpdateDTO 对应，字段可选） */
export interface PersonUpdatePayload {
  chineseName?: string;
  originalName?: string;
  aliasNames?: string[];
  organization?: string;
  belongingGroup?: string;
  gender?: string;
  /** 婚姻现状：未婚/已婚/离异/丧偶等 */
  maritalStatus?: string;
  birthDate?: string | null;
  nationality?: string;
  nationalityCode?: string;
  householdAddress?: string;
  highestEducation?: string;
  phoneNumbers?: string[];
  emails?: string[];
  passportNumbers?: string[];
  /** 主护照号 */
  passportNumber?: string;
  /** 护照类型：普通护照/外交护照/公务护照/旅行证等 */
  passportType?: string;
  idCardNumber?: string;
  /** 证件号码 */
  idNumber?: string;
  visaType?: string;
  visaNumber?: string;
  personTags?: string[];
  workExperience?: string;
  educationExperience?: string;
  /** 关系人 JSON，每项含：name、relation、brief */
  relatedPersons?: string;
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

/** 人员列表筛选（可选；支持同时选标签 + 检索姓名/证件号；目的地省份可与 destinationCity/visaType 等组合） */
export interface PersonListFilter {
  isKeyPerson?: boolean;
  organization?: string;
  visaType?: string;
  belongingGroup?: string;
  /** 出发省份（与 destinationProvince 同时使用时表示流动线） */
  departureProvince?: string;
  /** 目的地省份 */
  destinationProvince?: string;
  /** 目的地城市（须与 destinationProvince 同时使用） */
  destinationCity?: string;
  /** 标签名列表，与 keyword 可同时使用 */
  tags?: string[];
  /** 姓名/证件号检索关键词，与 tags 可同时使用 */
  keyword?: string;
  /** 标签匹配方式：true=命中任一标签，false=须同时命中（默认 true） */
  matchAny?: boolean;
}

export interface GetPersonListOptions {
  signal?: AbortSignal;
}

export const personAPI = {
  getPersonList: (page: number, size: number, filter?: PersonListFilter, options?: GetPersonListOptions) =>
    apiClient.get('/persons', {
      params: {
        page,
        size,
        ...(filter?.isKeyPerson !== undefined && { isKeyPerson: filter.isKeyPerson }),
        ...(filter?.organization && { organization: filter.organization }),
        ...(filter?.visaType && { visaType: filter.visaType }),
        ...(filter?.belongingGroup && { belongingGroup: filter.belongingGroup }),
        ...(filter?.departureProvince && { departureProvince: filter.departureProvince }),
        ...(filter?.destinationProvince && { destinationProvince: filter.destinationProvince }),
        ...(filter?.destinationCity && { destinationCity: filter.destinationCity }),
        ...(filter?.tags?.length && { tags: filter.tags }),
        ...(filter?.keyword != null && filter.keyword.trim() !== '' && { keyword: filter.keyword.trim() }),
        ...(filter?.matchAny !== undefined && { matchAny: filter.matchAny }),
      },
      ...(options?.signal && { signal: options.signal }),
    }),
  getPersonDetail: (personId: string) =>
    apiClient.get(`/persons/${personId}`),
  updatePerson: (personId: string, data: PersonUpdatePayload, editor?: string) =>
    apiClient.put(`/persons/${personId}`, data, {
      headers: editor ? { 'X-Editor': editor } : undefined,
    }),
  deletePerson: (personId: string) =>
    apiClient.delete(`/persons/${personId}`),
  uploadAvatar: (personId: string, formData: FormData, editor?: string) =>
    apiClient.post(`/persons/${personId}/avatar`, formData, {
      headers: editor ? { 'X-Editor': editor } : undefined,
      timeout: 15000,
    }),
  getEditHistory: (personId: string) =>
    apiClient.get<PersonEditHistoryItem[]>(`/persons/${personId}/edit-history`),
  /** 智能画像（大模型根据档案基本信息生成，与档案融合使用同一大模型配置） */
  getPortraitAnalysis: (personId: string) =>
    apiClient
      .get<{ result?: string; message?: string; data?: string }>(
        `/persons/${personId}/portrait-analysis`,
        { timeout: 60000 }
      )
      .then((res) => res.data?.data ?? ''),
  /**
   * 智能画像流式接口（SSE）。通过 onChunk 逐块追加内容，onDone/onError 结束。
   * 用于前端流式展示，避免长时间 loading。
   */
  getPortraitAnalysisStream: (
    personId: string,
    callbacks: {
      onChunk: (text: string) => void;
      onDone: () => void;
      onError: (message: string) => void;
    }
  ) => {
    const username = apiUsername ?? getStoredAuthUsername() ?? '';
    const url = `${BASE_PATH}/api/persons/${personId}/portrait-analysis/stream`;
    fetch(url, {
      method: 'GET',
      headers: username ? { 'X-Username': username } : {},
    })
      .then(async (response) => {
        if (!response.ok) {
          const err = (await response.json().catch(() => ({}))) as { message?: string };
          callbacks.onError(err?.message ?? `请求失败 ${response.status}`);
          return;
        }
        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError('无法读取响应流');
          callbacks.onDone();
          return;
        }
        const decoder = new TextDecoder();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const payload = line.replace(/^data:\s*/, '').trim();
              if (!payload) continue;
              try {
                const data = JSON.parse(payload) as { content?: string; done?: boolean; error?: string };
                if (data.error) {
                  callbacks.onError(data.error);
                  callbacks.onDone();
                  return;
                }
                if (data.done) {
                  callbacks.onDone();
                  return;
                }
                if (typeof data.content === 'string' && data.content) {
                  callbacks.onChunk(data.content);
                }
              } catch {
                // ignore parse error for single line
              }
            }
          }
          callbacks.onDone();
        } catch (e) {
          callbacks.onError((e as Error)?.message ?? '流式读取异常');
          callbacks.onDone();
        }
      })
      .catch((e) => {
        callbacks.onError((e as Error)?.message ?? '网络请求失败');
        callbacks.onDone();
      });
  },
  getTags: (params?: { keyTag?: boolean }) =>
    apiClient.get('/persons/tags', { params: params?.keyTag !== undefined ? { keyTag: params.keyTag } : undefined }),
  createTag: (dto: TagCreateDTO) => apiClient.post<TagDTO>('/persons/tags', dto),
  updateTag: (tagId: number, dto: TagCreateDTO) => apiClient.put<TagDTO>(`/persons/tags/${tagId}`, dto),
  deleteTag: (tagId: number) => apiClient.delete(`/persons/tags/${tagId}`),
  getPersonListByTag: (tag: string, page: number, size: number) =>
    apiClient.get('/persons/by-tag', { params: { tag, page, size } }),
  getPersonListByTags: (tags: string[], page: number, size: number, matchAny?: boolean) =>
    apiClient.get('/persons/by-tags', {
      params: { tags: tags.join(','), page, size, ...(matchAny === true ? { matchAny: true } : {}) },
    }),
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
  /** 二级分类展示顺序 */
  secondLevelSortOrder?: number;
  /** 三级标签展示顺序 */
  tagSortOrder?: number;
  /** 是否重点标签：重点人员页左侧仅展示重点标签 */
  keyTag?: boolean;
  personCount?: number;
  children?: TagDTO[];
}

/** 新增/编辑人物标签请求体 */
export interface TagCreateDTO {
  firstLevelName?: string;
  secondLevelName?: string;
  tagName: string;
  tagDescription?: string;
  firstLevelSortOrder?: number;
  /** 二级分类展示顺序，数字越小越靠前 */
  secondLevelSortOrder?: number;
  /** 三级标签展示顺序，数字越小越靠前 */
  tagSortOrder?: number;
  /** 是否重点标签：勾选后在重点人员页左侧展示 */
  keyTag?: boolean;
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

/** 我的收藏（用户收藏的人物档案） */
export const favoriteAPI = {
  add: (personId: string) => apiClient.post(`/user-favorites/${personId}`),
  remove: (personId: string) => apiClient.delete(`/user-favorites/${personId}`),
  check: (personId: string) =>
    apiClient.get<{ data?: boolean }>(`/user-favorites/check/${personId}`).then((r: unknown) => (r && typeof r === 'object' && 'data' in r ? (r as { data?: boolean }).data : false)),
  list: (page: number, size: number) =>
    apiClient.get('/user-favorites', { params: { page, size } }),
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

/** 新闻分类（与后端 category 字段一致，直接存中文；用于 Tab 筛选） */
export const NEWS_CATEGORIES = ['政治', '经济', '文化', '体育', '科技', '社会民生'] as const;

export const newsAPI = {
  getNewsList: (page: number, size: number, keyword?: string, category?: string) =>
    apiClient.get('/news', { params: { page, size, keyword, category } }),
  getNewsDetail: (newsId: string) => apiClient.get<NewsItem>(`/news/${newsId}`),
  getNewsAnalysis: () => apiClient.get('/news/analysis'),
};

/** 事件列表项（由新闻聚合提取） */
export interface EventItem {
  eventId: string;
  title?: string;
  summary?: string;
  eventDate?: string;
  newsCount?: number;
  firstPublishTime?: string | number | number[];
  lastPublishTime?: string | number | number[];
}

/** 事件详情（含关联新闻） */
export interface EventDetailItem extends EventItem {
  relatedNews?: NewsItem[];
}

export const eventsAPI = {
  getEventList: (page: number, size: number) =>
    apiClient.get('/events', { params: { page, size } }),
  getEventDetail: (eventId: string) => apiClient.get<EventDetailItem>(`/events/${eventId}`),
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
  /** 二级导航-档案融合 */
  navWorkspaceFusion?: boolean;
  /** 二级导航-标签管理 */
  navWorkspaceTags?: boolean;
  /** 二级导航-我的收藏 */
  navWorkspaceFavorites?: boolean;
  /** 二级导航-模型管理 */
  navModelManagement?: boolean;
  navSituation?: boolean;
  /** 导航-智能问答 是否显示 */
  navSmartQA?: boolean;
  navSystemConfig?: boolean;
  showPersonDetailEdit?: boolean;
  /** 人物档案融合 · 大模型调用基础 URL */
  llmBaseUrl?: string;
  /** 人物档案融合 · 大模型名称 */
  llmModel?: string;
  /** 人物档案融合 · 大模型 API Key */
  llmApiKey?: string;
  /** 人物档案融合 · 默认提示词（可在系统配置中修改，档案融合使用此提示词） */
  llmExtractPromptDefault?: string;
  /** 智能问答 · 嵌入模型（如 text-embedding-3-small）；为空则 RAG 使用关键词检索 */
  llmEmbeddingModel?: string;
  /** OnlyOffice · 前端加载脚本的地址（document-server-url） */
  onlyofficeDocumentServerUrl?: string;
  /** OnlyOffice · 服务端拉取文档的基地址（document-download-base） */
  onlyofficeDocumentDownloadBase?: string;
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

/** 智能问答 - 知识库 */
export interface KnowledgeBaseDTO {
  id: string;
  name: string;
  creatorUsername?: string;
  createdTime?: string;
  updatedTime?: string;
}

/** 智能问答 - 文档 */
export interface QaDocumentDTO {
  id: string;
  kbId: string;
  fileName: string;
  status: string;
  errorMessage?: string;
  chunkCount?: number;
  createdTime?: string;
}

/** 智能问答 - 会话 */
export interface QaSessionDTO {
  id: string;
  kbId: string;
  title: string;
  creatorUsername?: string;
  createdTime?: string;
  updatedTime?: string;
}

/** 智能问答 - 消息 */
export interface QaMessageDTO {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdTime?: string;
}

/** 智能问答 - 发送消息请求 */
export interface SmartQaChatRequest {
  sessionId: string;
  content: string;
}

/** 智能问答 - 助手回复（非流式时使用） */
export interface SmartQaChatResponse {
  messageId: string;
  content: string;
}

/** 流式事件：content 为增量文本；done 为 true 时携带 messageId */
export interface SmartQaStreamEvent {
  content?: string;
  messageId?: string;
  done?: boolean;
  error?: string;
}

/** 解析 SSE 流，按行处理 data: 行并回调 */
async function readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (data: SmartQaStreamEvent) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const raw = line.replace(/^data:\s*/, '').trim();
      if (!raw) continue;
      try {
        const data = JSON.parse(raw) as SmartQaStreamEvent;
        onEvent(data);
      } catch {
        // ignore non-JSON lines
      }
    }
  }
  if (buffer.trim().startsWith('data:')) {
    try {
      const raw = buffer.trim().replace(/^data:\s*/, '').trim();
      if (raw) onEvent(JSON.parse(raw) as SmartQaStreamEvent);
    } catch {
      // ignore
    }
  }
}

export const smartQAAPI = {
  listKnowledgeBases: () => apiClient.get<KnowledgeBaseDTO[]>('/smart-qa/knowledge-bases'),
  getKnowledgeBase: (id: string) => apiClient.get<KnowledgeBaseDTO>(`/smart-qa/knowledge-bases/${id}`),
  createKnowledgeBase: (body: { name: string }) => apiClient.post<KnowledgeBaseDTO>('/smart-qa/knowledge-bases', body),
  updateKnowledgeBase: (id: string, body: { name: string }) => apiClient.put<KnowledgeBaseDTO>(`/smart-qa/knowledge-bases/${id}`, body),
  deleteKnowledgeBase: (id: string) => apiClient.delete(`/smart-qa/knowledge-bases/${id}`),
  listDocuments: (kbId: string) => apiClient.get<QaDocumentDTO[]>(`/smart-qa/knowledge-bases/${kbId}/documents`),
  uploadDocument: (kbId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<QaDocumentDTO>(`/smart-qa/knowledge-bases/${kbId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  deleteDocument: (docId: string) => apiClient.delete(`/smart-qa/documents/${docId}`),
  listSessions: () => apiClient.get<QaSessionDTO[]>('/smart-qa/sessions'),
  listSessionsByKb: (kbId: string) => apiClient.get<QaSessionDTO[]>(`/smart-qa/knowledge-bases/${kbId}/sessions`),
  getSession: (id: string) => apiClient.get<QaSessionDTO>(`/smart-qa/sessions/${id}`),
  createSession: (body: { kbId: string }) => apiClient.post<QaSessionDTO>('/smart-qa/sessions', body),
  updateSessionTitle: (id: string, body: { title: string }) => apiClient.put<QaSessionDTO>(`/smart-qa/sessions/${id}`, body),
  deleteSession: (id: string) => apiClient.delete(`/smart-qa/sessions/${id}`),
  listMessages: (sessionId: string) => apiClient.get<QaMessageDTO[]>(`/smart-qa/sessions/${sessionId}/messages`),
  /**
   * 流式问答：POST 后读取 SSE，每收到 content 调用 onChunk，结束时调用 onDone(messageId)。
   * 返回 Promise，失败时 reject。
   */
  chatStream: async (
    body: SmartQaChatRequest,
    onChunk: (content: string) => void,
    onDone: (messageId: string) => void
  ): Promise<void> => {
    const username = getStoredAuthUsername();
    const res = await fetch(`${BASE_PATH}/api/smart-qa/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(username ? { 'X-Username': username } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(err?.message ?? `请求失败 ${res.status}`);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('无响应体');
    await readSSEStream(reader, (data) => {
      if (data.error) throw new Error(data.error);
      if (data.content) onChunk(data.content);
      if (data.done && data.messageId) onDone(data.messageId);
    });
  },
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
  create: (dto: { name: string; description?: string; ruleConfig?: string }) =>
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
  /** 实时语义命中：Text2Sql 查询，返回命中人数与分页列表（仅语义模型且有规则时有效） */
  getSemanticHit: (modelId: string, page: number, size: number) =>
    apiClient.get<ModelLockedPersonsResponse>(`/models/${modelId}/semantic-hit`, { params: { page, size } }),
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
  /** 失败任务重新导入：仅 FAILED 状态可调用，后台重新触发异步提取 */
  retryTask: (taskId: string) =>
    apiClient.put<ArchiveImportTaskDTO>(`/workspace/archive-fusion/tasks/${taskId}/retry`),
  /** 删除档案融合导入任务：仅任务创建人可操作 */
  deleteTask: (taskId: string) =>
    apiClient.delete(`/workspace/archive-fusion/tasks/${taskId}`),
  getTaskDetail: (taskId: string) =>
    apiClient.get(`/workspace/archive-fusion/tasks/${taskId}`),
  /** 分页获取任务提取结果（对照预览右侧结构化结果） */
  getExtractResultsPage: (taskId: string, page: number, size: number) =>
    apiClient.get(`/workspace/archive-fusion/tasks/${taskId}/extract-results`, { params: { page, size } }),
  /** 全部导入（异步）：提交本任务下所有未导入结果由服务端后台导入，接口立即返回 */
  confirmImportAllAsync: (taskId: string, tags?: string[], importAsPublic?: boolean) =>
    apiClient.post<{ data?: { totalQueued?: number }; message?: string }>(
      `/workspace/archive-fusion/tasks/${taskId}/confirm-import-all-async`,
      { tags: tags?.filter(Boolean) ?? [], importAsPublic: importAsPublic === true }
    ),
  /** 获取 OnlyOffice 预览配置（documentServerUrl、documentUrl、documentKey 等）。documentUrl 由后端返回，使用 document-download-base，不经前端 Nginx 转发。 */
  getPreviewConfig: (taskId: string) =>
    apiClient.get<{ data: OnlyOfficePreviewConfigDTO }>(
      `/workspace/archive-fusion/tasks/${taskId}/preview-config`
    ),
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
