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
    private String idCardNumber;
    private String visaType;
    private String visaNumber;
    private List<String> personTags;
    private String workExperience;
    private String educationExperience;
    private String remark;
    private Boolean isKeyPerson;
    /** 是否公开档案：true 所有人可见，false 仅创建人可见 */
    private Boolean isPublic;
}
