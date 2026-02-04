package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 人物档案编辑历史
 */
@Entity
@Table(name = "person_edit_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonEditHistory {

    @Id
    @Column(name = "history_id", length = 64, nullable = false)
    private String historyId;

    @Column(name = "person_id", length = 200, nullable = false)
    private String personId;

    @Column(name = "edit_time", nullable = false)
    private LocalDateTime editTime;

    @Column(name = "editor", length = 200)
    private String editor;

    @Column(name = "change_summary", columnDefinition = "TEXT")
    private String changeSummary;
}
