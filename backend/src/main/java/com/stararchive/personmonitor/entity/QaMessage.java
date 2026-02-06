package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 智能问答 - 消息
 */
@Entity
@Table(name = "qa_message")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QaMessage {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    /** 列名加反引号以兼容 PostgreSQL 保留字 role */
    @Column(name = "`role`", nullable = false, length = 20)
    private String role;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    public static final String ROLE_USER = "user";
    public static final String ROLE_ASSISTANT = "assistant";
}
