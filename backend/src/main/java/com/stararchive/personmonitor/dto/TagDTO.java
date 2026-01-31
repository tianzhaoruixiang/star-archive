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
    private Long personCount;
    private List<TagDTO> children;
}
