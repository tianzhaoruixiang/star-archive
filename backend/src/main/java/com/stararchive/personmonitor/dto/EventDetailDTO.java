package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 事件详情 DTO（含关联新闻列表）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventDetailDTO {

    private String eventId;
    private String title;
    private String summary;
    private LocalDate eventDate;
    private Integer newsCount;
    private LocalDateTime firstPublishTime;
    private LocalDateTime lastPublishTime;
    /** 关联的新闻列表（按发布时间倒序） */
    private List<NewsDTO> relatedNews;
}
