package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 档案相似匹配结果实体（提取人物与库内人物的对应关系）
 */
@Entity
@Table(name = "archive_similar_match")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchiveSimilarMatch {

    @Id
    @Column(name = "match_id", nullable = false)
    private Long matchId;

    @Column(name = "task_id", length = 64, nullable = false)
    private String taskId;

    @Column(name = "result_id", length = 64, nullable = false)
    private String resultId;

    @Column(name = "person_id", length = 200, nullable = false)
    private String personId;

    @Column(name = "created_time")
    private LocalDateTime createdTime;
}
