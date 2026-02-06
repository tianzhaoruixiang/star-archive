package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 智能问答 - 知识库 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseDTO {

    private String id;
    private String name;
    private String creatorUsername;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}
