package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 档案导入任务 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchiveImportTaskDTO {

    private String taskId;
    private String fileName;
    private String fileType;
    private String status;
    /** 解析后的原始文档全文，用于与抽取结果对比阅读 */
    private String originalText;
    private Integer extractCount;
    private String errorMessage;
    private String creatorUsername;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}
