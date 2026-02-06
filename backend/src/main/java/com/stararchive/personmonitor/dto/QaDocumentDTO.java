package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 智能问答 - 文档 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QaDocumentDTO {

    private String id;
    private String kbId;
    private String fileName;
    private String status;
    private String errorMessage;
    private Integer chunkCount;
    private LocalDateTime createdTime;
}
