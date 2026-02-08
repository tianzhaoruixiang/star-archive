package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 事件-新闻关联：一个事件对应多条新闻
 */
@Entity
@Table(name = "event_news")
@IdClass(EventNewsId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventNews implements Serializable {

    @Id
    @Column(name = "event_id", length = 64, nullable = false)
    private String eventId;

    @Id
    @Column(name = "news_id", length = 64, nullable = false)
    private String newsId;

    @Column(name = "publish_time", nullable = false)
    private LocalDateTime publishTime;

    @Column(name = "created_time")
    private LocalDateTime createdTime;
}
