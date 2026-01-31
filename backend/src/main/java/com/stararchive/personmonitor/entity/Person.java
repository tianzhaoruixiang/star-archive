package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 人物实体类
 */
@Entity
@Table(name = "person")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Person {
    
    @Id
    @Column(name = "person_id", length = 200, nullable = false)
    private String personId;
    
    @Column(name = "is_key_person")
    private Boolean isKeyPerson;
    
    @Column(name = "chinese_name", length = 100)
    private String chineseName;
    
    @Column(name = "original_name", length = 200)
    private String originalName;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "alias_names", columnDefinition = "json")
    private List<String> aliasNames;
    
    @Column(name = "organization", length = 100)
    private String organization;
    
    @Column(name = "belonging_group", length = 50)
    private String belongingGroup;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "avatar_files", columnDefinition = "json")
    private List<String> avatarFiles;
    
    @Column(name = "gender", length = 10)
    private String gender;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "id_numbers", columnDefinition = "json")
    private List<String> idNumbers;
    
    @Column(name = "birth_date")
    private LocalDateTime birthDate;
    
    @Column(name = "nationality", length = 100)
    private String nationality;
    
    @Column(name = "nationality_code", length = 3)
    private String nationalityCode;
    
    @Column(name = "household_address", length = 500)
    private String householdAddress;
    
    @Column(name = "highest_education", length = 50)
    private String highestEducation;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "phone_numbers", columnDefinition = "json")
    private List<String> phoneNumbers;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "emails", columnDefinition = "json")
    private List<String> emails;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "passport_numbers", columnDefinition = "json")
    private List<String> passportNumbers;
    
    @Column(name = "id_card_number", length = 18)
    private String idCardNumber;

    /** 签证类型：公务签证/外交签证/记者签证/旅游签证/其他（人员档案维度，首页签证类型排名按此统计） */
    @Column(name = "visa_type", length = 50)
    private String visaType;

    /** 签证号码 */
    @Column(name = "visa_number", length = 100)
    private String visaNumber;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "twitter_accounts", columnDefinition = "json")
    private List<String> twitterAccounts;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "linkedin_accounts", columnDefinition = "json")
    private List<String> linkedinAccounts;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "facebook_accounts", columnDefinition = "json")
    private List<String> facebookAccounts;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "person_tags", columnDefinition = "json")
    private List<String> personTags;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "work_experience", columnDefinition = "json")
    private String workExperience;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "education_experience", columnDefinition = "json")
    private String educationExperience;
    
    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;
    
    @Column(name = "created_time")
    private LocalDateTime createdTime;
    
    @Column(name = "updated_time")
    private LocalDateTime updatedTime;

    /** 持久化前将 JSON 列的空字符串转为 null，避免 DB 报错：Empty string cannot be parsed as jsonb */
    @PrePersist
    @PreUpdate
    private void normalizeJsonColumns() {
        if (workExperience != null && workExperience.isBlank()) {
            workExperience = null;
        }
        if (educationExperience != null && educationExperience.isBlank()) {
            educationExperience = null;
        }
    }
}
