package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 重点人员类别接口响应：全部人数 + 各目录列表（不含「全部」项，由前端单独展示）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KeyPersonCategoriesResponse {

    /** 「全部」对应的人数（去重后） */
    private Long allCount;

    /** 各目录类别（不含「全部」） */
    private List<KeyPersonCategoryDTO> categories;
}
