package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 智能问答 - 消息 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QaMessageDTO {

    private String id;
    private String sessionId;
    private String role;
    private String content;
    private LocalDateTime createdTime;
}
