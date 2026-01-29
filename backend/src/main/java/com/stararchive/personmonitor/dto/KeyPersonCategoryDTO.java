package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 重点人员类别 DTO（全部 + 目录，用于左侧筛选）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KeyPersonCategoryDTO {

    /** 类别标识：all 表示全部，否则为目录 ID */
    private String id;
    private String name;
    private Long count;
}
