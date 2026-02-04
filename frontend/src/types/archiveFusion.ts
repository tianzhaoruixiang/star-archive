/** 档案导入任务 */
export interface ArchiveImportTaskDTO {
  taskId: string;
  fileName: string;
  fileType: string;
  status: string;
  /** 解析后的原始文档全文，用于与抽取结果对比阅读 */
  originalText?: string;
  /** 待提取人物总数（Excel/CSV 为行数，文档为 1） */
  totalExtractCount?: number;
  /** 已提取人物数量 */
  extractCount: number;
  /** 未导入的提取结果条数（用于对照预览页「全部导入」展示） */
  unimportedCount?: number;
  errorMessage?: string;
  creatorUsername?: string;
  createdTime: string;
  updatedTime: string;
  /** 任务完成时间（SUCCESS/FAILED 时） */
  completedTime?: string;
  /** 任务完成总耗时（秒），从创建到完成 */
  durationSeconds?: number;
  /** 相似档案判定使用的属性组合，逗号分隔，如 originalName,birthDate,gender,nationality */
  similarMatchFields?: string;
}

/** 相似判定可选属性（与后端 originalName,birthDate,gender,nationality 对应） */
export const SIMILAR_MATCH_FIELD_OPTIONS: { key: string; label: string }[] = [
  { key: 'originalName', label: '人物原文姓名' },
  { key: 'birthDate', label: '出生日期' },
  { key: 'gender', label: '性别' },
  { key: 'nationality', label: '国籍' },
];

/** 人员卡片（列表/相似档案），与后端 PersonCardDTO 及身份证式展示对齐 */
export interface PersonCardDTO {
  personId: string;
  chineseName?: string;
  originalName?: string;
  avatarUrl?: string;
  organization?: string;
  belongingGroup?: string;
  gender?: string;
  nationality?: string;
  idNumber?: string;
  idCardNumber?: string;
  birthDate?: string;
  personTags?: string[];
  updatedTime?: string;
  isKeyPerson?: boolean;
}

/** 档案提取结果（含相似人员、确认与导入状态） */
export interface ArchiveExtractResultDTO {
  resultId: string;
  taskId: string;
  extractIndex: number;
  originalName?: string;
  birthDate?: string;
  gender?: string;
  nationality?: string;
  rawJson?: string;
  confirmed?: boolean;
  imported?: boolean;
  importedPersonId?: string;
  similarPersons?: PersonCardDTO[];
}

/** 档案融合任务详情 */
export interface ArchiveFusionTaskDetailDTO {
  task: ArchiveImportTaskDTO;
  extractResults: ArchiveExtractResultDTO[];
}

/** 批量上传结果 */
export interface ArchiveFusionBatchCreateResultDTO {
  successCount: number;
  failedCount: number;
  tasks: ArchiveImportTaskDTO[];
  errors: Array<{ fileName: string; message: string }>;
}

/** 分页响应 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** OnlyOffice 预览配置（后端返回，用于初始化 DocEditor） */
export interface OnlyOfficePreviewConfigDTO {
  documentServerUrl: string;
  documentUrl: string;
  documentKey: string;
  fileType: string;
  title: string;
  documentType: 'word' | 'cell';
  enabled: boolean;
}
