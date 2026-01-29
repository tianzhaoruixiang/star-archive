package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 标签实体类
 */
@Entity
@Table(name = "tag")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Tag {
    
    @Id
    @Column(name = "tag_id", nullable = false)
    private Long tagId;
    
    @Column(name = "first_level_name", length = 100)
    private String firstLevelName;
    
    @Column(name = "second_level_name", length = 100)
    private String secondLevelName;
    
    @Column(name = "tag_name", nullable = false)
    private String tagName;
    
    @Column(name = "tag_description", columnDefinition = "TEXT")
    private String tagDescription;
    
    @Column(name = "calculation_rules", columnDefinition = "TEXT")
    private String calculationRules;
    
    @Column(name = "parent_tag_id")
    private Long parentTagId;
    
    @Column(name = "created_time")
    private LocalDateTime createdTime;
    
    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
