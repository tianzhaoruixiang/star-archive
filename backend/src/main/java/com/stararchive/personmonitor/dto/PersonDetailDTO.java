package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 人员详情DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonDetailDTO {
    
    private String personId;
    private String chineseName;
    private String originalName;
    private List<String> aliasNames;
    /** 第一张头像 URL（兼容旧版） */
    private String avatarUrl;
    /** 全部头像代理 URL 列表，用于详情页多图展示（第一张大头像，其余小头像） */
    private List<String> avatarUrls;
    private String gender;
    /** 婚姻现状：未婚/已婚/离异/丧偶等 */
    private String maritalStatus;
    /** 证件号码 */
    private String idNumber;
    private LocalDateTime birthDate;
    private String nationality;
    private String nationalityCode;
    private String householdAddress;
    private String organization;
    private String belongingGroup;
    private String highestEducation;
    private List<String> phoneNumbers;
    private List<String> emails;
    private List<String> passportNumbers;
    /** 主护照号 */
    private String passportNumber;
    /** 护照类型：普通护照/外交护照/公务护照/旅行证等 */
    private String passportType;
    private String idCardNumber;
    /** 签证类型：公务签证/外交签证/记者签证/旅游签证/其他 */
    private String visaType;
    /** 签证号码 */
    private String visaNumber;
    private List<String> twitterAccounts;
    private List<String> linkedinAccounts;
    private List<String> facebookAccounts;
    private List<String> personTags;
    private String workExperience;
    private String educationExperience;
    /** 关系人列表 JSON，每项含：关系人名称(name)、关系名称(relation)、关系人简介(brief) */
    private String relatedPersons;
    private String remark;
    private List<PersonTravelDTO> recentTravels;
    private List<SocialDynamicDTO> recentSocialDynamics;
    private Boolean isKeyPerson;
    /** 是否公开档案：true 所有人可见，false 仅创建人可见 */
    private Boolean isPublic;
    /** 创建人用户名（私有档案仅此人可见） */
    private String createdBy;
    /** 是否已删除（软删） */
    private Boolean deleted;
    private LocalDateTime deletedTime;
    private String deletedBy;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}
