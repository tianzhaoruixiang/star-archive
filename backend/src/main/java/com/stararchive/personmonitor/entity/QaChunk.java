package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 智能问答 - 文档分块（RAG 检索单元）
 */
@Entity
@Table(name = "qa_chunk")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QaChunk {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "doc_id", nullable = false, length = 64)
    private String docId;

    @Column(name = "kb_id", nullable = false, length = 64)
    private String kbId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "embedding", columnDefinition = "TEXT")
    private String embedding;

    @Column(name = "seq")
    private Integer seq;

    @Column(name = "created_time")
    private LocalDateTime createdTime;
}
