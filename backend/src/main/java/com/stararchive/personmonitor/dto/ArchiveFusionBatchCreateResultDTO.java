package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 档案融合批量上传结果
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchiveFusionBatchCreateResultDTO {

    /** 成功创建的任务数 */
    private int successCount;
    /** 失败数 */
    private int failedCount;
    /** 成功创建的任务列表 */
    private List<ArchiveImportTaskDTO> tasks;
    /** 失败项：文件名 + 错误信息 */
    private List<BatchCreateError> errors;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchCreateError {
        private String fileName;
        private String message;
    }
}
