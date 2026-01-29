package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 档案融合任务详情 DTO（任务 + 提取结果列表 + 每条结果的相似人员）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchiveFusionTaskDetailDTO {

    private ArchiveImportTaskDTO task;
    private List<ArchiveExtractResultDTO> extractResults;
}
