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
    private String avatarUrl;
    private String gender;
    private LocalDateTime birthDate;
    private String nationality;
    private String nationalityCode;
    private String householdAddress;
    private String highestEducation;
    private List<String> phoneNumbers;
    private List<String> emails;
    private List<String> passportNumbers;
    private String idCardNumber;
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
