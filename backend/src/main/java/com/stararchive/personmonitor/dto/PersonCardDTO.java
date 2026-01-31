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
    private String idCardNumber;
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
    /** 所属群体（用于群体类别统计与展示） */
    private String belongingGroup;
}
