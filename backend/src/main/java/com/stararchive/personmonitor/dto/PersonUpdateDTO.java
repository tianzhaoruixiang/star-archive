package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
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
    private LocalDateTime birthDate;
    private String nationality;
    private String nationalityCode;
    private String householdAddress;
    private String highestEducation;
    private List<String> phoneNumbers;
    private List<String> emails;
    private List<String> passportNumbers;
    private String idCardNumber;
    private String visaType;
    private String visaNumber;
    private List<String> personTags;
    private String workExperience;
    private String educationExperience;
    private String remark;
    private Boolean isKeyPerson;
}
