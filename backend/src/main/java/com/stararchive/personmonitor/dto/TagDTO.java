package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 标签DTO - 支持树形结构
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TagDTO {
    
    private Long tagId;
    private String firstLevelName;
    private String secondLevelName;
    private String tagName;
    private String tagDescription;
    private Long parentTagId;
    /** 一级标签展示顺序：1基本属性 2身份属性 3关系属性 4组织架构 5行为规律 6异常行为 */
    private Integer firstLevelSortOrder;
    /** 二级分类展示顺序：同一级下多个二级分类的排序 */
    private Integer secondLevelSortOrder;
    /** 三级标签展示顺序：同二级下多个标签的排序 */
    private Integer tagSortOrder;
    /** 是否重点标签：重点人员页左侧仅展示重点标签，右侧仅展示命中重点标签的人员 */
    private Boolean keyTag;
    private Long personCount;
    private List<TagDTO> children;
}
