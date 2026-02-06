package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 智能问答 - 会话 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QaSessionDTO {

    private String id;
    private String kbId;
    private String title;
    private String creatorUsername;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}
