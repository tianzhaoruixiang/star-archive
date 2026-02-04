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
    /** 待提取人物总数（Excel/CSV 为行数，文档为 1） */
    private Integer totalExtractCount;
    /** 已提取人物数量 */
    private Integer extractCount;
    /** 未导入的提取结果条数（用于对照预览页「全部导入」展示） */
    private Long unimportedCount;
    private String errorMessage;
    private String creatorUsername;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
    /** 任务完成时间（SUCCESS/FAILED 时） */
    private LocalDateTime completedTime;
    /** 任务完成总耗时（秒），从创建到完成 */
    private Long durationSeconds;
    /** 相似档案判定使用的属性组合，逗号分隔，如 originalName,birthDate,gender,nationality */
    private String similarMatchFields;
}
