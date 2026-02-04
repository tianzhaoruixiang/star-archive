package com.stararchive.personmonitor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 人物标签新增请求体
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TagCreateDTO {

    /** 一级分类名，如：基本属性、身份属性 */
    @Size(max = 100)
    private String firstLevelName;

    /** 二级分类名，如：年龄、性别，可为空 */
    @Size(max = 100)
    private String secondLevelName;

    /** 标签名称（必填），用于人物档案 person_tags 与筛选 */
    @NotBlank(message = "标签名称不能为空")
    @Size(max = 255)
    private String tagName;

    /** 标签描述 */
    @Size(max = 2000)
    private String tagDescription;

    /** 一级展示顺序：1基本属性 2身份属性 3关系属性 4组织架构 5行为规律 6异常行为 */
    private Integer firstLevelSortOrder;

    /** 二级分类展示顺序：同一级下多个二级分类的排序，数字越小越靠前 */
    private Integer secondLevelSortOrder;

    /** 三级标签展示顺序：同二级下多个标签的排序，数字越小越靠前 */
    private Integer tagSortOrder;

    /** 是否重点标签：勾选后该标签在重点人员页左侧展示，仅展示命中重点标签的人员 */
    private Boolean keyTag;
}
