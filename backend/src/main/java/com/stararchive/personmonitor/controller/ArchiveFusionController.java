package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.ArchiveExtractResultDTO;
import com.stararchive.personmonitor.config.OnlyOfficeProperties;
import com.stararchive.personmonitor.dto.ArchiveFusionBatchCreateResultDTO;
import com.stararchive.personmonitor.dto.ArchiveFusionTaskDetailDTO;
import com.stararchive.personmonitor.dto.ArchiveImportTaskDTO;
import com.stararchive.personmonitor.dto.OnlyOfficePreviewConfigDTO;
import com.stararchive.personmonitor.entity.ArchiveImportTask;
import com.stararchive.personmonitor.entity.SysUser;
import com.stararchive.personmonitor.service.ArchiveFusionService;
import com.stararchive.personmonitor.service.OnlyOfficePreviewTokenService;
import com.stararchive.personmonitor.service.SeaweedFSService;
import com.stararchive.personmonitor.service.SystemConfigService;
import com.stararchive.personmonitor.service.SysUserService;
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
    private final SysUserService sysUserService;
    private final OnlyOfficeProperties onlyOfficeProperties;
    private final OnlyOfficePreviewTokenService onlyOfficePreviewTokenService;
    private final SystemConfigService systemConfigService;

    /**
     * 上传文件并创建档案融合任务（解析 -> 大模型抽取 -> 相似匹配）
     */
    @PostMapping(value = "/tasks", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ArchiveImportTaskDTO>> createTask(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "creatorUserId", required = false) Integer creatorUserId,
            @RequestParam(value = "creatorUsername", required = false) String creatorUsername,
            @RequestParam(value = "similarMatchFields", required = false) String similarMatchFields) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请选择文件"));
        }
        String name = file.getOriginalFilename();
        if (name != null && !name.toLowerCase().matches(".*\\.(docx?|xlsx?|csv|pdf)$")) {
            return ResponseEntity.badRequest().body(ApiResponse.error("仅支持 Word(.doc/.docx)、Excel(.xls/.xlsx)、CSV、PDF 格式"));
        }
        ArchiveImportTaskDTO dto = archiveFusionService.createTaskAndExtract(file, creatorUserId, creatorUsername, similarMatchFields);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    /**
     * 批量上传文件并创建档案融合任务（每个文件一个任务）
     */
    @PostMapping(value = "/tasks/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ArchiveFusionBatchCreateResultDTO>> batchCreateTasks(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "creatorUserId", required = false) Integer creatorUserId,
            @RequestParam(value = "creatorUsername", required = false) String creatorUsername,
            @RequestParam(value = "similarMatchFields", required = false) String similarMatchFields) {
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
                archiveFusionService.batchCreateTasksAndExtract(files, creatorUserId, creatorUsername, similarMatchFields);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 分页查询当前用户的档案融合任务列表（仅返回 X-Username 对应用户创建的任务）
     */
    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<PageResponse<ArchiveImportTaskDTO>>> listTasks(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        PageResponse<ArchiveImportTaskDTO> result = archiveFusionService.listTasks(currentUsername, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 失败任务重新导入：仅允许状态为 FAILED 的任务，仅任务创建人可操作。
     */
    @PutMapping("/tasks/{taskId}/retry")
    public ResponseEntity<ApiResponse<ArchiveImportTaskDTO>> retryTask(
            @PathVariable String taskId,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        if (!isTaskCreator(taskOpt.get(), currentUsername)) {
            return ResponseEntity.status(403).body(ApiResponse.error("仅任务创建人可重新导入"));
        }
        try {
            ArchiveImportTaskDTO dto = archiveFusionService.retryTask(taskId);
            return ResponseEntity.ok(ApiResponse.success("已提交重新导入，后台将重新提取", dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 删除档案融合导入任务：仅任务创建人可操作；删除任务及关联的提取结果、相似匹配记录。
     */
    @DeleteMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            @PathVariable String taskId,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        if (!isTaskCreator(taskOpt.get(), currentUsername)) {
            return ResponseEntity.status(403).body(ApiResponse.error("仅任务创建人可删除"));
        }
        try {
            archiveFusionService.deleteTask(taskId);
            return ResponseEntity.ok(ApiResponse.success("删除成功", null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /** 仅任务创建人可访问详情/文件/预览；无创建人的旧任务视为可访问 */
    private static boolean isTaskCreator(ArchiveImportTask task, String currentUsername) {
        if (task.getCreatorUsername() == null || task.getCreatorUsername().isBlank()) {
            return true;
        }
        return currentUsername != null && currentUsername.trim().equals(task.getCreatorUsername().trim());
    }

    /**
     * 获取任务对应档案文件的下载/预览流。
     * download=1 时设置 Content-Disposition: attachment 触发下载；否则为内联预览。
     * 仅任务创建人可访问；OnlyOffice 拉取文件时无 X-Username，需通过 previewToken 放行。
     */
    @GetMapping("/tasks/{taskId}/file")
    public ResponseEntity<byte[]> getTaskFile(
            @PathVariable String taskId,
            @RequestParam(value = "download", defaultValue = "0") int download,
            @RequestParam(value = "previewToken", required = false) String previewToken,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            log.warn("档案文件下载: 任务不存在 taskId={}", taskId);
            return ResponseEntity.notFound().build();
        }
        ArchiveImportTask task = taskOpt.get();
        boolean allowedByToken = previewToken != null && !previewToken.isBlank()
                && onlyOfficePreviewTokenService.validateToken(previewToken, taskId);
        if (!allowedByToken && !isTaskCreator(task, currentUsername)) {
            log.warn("档案文件下载: 无有效 previewToken 且非任务创建人 taskId={}", taskId);
            return ResponseEntity.notFound().build();
        }
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
     * 获取 OnlyOffice 预览配置：前端用此配置加载 OnlyOffice 并打开文档。仅任务创建人可访问。
     * documentUrl 使用后端配置的 document-download-base，不经前端 Nginx 转发，OnlyOffice 服务端直接访问后端拉取文档。
     */
    @GetMapping("/tasks/{taskId}/preview-config")
    public ResponseEntity<ApiResponse<OnlyOfficePreviewConfigDTO>> getPreviewConfig(
            @PathVariable String taskId,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            log.warn("预览配置: 任务不存在 taskId={}", taskId);
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        ArchiveImportTask task = taskOpt.get();
        if (!isTaskCreator(task, currentUsername)) {
            log.warn("预览配置: 非任务创建人拒绝访问 taskId={}", taskId);
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        String path = task.getFilePathId();
        if (path == null || path.isBlank()) {
            log.warn("预览配置: 任务未关联文件 taskId={}, filePathId=null", taskId);
            return ResponseEntity.status(404).body(ApiResponse.error("任务未关联文件，无法预览"));
        }
        String docServerUrl = null;
        String docDownloadBase = null;
        if (systemConfigService != null) {
            var config = systemConfigService.getConfig();
            if (config.getOnlyofficeDocumentServerUrl() != null && !config.getOnlyofficeDocumentServerUrl().isBlank()) {
                docServerUrl = config.getOnlyofficeDocumentServerUrl().trim();
            }
            if (config.getOnlyofficeDocumentDownloadBase() != null && !config.getOnlyofficeDocumentDownloadBase().isBlank()) {
                docDownloadBase = config.getOnlyofficeDocumentDownloadBase().trim();
            }
        }
        if (docServerUrl == null || docServerUrl.isBlank()) {
            docServerUrl = onlyOfficeProperties != null ? onlyOfficeProperties.getDocumentServerUrl() : null;
        }
        if (docDownloadBase == null || docDownloadBase.isBlank()) {
            docDownloadBase = onlyOfficeProperties != null ? onlyOfficeProperties.getDocumentDownloadBase() : null;
        }
        boolean enabled = onlyOfficeProperties == null || onlyOfficeProperties.isEnabled();
        if (docDownloadBase == null || docDownloadBase.isBlank()) {
            docDownloadBase = "http://localhost:8000/littlesmall/api";
        }
        if (docServerUrl == null || docServerUrl.isBlank()) {
            docServerUrl = "http://localhost:8081";
        }
        String base = docDownloadBase.replaceAll("/$", "");
        String token = onlyOfficePreviewTokenService.createToken(taskId);
        String documentUrl = base + "/workspace/archive-fusion/tasks/" + taskId + "/file?previewToken=" + token;
        String fileType = task.getFileType() != null ? task.getFileType().toLowerCase().replaceAll("^\\.", "") : "docx";
        String title = task.getFileName() != null ? task.getFileName() : "document." + fileType;
        String documentType = isCellType(fileType) ? "cell" : "word";

        log.info("OnlyOffice 预览配置: taskId={}, documentUrl={}, fileType={} (OnlyOffice 服务端需能访问 documentUrl)", taskId, documentUrl, fileType);
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
     * 查询任务详情：仅返回任务信息（不含提取结果列表）。提取结果由分页接口 GET /tasks/{taskId}/extract-results 获取。
     */
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<ApiResponse<ArchiveFusionTaskDetailDTO>> getTaskDetail(
            @PathVariable String taskId,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        if (!isTaskCreator(taskOpt.get(), currentUsername)) {
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        try {
            ArchiveFusionTaskDetailDTO detail = archiveFusionService.getTaskDetail(taskId, currentUsername);
            return ResponseEntity.ok(ApiResponse.success(detail));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 分页查询任务提取结果（含每条结果的库内相似档案）。仅任务创建人可访问。
     */
    @GetMapping("/tasks/{taskId}/extract-results")
    public ResponseEntity<ApiResponse<PageResponse<ArchiveExtractResultDTO>>> getTaskExtractResults(
            @PathVariable String taskId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        if (!isTaskCreator(taskOpt.get(), currentUsername)) {
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        try {
            PageResponse<ArchiveExtractResultDTO> result = archiveFusionService.getTaskExtractResultsPage(taskId, page, size, currentUsername);
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * 人工确认后导入：将选中的提取结果写入 person 表。
     * importAsPublic=true 时仅系统管理员可调用；非管理员传入 true 将返回 403。
     */
    @PostMapping("/tasks/{taskId}/confirm-import")
    public ResponseEntity<ApiResponse<java.util.List<String>>> confirmImport(
            @PathVariable String taskId,
            @RequestBody ConfirmImportRequest request,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        if (request == null || request.getResultIds() == null || request.getResultIds().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请选择要导入的提取结果"));
        }
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        if (!isTaskCreator(taskOpt.get(), currentUsername)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("仅任务创建人可确认导入"));
        }
        boolean importAsPublic = Boolean.TRUE.equals(request.getImportAsPublic());
        if (importAsPublic) {
            SysUser user = currentUsername != null && !currentUsername.isBlank()
                    ? sysUserService.findByUsername(currentUsername.trim()) : null;
            if (user == null || !"admin".equals(user.getRole())) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("仅系统管理员可导入为公开档案"));
            }
        }
        java.util.List<String> batchTags = request.getTags() != null ? request.getTags() : java.util.Collections.emptyList();
        java.util.List<String> importedPersonIds = archiveFusionService.confirmImport(
                taskId, request.getResultIds(), batchTags, importAsPublic);
        return ResponseEntity.ok(ApiResponse.success(importedPersonIds));
    }

    /**
     * 全部导入（异步）：将本任务下所有未导入的提取结果提交给后台异步任务逐批导入，接口立即返回。
     * 请求体同 confirm-import，但 resultIds 无需传递（服务端按任务查询未导入列表）。
     */
    @PostMapping("/tasks/{taskId}/confirm-import-all-async")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> confirmImportAllAsync(
            @PathVariable String taskId,
            @RequestBody ConfirmImportRequest request,
            @RequestHeader(value = "X-Username", required = false) String currentUsername) {
        Optional<ArchiveImportTask> taskOpt = archiveFusionService.getTask(taskId);
        if (taskOpt.isEmpty()) {
            return ResponseEntity.status(404).body(ApiResponse.error("任务不存在"));
        }
        if (!isTaskCreator(taskOpt.get(), currentUsername)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("仅任务创建人可操作"));
        }
        boolean importAsPublic = Boolean.TRUE.equals(request != null && request.getImportAsPublic());
        if (importAsPublic) {
            SysUser user = currentUsername != null && !currentUsername.isBlank()
                    ? sysUserService.findByUsername(currentUsername.trim()) : null;
            if (user == null || !"admin".equals(user.getRole())) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("仅系统管理员可导入为公开档案"));
            }
        }
        java.util.List<String> batchTags = request != null && request.getTags() != null ? request.getTags() : java.util.Collections.emptyList();
        int totalQueued = archiveFusionService.confirmImportAllAsync(taskId, batchTags, importAsPublic);
        if (totalQueued == 0) {
            return ResponseEntity.ok(ApiResponse.success("当前无未导入的提取结果", java.util.Map.of("totalQueued", 0)));
        }
        java.util.Map<String, Object> data = new java.util.HashMap<>();
        data.put("totalQueued", totalQueued);
        return ResponseEntity.ok(ApiResponse.success("已提交，共 " + totalQueued + " 条将后台导入", data));
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ConfirmImportRequest {
        private java.util.List<String> resultIds;
        /** 本批导入为人物统一增加的自定义标签（可选） */
        private java.util.List<String> tags;
        /** 是否以公开档案导入：true=所有人可见，false=仅创建人可见。仅系统管理员可传 true */
        private Boolean importAsPublic;
    }
}
