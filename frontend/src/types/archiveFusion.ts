/** 档案导入任务 */
export interface ArchiveImportTaskDTO {
  taskId: string;
  fileName: string;
  fileType: string;
  status: string;
  /** 解析后的原始文档全文，用于与抽取结果对比阅读 */
  originalText?: string;
  extractCount: number;
  errorMessage?: string;
  creatorUsername?: string;
  createdTime: string;
  updatedTime: string;
}

/** 人员卡片（列表/相似档案） */
export interface PersonCardDTO {
  personId: string;
  chineseName?: string;
  originalName?: string;
  avatarUrl?: string;
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
