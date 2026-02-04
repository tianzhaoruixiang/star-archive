package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 人员卡片DTO - 用于列表展示
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonCardDTO {

    private String personId;
    private String chineseName;
    private String originalName;
    private String avatarUrl;
    /** 所属机构（卡片展示） */
    private String organization;
    /** 所属群体（卡片展示） */
    private String belongingGroup;
    /** 性别 */
    private String gender;
    /** 国籍 */
    private String nationality;
    /** 证件号码（卡片展示，单值） */
    private String idNumber;
    /** 主护照号 */
    private String passportNumber;
    /** 护照类型 */
    private String passportType;
    private String idCardNumber;
    /** 婚姻现状：未婚/已婚/离异/丧偶等 */
    private String maritalStatus;
    /** 签证类型（首页签证类型排名按人员表此字段统计） */
    private String visaType;
    private LocalDateTime birthDate;
    private List<String> personTags;
    private LocalDateTime updatedTime;
    private Boolean isKeyPerson;
    /** 籍贯（重点人员管理卡片展示） */
    private String householdAddress;
    /** 电话摘要（取第一个号码，重点人员管理卡片展示） */
    private String phoneSummary;
    /** 原因/备注（重点人员管理卡片展示） */
    private String remark;
    /** 是否公开档案（列表仅展示，详情可编辑） */
    private Boolean isPublic;
}
