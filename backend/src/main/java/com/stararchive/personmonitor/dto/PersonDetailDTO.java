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
    private String remark;
    private List<PersonTravelDTO> recentTravels;
    private List<SocialDynamicDTO> recentSocialDynamics;
    private Boolean isKeyPerson;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}
