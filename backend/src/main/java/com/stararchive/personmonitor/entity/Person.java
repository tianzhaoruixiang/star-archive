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
    
    @Column(name = "chinese_name", length = 200)
    private String chineseName;

    @Column(name = "original_name", length = 300)
    private String originalName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "alias_names", columnDefinition = "json")
    private List<String> aliasNames;

    @Column(name = "organization", length = 200)
    private String organization;

    @Column(name = "belonging_group", length = 100)
    private String belongingGroup;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "avatar_files", columnDefinition = "json")
    private List<String> avatarFiles;

    @Column(name = "gender", length = 20)
    private String gender;

    /** 婚姻现状：未婚/已婚/离异/丧偶等 */
    @Column(name = "marital_status", length = 100)
    private String maritalStatus;

    /** 证件号码 */
    @Column(name = "id_number", length = 200)
    private String idNumber;

    @Column(name = "birth_date")
    private LocalDateTime birthDate;

    @Column(name = "nationality", length = 200)
    private String nationality;

    @Column(name = "nationality_code", length = 3)
    private String nationalityCode;

    @Column(name = "household_address", length = 1000)
    private String householdAddress;

    @Column(name = "highest_education", length = 100)
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

    /** 主护照号 */
    @Column(name = "passport_number", length = 200)
    private String passportNumber;

    /** 护照类型：普通护照/外交护照/公务护照/旅行证等 */
    @Column(name = "passport_type", length = 100)
    private String passportType;

    @Column(name = "id_card_number", length = 50)
    private String idCardNumber;

    /** 签证类型：公务签证/外交签证/记者签证/旅游签证/其他（人员档案维度，首页签证类型排名按此统计） */
    @Column(name = "visa_type", length = 100)
    private String visaType;

    /** 签证号码 */
    @Column(name = "visa_number", length = 200)
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
    
    @Column(name = "work_experience")
    private String workExperience;
    
    @Column(name = "education_experience")
    private String educationExperience;

    /** 关系人列表 JSON，每项含：关系人名称(name)、关系名称(relation)、关系人简介(brief) */
    @Column(name = "related_persons")
    private String relatedPersons;
    
    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;

    /** 是否公开档案：true 所有人可见，false 仅创建人可见 */
    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = true;

    /** 创建人用户名（私有档案仅此人可见） */
    @Column(name = "created_by", length = 200)
    private String createdBy;

    /** 是否已删除（软删）；公开档案仅系统管理员可删，个人档案创建人可删 */
    @Column(name = "deleted")
    private Boolean deleted = false;

    @Column(name = "deleted_time")
    private LocalDateTime deletedTime;

    @Column(name = "deleted_by", length = 200)
    private String deletedBy;
    
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
        if (relatedPersons != null && relatedPersons.isBlank()) {
            relatedPersons = null;
        }
    }
}
