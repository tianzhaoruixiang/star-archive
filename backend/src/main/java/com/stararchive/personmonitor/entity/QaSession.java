package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 智能问答 - 会话
 */
@Entity
@Table(name = "qa_session")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QaSession {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "kb_id", nullable = false, length = 64)
    private String kbId;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "creator_username", nullable = false, length = 200)
    private String creatorUsername;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
