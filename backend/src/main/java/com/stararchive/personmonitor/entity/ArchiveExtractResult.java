package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 档案提取结果实体（大模型抽取的结构化人物，相似匹配条件：原始姓名+出生日期+性别+国籍）
 */
@Entity
@Table(name = "archive_extract_result")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchiveExtractResult {

    @Id
    @Column(name = "result_id", length = 64, nullable = false)
    private String resultId;

    @Column(name = "task_id", length = 64, nullable = false)
    private String taskId;

    @Column(name = "extract_index", nullable = false)
    private Integer extractIndex;

    @Column(name = "original_name", length = 200)
    private String originalName;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "nationality", length = 100)
    private String nationality;

    @Column(name = "original_text", columnDefinition = "TEXT")
    private String originalText;

    @Column(name = "raw_json", columnDefinition = "TEXT")
    private String rawJson;

    @Column(name = "confirmed")
    private Boolean confirmed;

    @Column(name = "imported")
    private Boolean imported;

    @Column(name = "imported_person_id", length = 200)
    private String importedPersonId;

    @Column(name = "created_time")
    private LocalDateTime createdTime;
}
