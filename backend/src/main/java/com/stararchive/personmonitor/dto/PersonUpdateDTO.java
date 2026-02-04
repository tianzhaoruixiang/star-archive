package com.stararchive.personmonitor.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * 人员档案更新 DTO（部分字段可选，仅更新非 null 字段）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonUpdateDTO {

    private String chineseName;
    private String originalName;
    private List<String> aliasNames;
    private String organization;
    private String belongingGroup;
    private String gender;
    /** 婚姻现状：未婚/已婚/离异/丧偶等 */
    private String maritalStatus;
    /** 证件号码 */
    private String idNumber;
    /** 出生日期，前端传 yyyy-MM-dd */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthDate;
    private String nationality;
    private String nationalityCode;
    private String householdAddress;
    private String highestEducation;
    private List<String> phoneNumbers;
    private List<String> emails;
    private List<String> passportNumbers;
    /** 主护照号 */
    private String passportNumber;
    /** 护照类型：普通护照/外交护照/公务护照/旅行证等 */
    private String passportType;
    private String idCardNumber;
    private String visaType;
    private String visaNumber;
    private List<String> personTags;
    private String workExperience;
    private String educationExperience;
    /** 关系人列表 JSON，每项含：关系人名称(name)、关系名称(relation)、关系人简介(brief) */
    private String relatedPersons;
    private String remark;
    private Boolean isKeyPerson;
    /** 是否公开档案：true 所有人可见，false 仅创建人可见 */
    private Boolean isPublic;
}
