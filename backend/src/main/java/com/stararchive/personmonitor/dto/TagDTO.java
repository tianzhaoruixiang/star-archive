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
    private Long personCount;
    private List<TagDTO> children;
}
