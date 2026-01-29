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
 * 新闻实体类
 */
@Entity
@Table(name = "news")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class News {
    
    @Id
    @Column(name = "news_id", length = 64, nullable = false)
    private String newsId;
    
    @Column(name = "media_name", nullable = false, length = 200)
    private String mediaName;
    
    @Column(name = "title", nullable = false, length = 500)
    private String title;
    
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "authors", columnDefinition = "json")
    private List<String> authors;
    
    @Column(name = "publish_time", nullable = false)
    private LocalDateTime publishTime;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "json")
    private List<String> tags;
    
    @Column(name = "original_url", length = 1000)
    private String originalUrl;
    
    @Column(name = "category", length = 50)
    private String category;
    
    @Column(name = "created_time")
    private LocalDateTime createdTime;
    
    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
