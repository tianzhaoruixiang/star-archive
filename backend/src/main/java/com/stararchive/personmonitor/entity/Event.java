package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 事件实体：由新闻聚合提取（大模型摘要 + 流式聚类），一个事件对应多条新闻
 */
@Entity
@Table(name = "event")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Event {

    @Id
    @Column(name = "event_id", length = 64, nullable = false)
    private String eventId;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(name = "news_count")
    private Integer newsCount;

    @Column(name = "first_publish_time")
    private LocalDateTime firstPublishTime;

    @Column(name = "last_publish_time")
    private LocalDateTime lastPublishTime;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
