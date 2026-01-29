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
 * 人物社交动态实体类
 */
@Entity
@Table(name = "person_social_dynamic")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonSocialDynamic {
    
    @Id
    @Column(name = "dynamic_id", length = 64, nullable = false)
    private String dynamicId;
    
    @Column(name = "social_account_type", nullable = false, length = 50)
    private String socialAccountType;
    
    @Column(name = "social_account", nullable = false, length = 200)
    private String socialAccount;
    
    @Column(name = "title", length = 500)
    private String title;
    
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "image_files", columnDefinition = "json")
    private List<String> imageFiles;
    
    @Column(name = "publish_time", nullable = false)
    private LocalDateTime publishTime;
    
    @Column(name = "publish_location", length = 200)
    private String publishLocation;
    
    @Column(name = "like_count")
    private Long likeCount;
    
    @Column(name = "share_count")
    private Long shareCount;
    
    @Column(name = "comment_count")
    private Long commentCount;
    
    @Column(name = "view_count")
    private Long viewCount;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "related_person_ids", columnDefinition = "json")
    private List<String> relatedPersonIds;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extended_fields", columnDefinition = "json")
    private String extendedFields;
    
    @Column(name = "created_time")
    private LocalDateTime createdTime;
    
    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
