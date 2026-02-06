package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 智能问答 - 知识库文档
 */
@Entity
@Table(name = "qa_document")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QaDocument {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "kb_id", nullable = false, length = 64)
    private String kbId;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "file_path_id", length = 500)
    private String filePathId;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "chunk_count")
    private Integer chunkCount;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PARSING = "PARSING";
    public static final String STATUS_EMBEDDING = "EMBEDDING";
    public static final String STATUS_READY = "READY";
    public static final String STATUS_FAILED = "FAILED";
}
