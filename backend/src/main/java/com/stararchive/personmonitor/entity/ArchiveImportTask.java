package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 人员档案导入任务实体
 */
@Entity
@Table(name = "archive_import_task")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchiveImportTask {

    @Id
    @Column(name = "task_id", length = 64, nullable = false)
    private String taskId;

    @Column(name = "document_id", length = 64)
    private String documentId;

    @Column(name = "file_name", length = 500)
    private String fileName;

    @Column(name = "file_path_id", length = 100)
    private String filePathId;

    @Column(name = "file_type", length = 20)
    private String fileType;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "creator_user_id")
    private Integer creatorUserId;

    @Column(name = "creator_username", length = 100)
    private String creatorUsername;

    @Column(name = "extract_count")
    private Integer extractCount;

    @Column(name = "original_text", columnDefinition = "TEXT")
    private String originalText;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
