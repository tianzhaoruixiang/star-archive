package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 事件列表项 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventDTO {

    private String eventId;
    private String title;
    private String summary;
    private LocalDate eventDate;
    private Integer newsCount;
    private LocalDateTime firstPublishTime;
    private LocalDateTime lastPublishTime;
}
