package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.config.OnlyOfficeProperties;
import com.stararchive.personmonitor.dto.ArchiveFusionBatchCreateResultDTO;
import com.stararchive.personmonitor.dto.ArchiveFusionTaskDetailDTO;
import com.stararchive.personmonitor.dto.ArchiveImportTaskDTO;
import com.stararchive.personmonitor.dto.OnlyOfficePreviewConfigDTO;
import com.stararchive.personmonitor.entity.ArchiveImportTask;
import com.stararchive.personmonitor.service.ArchiveFusionService;
import com.stararchive.personmonitor.service.SeaweedFSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

/**
 * 人员档案导入融合 API：上传文件、任务列表、任务详情（提取结果与相似档案）
 */
@Slf4j
@RestController
@RequestMapping("/workspace/archive-fusion")
@RequiredArgsConstructor
public class ArchiveFusionController {

    private final ArchiveFusionService archiveFusionService;
    private final SeaweedFSService seaweedFSService;
    private final OnlyOfficeProperties onlyOfficeProperties;

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
     * 获取任务对应档案文件的下载/预览流。
     * download=1 时设置 Content-Disposition: attachment 触发下载；否则为内联预览。
     */
    @GetMapping("/tasks/{taskId}/file")
    public ResponseEntity<byte[]> getTaskFile(
            @PathVariable String taskId,
            @RequestParam(value = "download", defaultValue = "0") int download) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            log.warn("档案文件下载: 任务不存在 taskId={}", taskId);
            return ResponseEntity.notFound().build();
        }
        ArchiveImportTask task = taskOpt.get();
        String path = task.getFilePathId();
        if (path == null || path.isBlank()) {
            log.warn("档案文件下载: 任务未关联文件 taskId={}", taskId);
            return ResponseEntity.notFound().build();
        }
        byte[] data = seaweedFSService.download(path);
        if (data == null || data.length == 0) {
            log.warn("档案文件下载: SeaweedFS 拉取失败或为空 taskId={}, path={}", taskId, path);
            return ResponseEntity.notFound().build();
        }
        log.debug("档案文件下载: 成功 taskId={}, size={}", taskId, data.length);
        MediaType contentType = contentTypeFromFileName(task.getFileName());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(contentType);
        String filename = task.getFileName() != null ? task.getFileName() : "file";
        if (download == 1) {
            String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" + encoded);
        } else {
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"");
        }
        return ResponseEntity.ok().headers(headers).body(data);
    }

    /**
     * 获取 OnlyOffice 预览配置：前端用此配置加载 OnlyOffice 并打开文档。
     * documentUrl 为 OnlyOffice 服务端可访问的文档地址（需与 onlyoffice.document-download-base 同网可达）。
     */
    @GetMapping("/tasks/{taskId}/preview-config")
    public ResponseEntity<ApiResponse<OnlyOfficePreviewConfigDTO>> getPreviewConfig(@PathVariable String taskId) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            log.warn("预览配置: 任务不存在 taskId={}", taskId);
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        ArchiveImportTask task = taskOpt.get();
        String path = task.getFilePathId();
        if (path == null || path.isBlank()) {
            log.warn("预览配置: 任务未关联文件 taskId={}, filePathId=null", taskId);
            return ResponseEntity.status(404).body(ApiResponse.error("任务未关联文件，无法预览"));
        }
        String docServerUrl = onlyOfficeProperties != null ? onlyOfficeProperties.getDocumentServerUrl() : null;
        String docDownloadBase = onlyOfficeProperties != null ? onlyOfficeProperties.getDocumentDownloadBase() : null;
        boolean enabled = onlyOfficeProperties == null || onlyOfficeProperties.isEnabled();
        if (docDownloadBase == null || docDownloadBase.isBlank()) {
            docDownloadBase = "http://localhost:8000/littlesmall/api";
        }
        if (docServerUrl == null || docServerUrl.isBlank()) {
            docServerUrl = "http://localhost:8081";
        }
        String base = docDownloadBase.replaceAll("/$", "");
        String documentUrl = base + "/workspace/archive-fusion/tasks/" + taskId + "/file";
        String fileType = task.getFileType() != null ? task.getFileType().toLowerCase() : "docx";
        String title = task.getFileName() != null ? task.getFileName() : "document." + fileType;
        String documentType = isCellType(fileType) ? "cell" : "word";

        log.info("OnlyOffice 预览配置: taskId={}, documentUrl={} (OnlyOffice 需能访问该地址)", taskId, documentUrl);
        OnlyOfficePreviewConfigDTO config = OnlyOfficePreviewConfigDTO.builder()
                .documentServerUrl(docServerUrl)
                .documentUrl(documentUrl)
                .documentKey(taskId)
                .fileType(fileType)
                .title(title)
                .documentType(documentType)
                .enabled(enabled)
                .build();
        return ResponseEntity.ok(ApiResponse.success(config));
    }

    private static boolean isCellType(String fileType) {
        return "xlsx".equals(fileType) || "xls".equals(fileType) || "csv".equals(fileType);
    }

    private static MediaType contentTypeFromFileName(String fileName) {
        if (fileName == null) return MediaType.APPLICATION_OCTET_STREAM;
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".docx")) return MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        if (lower.endsWith(".doc")) return MediaType.parseMediaType("application/msword");
        if (lower.endsWith(".xlsx")) return MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        if (lower.endsWith(".xls")) return MediaType.parseMediaType("application/vnd.ms-excel");
        if (lower.endsWith(".csv")) return MediaType.parseMediaType("text/csv");
        if (lower.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        return MediaType.APPLICATION_OCTET_STREAM;
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
