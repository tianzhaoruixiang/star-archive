package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.ArchiveFusionBatchCreateResultDTO;
import com.stararchive.personmonitor.dto.ArchiveFusionTaskDetailDTO;
import com.stararchive.personmonitor.dto.ArchiveImportTaskDTO;
import com.stararchive.personmonitor.service.ArchiveFusionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 人员档案导入融合 API：上传文件、任务列表、任务详情（提取结果与相似档案）
 */
@RestController
@RequestMapping("/workspace/archive-fusion")
@RequiredArgsConstructor
public class ArchiveFusionController {

    private final ArchiveFusionService archiveFusionService;

    /**
     * 上传文件并创建档案融合任务（解析 -> 大模型抽取 -> 相似匹配）
     */
    @PostMapping(value = "/tasks", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ArchiveImportTaskDTO>> createTask(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "creatorUserId", required = false) Integer creatorUserId,
            @RequestParam(value = "creatorUsername", required = false) String creatorUsername) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请选择文件"));
        }
        String name = file.getOriginalFilename();
        if (name != null && !name.toLowerCase().matches(".*\\.(docx?|xlsx?|csv|pdf)$")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("仅支持 Word(.doc/.docx)、Excel(.xls/.xlsx)、CSV、PDF 格式"));
        }
        ArchiveImportTaskDTO dto = archiveFusionService.createTaskAndExtract(file, creatorUserId, creatorUsername);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    /**
     * 批量上传文件并创建档案融合任务（每个文件一个任务）
     */
    @PostMapping(value = "/tasks/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ArchiveFusionBatchCreateResultDTO>> batchCreateTasks(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "creatorUserId", required = false) Integer creatorUserId,
            @RequestParam(value = "creatorUsername", required = false) String creatorUsername) {
        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请选择至少一个文件"));
        }
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String name = file.getOriginalFilename();
            if (name != null && !name.toLowerCase().matches(".*\\.(docx?|xlsx?|csv|pdf)$")) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("仅支持 Word(.doc/.docx)、Excel(.xls/.xlsx)、CSV、PDF 格式，非法文件: " + name));
            }
        }
        ArchiveFusionBatchCreateResultDTO result =
                archiveFusionService.batchCreateTasksAndExtract(files, creatorUserId, creatorUsername);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 分页查询当前用户的档案融合任务列表
     */
    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<PageResponse<ArchiveImportTaskDTO>>> listTasks(
            @RequestParam(value = "creatorUserId", required = false) Integer creatorUserId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        PageResponse<ArchiveImportTaskDTO> result = archiveFusionService.listTasks(creatorUserId, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 查询任务详情：原始文档全文、提取结果列表及每条结果对应的库内相似档案（支持对比阅读与确认导入）
     */
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<ArchiveFusionTaskDetailDTO>> getTaskDetail(@PathVariable String taskId) {
        try {
            ArchiveFusionTaskDetailDTO detail = archiveFusionService.getTaskDetail(taskId);
            return ResponseEntity.ok(ApiResponse.success(detail));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 人工确认后导入：将选中的提取结果写入 person 表
     */
    @PostMapping("/tasks/{taskId}/confirm-import")
    public ResponseEntity<ApiResponse<java.util.List<String>>> confirmImport(
            @PathVariable String taskId,
            @RequestBody ConfirmImportRequest request) {
        if (request == null || request.getResultIds() == null || request.getResultIds().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请选择要导入的提取结果"));
        }
        java.util.List<String> importedPersonIds = archiveFusionService.confirmImport(taskId, request.getResultIds());
        return ResponseEntity.ok(ApiResponse.success(importedPersonIds));
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ConfirmImportRequest {
        private java.util.List<String> resultIds;
    }
}
