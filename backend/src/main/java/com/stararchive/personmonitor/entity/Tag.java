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
    
    @Column(name = "first_level_name", length = 200)
    private String firstLevelName;

    @Column(name = "second_level_name", length = 200)
    private String secondLevelName;

    @Column(name = "tag_name", nullable = false, length = 500)
    private String tagName;
    
    @Column(name = "tag_description", columnDefinition = "TEXT")
    private String tagDescription;
    
    @Column(name = "calculation_rules", columnDefinition = "TEXT")
    private String calculationRules;
    
    @Column(name = "parent_tag_id")
    private Long parentTagId;
    
    @Column(name = "first_level_sort_order")
    private Integer firstLevelSortOrder;

    /** 二级分类展示顺序：同一级下多个二级分类的排序，数字越小越靠前 */
    @Column(name = "second_level_sort_order")
    private Integer secondLevelSortOrder;

    /** 三级标签展示顺序：同二级下多个标签的排序，数字越小越靠前 */
    @Column(name = "tag_sort_order")
    private Integer tagSortOrder;

    /** 是否重点标签：重点人员页仅展示命中重点标签的人员，左侧仅展示重点标签 */
    @Column(name = "key_tag")
    private Boolean keyTag;

    @Column(name = "created_time")
    private LocalDateTime createdTime;
    
    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
