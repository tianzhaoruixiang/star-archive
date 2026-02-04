package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stararchive.personmonitor.common.ByteArrayMultipartFile;
import com.stararchive.personmonitor.config.BailianProperties;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.entity.*;
import com.stararchive.personmonitor.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.hwpf.model.PicturesTable;
import org.apache.poi.hwpf.usermodel.CharacterRun;
import org.apache.poi.hwpf.usermodel.Picture;
import org.apache.poi.hwpf.usermodel.Range;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFPictureData;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

import jakarta.persistence.Column;

/**
 * 档案融合异步提取执行器：负责异步执行大模型抽取任务。
 * 从 ArchiveFusionService 分离出来，确保 @Async 注解能正确生效。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveExtractionAsyncExecutor {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_EXTRACTING = "EXTRACTING";
    private static final String STATUS_MATCHING = "MATCHING";
    private static final String STATUS_SUCCESS = "SUCCESS";
    private static final String STATUS_FAILED = "FAILED";

    private final ArchiveImportTaskRepository taskRepository;
    private final ArchiveExtractResultRepository extractResultRepository;
    private final ArchiveSimilarMatchRepository similarMatchRepository;
    private final PersonRepository personRepository;
    private final TagRepository tagRepository;
    private final PersonService personService;
    private final BailianProperties bailianProperties;
    private final SystemConfigService systemConfigService;
    private final SeaweedFSService seaweedFSService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Lazy
    @Autowired
    private ArchiveFusionService archiveFusionService;

    private static final AtomicLong matchIdGenerator = new AtomicLong(System.currentTimeMillis() * 1000);

    /**
     * 异步执行大模型提取：从 SeaweedFS 拉取文件，解析并抽取，更新任务状态与提取结果。
     * 此方法必须从其他 Bean 调用才能触发 @Async 代理。
     */
    @Async
    public void executeExtractionAsync(String taskId) {
        log.info("【档案融合】开始异步提取任务: taskId={}, 线程={}", taskId, Thread.currentThread().getName());
        
        ArchiveImportTask task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            log.warn("【档案融合】任务不存在，跳过提取: taskId={}", taskId);
            return;
        }
        
        String status = task.getStatus();
        log.info("【档案融合】当前任务状态: taskId={}, status={}", taskId, status);
        
        if (!STATUS_PENDING.equals(status) && !STATUS_EXTRACTING.equals(status)) {
            log.warn("【档案融合】任务状态不允许提取（非PENDING/EXTRACTING），跳过: taskId={}, status={}", taskId, status);
            return;
        }
        
        // 更新状态为提取中
        if (STATUS_PENDING.equals(status)) {
            task.setStatus(STATUS_EXTRACTING);
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
            log.info("【档案融合】任务状态更新为 EXTRACTING: taskId={}", taskId);
        }
        
        // 检查文件路径
        String path = task.getFilePathId();
        if (path == null || path.isBlank()) {
            log.error("【档案融合】任务未关联文件存储路径: taskId={}", taskId);
            markTaskFailed(task, "任务未关联文件存储路径");
            return;
        }
        
        log.info("【档案融合】开始从 SeaweedFS 下载文件: taskId={}, path={}", taskId, path);
        byte[] fileBytes;
        try {
            fileBytes = seaweedFSService.download(path);
        } catch (Exception e) {
            log.error("【档案融合】SeaweedFS 下载文件异常: taskId={}, path={}", taskId, path, e);
            markTaskFailed(task, "下载文件失败: " + e.getMessage());
            return;
        }
        
        if (fileBytes == null || fileBytes.length == 0) {
            log.error("【档案融合】SeaweedFS 下载的文件为空: taskId={}, path={}", taskId, path);
            markTaskFailed(task, "无法从存储下载文件");
            return;
        }
        
        log.info("【档案融合】文件下载成功: taskId={}, 文件大小={}字节", taskId, fileBytes.length);
        
        MultipartFile file = new ByteArrayMultipartFile("file", task.getFileName(), fileBytes);
        performExtractionWithFile(taskId, file);
    }

    /**
     * 根据已上传文件执行解析与大模型抽取，写入提取结果并更新任务状态。
     */
    private void performExtractionWithFile(String taskId, MultipartFile file) {
        ArchiveImportTask task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            log.warn("【档案融合】执行提取时任务不存在: taskId={}", taskId);
            return;
        }

        String fileName = task.getFileName() != null ? task.getFileName() : "（未知）";
        String fileTypeUpper = task.getFileType() != null ? task.getFileType().toUpperCase() : "";
        log.info("【档案融合】开始解析文件: taskId={}, fileName={}, fileType={}", taskId, fileName, fileTypeUpper);

        try {
            List<Tag> allTags = tagRepository.findAllOrderByHierarchy();
            log.info("【档案融合】已加载参考标签数量: {}", allTags.size());

            if ("XLSX".equals(fileTypeUpper) || "XLS".equals(fileTypeUpper)) {
                log.info("【档案融合】开始解析 Excel 文件: taskId={}", taskId);
                List<String> rowTexts = parseExcelToRowTexts(file);
                log.info("【档案融合】Excel 解析完成: taskId={}, 行数={}", taskId, rowTexts.size());
                
                if (rowTexts.isEmpty()) {
                    log.error("【档案融合】Excel 解析后无有效行: taskId={}", taskId);
                    markTaskFailed(task, "Excel 解析后无有效行");
                    return;
                }
                task.setOriginalText(String.join("\n\n------\n\n", rowTexts));
                int totalRows = rowTexts.size() - 1;
                task.setTotalExtractCount(totalRows > 0 ? totalRows : 0);
                task.setExtractCount(0);
                taskRepository.save(task);
                
                int savedIndex = 0;
                for (int i = 1; i < rowTexts.size(); i++) {
                    String rowText = rowTexts.get(i);
                    if (rowText == null || rowText.isBlank()) continue;
                    
                    log.info("【档案融合】开始提取 Excel 第{}行: taskId={}", i + 1, taskId);
                    try {
                        List<Map<String, Object>> one = extractOnePersonByQwen(rowText, fileName, allTags, taskId);
                        if (!one.isEmpty()) {
                            task = taskRepository.findById(taskId).orElse(task);
                            saveOneExtractAndUpdateProgress(task, savedIndex, rowText, one.get(0));
                            savedIndex++;
                            log.info("【档案融合】Excel 第{}行提取成功: taskId={}, 提取姓名={}", i + 1, taskId, one.get(0).get("original_name"));
                        } else {
                            log.warn("【档案融合】Excel 第{}行未提取到人物: taskId={}", i + 1, taskId);
                        }
                    } catch (Exception e) {
                        log.warn("【档案融合】Excel 第{}行提取失败，已跳过: taskId={}, 错误={}", i + 1, taskId, e.getMessage(), e);
                    }
                }
                task = taskRepository.findById(taskId).orElse(task);
                task.setStatus(STATUS_SUCCESS);
                LocalDateTime now = LocalDateTime.now();
                task.setUpdatedTime(now);
                task.setCompletedTime(now);
                taskRepository.save(task);
                log.info("【档案融合】任务完成: taskId={}, extractCount={}", taskId, task.getExtractCount());
            } else if ("CSV".equals(fileTypeUpper)) {
                log.info("【档案融合】开始解析 CSV 文件: taskId={}", taskId);
                List<String> lineTexts = parseCsvToLines(file);
                log.info("【档案融合】CSV 解析完成: taskId={}, 行数={}", taskId, lineTexts.size());
                
                if (lineTexts.isEmpty()) {
                    log.error("【档案融合】CSV 解析后无有效行: taskId={}", taskId);
                    markTaskFailed(task, "CSV 解析后无有效行");
                    return;
                }
                task.setOriginalText(String.join("\n\n--- 下一行 ---\n\n", lineTexts));
                int totalLines = lineTexts.size() - 1;
                task.setTotalExtractCount(totalLines > 0 ? totalLines : 0);
                task.setExtractCount(0);
                taskRepository.save(task);
                
                int savedIndex = 0;
                for (int i = 1; i < lineTexts.size(); i++) {
                    String lineText = lineTexts.get(i);
                    if (lineText == null || lineText.isBlank()) continue;
                    
                    log.info("【档案融合】开始提取 CSV 第{}行: taskId={}", i + 1, taskId);
                    try {
                        List<Map<String, Object>> one = extractOnePersonByQwen(lineText, fileName, allTags, taskId);
                        if (!one.isEmpty()) {
                            task = taskRepository.findById(taskId).orElse(task);
                            saveOneExtractAndUpdateProgress(task, savedIndex, lineText, one.get(0));
                            savedIndex++;
                            log.info("【档案融合】CSV 第{}行提取成功: taskId={}, 提取姓名={}", i + 1, taskId, one.get(0).get("original_name"));
                        } else {
                            log.warn("【档案融合】CSV 第{}行未提取到人物: taskId={}", i + 1, taskId);
                        }
                    } catch (Exception e) {
                        log.warn("【档案融合】CSV 第{}行提取失败，已跳过: taskId={}, 错误={}", i + 1, taskId, e.getMessage(), e);
                    }
                }
                task = taskRepository.findById(taskId).orElse(task);
                task.setStatus(STATUS_SUCCESS);
                LocalDateTime now = LocalDateTime.now();
                task.setUpdatedTime(now);
                task.setCompletedTime(now);
                taskRepository.save(task);
                log.info("【档案融合】任务完成: taskId={}, extractCount={}", taskId, task.getExtractCount());
            } else {
                log.info("【档案融合】开始解析文档文件: taskId={}, fileType={}", taskId, fileTypeUpper);
                String text = parseFileToText(file, task.getFileType());
                
                if (text == null || text.isBlank()) {
                    log.error("【档案融合】文档解析后无有效文本: taskId={}", taskId);
                    markTaskFailed(task, "文件解析后无有效文本");
                    return;
                }
                
                log.info("【档案融合】文档解析完成: taskId={}, 文本长度={}", taskId, text.length());
                task.setOriginalText(text);
                task.setTotalExtractCount(1);
                task.setExtractCount(0);
                taskRepository.save(task);
                
                List<String> avatarPaths = extractAndUploadImagesFromFile(file, task.getFileType(), taskId);
                log.info("【档案融合】开始大模型提取人物信息: taskId={}", taskId);
                List<Map<String, Object>> one = extractOnePersonByQwen(text, fileName, allTags, taskId);
                if (!one.isEmpty()) {
                    Map<String, Object> personMap = one.get(0);
                    if (!avatarPaths.isEmpty()) {
                        personMap.put("avatar_files", avatarPaths);
                    }
                    task = taskRepository.findById(taskId).orElse(task);
                    saveOneExtractAndUpdateProgress(task, 0, text, personMap);
                    log.info("【档案融合】文档提取成功: taskId={}, 提取姓名={}", taskId, personMap.get("original_name"));
                } else {
                    log.warn("【档案融合】文档未提取到人物信息: taskId={}", taskId);
                }
                task = taskRepository.findById(taskId).orElse(task);
                task.setStatus(STATUS_SUCCESS);
                LocalDateTime now = LocalDateTime.now();
                task.setUpdatedTime(now);
                task.setCompletedTime(now);
                taskRepository.save(task);
                log.info("【档案融合】任务完成: taskId={}, extractCount={}", taskId, task.getExtractCount());
            }
            
        } catch (Exception e) {
            log.error("【档案融合】任务执行异常: taskId={}", taskId, e);
            markTaskFailed(task, e.getMessage() != null ? e.getMessage() : "未知错误");
        }
    }

    private static final int CONFIRM_IMPORT_CHUNK_SIZE = 100;

    /**
     * 异步执行「全部导入」：将 resultIds 分批调用 ArchiveFusionService.confirmImport，每批 {@value #CONFIRM_IMPORT_CHUNK_SIZE} 条。
     * 此方法必须从其他 Bean 调用才能触发 @Async 代理。
     */
    @Async
    public void runConfirmImportAllAsync(String taskId, List<String> resultIds, List<String> tags, boolean importAsPublic) {
        if (resultIds == null || resultIds.isEmpty()) {
            return;
        }
        log.info("【档案融合】开始异步全部导入: taskId={}, 共 {} 条", taskId, resultIds.size());
        int totalImported = 0;
        for (int i = 0; i < resultIds.size(); i += CONFIRM_IMPORT_CHUNK_SIZE) {
            int to = Math.min(i + CONFIRM_IMPORT_CHUNK_SIZE, resultIds.size());
            List<String> chunk = resultIds.subList(i, to);
            try {
                List<String> imported = archiveFusionService.confirmImport(taskId, chunk, tags, importAsPublic);
                totalImported += imported.size();
                log.info("【档案融合】全部导入进度: taskId={}, 本批 {} 条, 累计 {} 条", taskId, chunk.size(), totalImported);
            } catch (Exception e) {
                log.warn("【档案融合】全部导入某批失败: taskId={}, chunkSize={}", taskId, chunk.size(), e);
            }
        }
        log.info("【档案融合】异步全部导入完成: taskId={}, 共导入 {} 条", taskId, totalImported);
    }

    /**
     * 标记任务失败
     */
    private void markTaskFailed(ArchiveImportTask task, String errorMessage) {
        task.setStatus(STATUS_FAILED);
        task.setErrorMessage(errorMessage);
        LocalDateTime now = LocalDateTime.now();
        task.setUpdatedTime(now);
        task.setCompletedTime(now);
        taskRepository.save(task);
        log.error("【档案融合】任务标记为失败: taskId={}, errorMessage={}", task.getTaskId(), errorMessage);
    }

    /**
     * 从一段文本中抽取一个人物档案
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractOnePersonByQwen(String text, String fileName, List<Tag> allTags, String taskId) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> fromLlm = callLlmExtractOnePerson(text, fileName, allTags != null ? allTags : List.of(), taskId);
        if (!fromLlm.isEmpty()) {
            return fromLlm;
        }
        throw new IllegalArgumentException("大模型提取错误");
    }

    /**
     * 调用大模型接口提取人物信息
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> callLlmExtractOnePerson(String text, String fileName, List<Tag> allTags, String taskId) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        
        String apiKey = resolveLlmApiKey();
        String baseUrl = resolveLlmBaseUrl();
        String model = resolveLlmModel();
        
        log.info("【档案融合-大模型】准备调用: taskId={}, baseUrl={}, model={}, apiKey已配置={}", 
                taskId, baseUrl, model, apiKey != null && !apiKey.isBlank());
        
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("【档案融合-大模型】未配置 API Key（系统配置与 bailian 均未配置），跳过大模型抽取: taskId={}", taskId);
            return Collections.emptyList();
        }
        
        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";
        StringBuilder userContent = new StringBuilder();
        userContent.append("本批上传文件名：").append(fileName != null ? fileName : "（未知）").append("\n\n");
        userContent.append("参考标签表（person_tags 只能从以下标签名中选择，可多选，标签名需与下表完全一致）：\n");
        userContent.append(formatTagListForLlm(allTags)).append("\n\n");
        userContent.append("请结合【文件名】与【下方人物档案文本】抽取一个人物档案，重点根据文件名和档案内容推断 person_tags，按上述 person 表结构返回一个 JSON 对象：\n\n");
        userContent.append(text.substring(0, Math.min(12000, text.length())));

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        String basePrompt = resolveExtractPrompt();
        String structurePart = buildPersonTableStructureDescription();
        String systemPrompt = basePrompt + "\n\n【当前人物表 person 结构】\n" + structurePart
                + "\n请严格按上述字段名与类型返回一个 JSON 对象，只返回一个对象不要包在数组里。";
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userContent.toString())
        ));
        body.put("response_format", Map.of("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("【档案融合-大模型】发送请求: taskId={}, url={}, 内容长度={}", taskId, url, userContent.length());
        long startTime = System.currentTimeMillis();
        
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            long elapsed = System.currentTimeMillis() - startTime;
            log.info("【档案融合-大模型】收到响应: taskId={}, 状态码={}, 耗时={}ms", taskId, response.getStatusCode(), elapsed);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.debug("【档案融合-大模型】响应体: taskId={}, body={}", taskId, 
                        response.getBody().length() > 500 ? response.getBody().substring(0, 500) + "..." : response.getBody());
                        
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && choices.size() > 0) {
                    String content = choices.get(0).path("message").path("content").asText();
                    content = unwrapJsonFromMarkdown(content);
                    log.debug("【档案融合-大模型】解析 content: taskId={}, content={}", taskId, 
                            content.length() > 500 ? content.substring(0, 500) + "..." : content);
                            
                    JsonNode data = objectMapper.readTree(content);
                    JsonNode personNode = data.has("person") ? data.path("person") : data;
                    if (personNode.isObject()) {
                        Map<String, Object> map = objectMapper.convertValue(personNode, Map.class);
                        log.info("【档案融合-大模型】提取成功: taskId={}, 姓名={}", taskId, map.get("original_name"));
                        return List.of(map);
                    } else {
                        log.warn("【档案融合-大模型】响应格式异常，personNode 不是对象: taskId={}", taskId);
                    }
                } else {
                    log.warn("【档案融合-大模型】响应 choices 为空: taskId={}", taskId);
                }
            } else {
                log.warn("【档案融合-大模型】响应非 2xx 或 body 为空: taskId={}, status={}", taskId, response.getStatusCode());
            }
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startTime;
            log.error("【档案融合-大模型】调用异常: taskId={}, 耗时={}ms, 错误={}", taskId, elapsed, e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    /** 若 content 被 ```json ... ``` 包裹，则取出中间 JSON 字符串 */
    private static String unwrapJsonFromMarkdown(String content) {
        if (content == null) return "";
        String s = content.trim();
        if (s.startsWith("```")) {
            int start = s.indexOf('\n');
            if (start > 0 && s.endsWith("```")) {
                return s.substring(start + 1, s.length() - 3).trim();
            }
        }
        return s;
    }

    /** 将标签表格式化为大模型可读的参考列表 */
    private static String formatTagListForLlm(List<Tag> tags) {
        if (tags == null || tags.isEmpty()) {
            return "（当前无参考标签，person_tags 请返回 []）";
        }
        StringBuilder sb = new StringBuilder();
        for (Tag t : tags) {
            String name = t.getTagName() != null ? t.getTagName().trim() : "";
            if (name.isEmpty()) continue;
            String first = t.getFirstLevelName() != null ? t.getFirstLevelName().trim() : "";
            String second = t.getSecondLevelName() != null ? t.getSecondLevelName().trim() : "";
            if (!first.isEmpty() || !second.isEmpty()) {
                sb.append("- ").append(name).append(" （分类：").append(first);
                if (!second.isEmpty()) sb.append("-").append(second);
                sb.append("）\n");
            } else {
                sb.append("- ").append(name).append("\n");
            }
        }
        return sb.length() > 0 ? sb.toString() : "（当前无参考标签，person_tags 请返回 []）";
    }

    /** 大模型配置优先使用系统配置，为空时回退到 application.yml 的 bailian 配置 */
    private String resolveLlmApiKey() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmApiKey() != null && !cfg.getLlmApiKey().isBlank()) {
            return cfg.getLlmApiKey();
        }
        return bailianProperties.getApiKey() != null ? bailianProperties.getApiKey() : "";
    }

    private String resolveLlmBaseUrl() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmBaseUrl() != null && !cfg.getLlmBaseUrl().isBlank()) {
            return cfg.getLlmBaseUrl().trim();
        }
        return bailianProperties.getBaseUrl() != null ? bailianProperties.getBaseUrl() : "";
    }

    private String resolveLlmModel() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmModel() != null && !cfg.getLlmModel().isBlank()) {
            return cfg.getLlmModel().trim();
        }
        return bailianProperties.getModel() != null ? bailianProperties.getModel() : "qwen-plus";
    }

    /** 人物档案提取提示词：优先使用系统配置，为空则使用内置默认 */
    private String resolveExtractPrompt() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmExtractPrompt() != null && !cfg.getLlmExtractPrompt().isBlank()) {
            return cfg.getLlmExtractPrompt().trim();
        }
        return SystemConfigService.getDefaultExtractPrompt();
    }

    /**
     * 实时根据 Person 实体生成人物表结构描述，供大模型提示词使用。
     * 排除系统字段：person_id、is_public、created_by、created_time、updated_time。
     */
    private String buildPersonTableStructureDescription() {
        Set<String> excludeColumns = Set.of("person_id", "is_key_person", "is_public", "created_by", "created_time", "updated_time");
        List<String> lines = new ArrayList<>();
        for (Field field : Person.class.getDeclaredFields()) {
            if (Modifier.isStatic(field.getModifiers()) || Modifier.isTransient(field.getModifiers())) {
                continue;
            }
            Column col = field.getAnnotation(Column.class);
            if (col == null) continue;
            String columnName = col.name() != null && !col.name().isBlank() ? col.name() : camelToSnake(field.getName());
            if (excludeColumns.contains(columnName)) continue;

            String typeDesc = typeDescription(field.getType());
            if (typeDesc == null) continue;
            lines.add("- " + columnName + "(" + typeDesc + ")");
        }
        return lines.isEmpty() ? "（无法获取表结构）" : String.join("\n", lines);
    }

    private static String typeDescription(Class<?> type) {
        if (type == String.class) return "字符串";
        if (type == Boolean.class || type == boolean.class) return "布尔";
        if (type == LocalDateTime.class) return "日期 yyyy-MM-dd";
        if (List.class.isAssignableFrom(type)) return "JSON数组";
        return null;
    }

    private static String camelToSnake(String camel) {
        if (camel == null || camel.isEmpty()) return camel;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < camel.length(); i++) {
            char c = camel.charAt(i);
            if (Character.isUpperCase(c)) {
                if (sb.length() > 0) sb.append('_');
                sb.append(Character.toLowerCase(c));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    /**
     * 保存单条提取结果、相似匹配，并更新任务已提取数量与进度（立即入库）
     */
    private void saveOneExtractAndUpdateProgress(ArchiveImportTask task, int extractIndex, String originalText,
                                                 Map<String, Object> personMap) {
        String taskId = task.getTaskId();
        String resultId = UUID.randomUUID().toString().replace("-", "");
        String originalName = stringOrNull(personMap.get("original_name"));
        String birthDateStr = stringOrNull(personMap.get("birth_date"));
        String gender = stringOrNull(personMap.get("gender"));
        String nationality = stringOrNull(personMap.get("nationality"));
        LocalDate birthDate = parseBirthDate(birthDateStr);

        try {
            String rawJson = objectMapper.writeValueAsString(personMap);
            ArchiveExtractResult result = ArchiveExtractResult.builder()
                    .resultId(resultId)
                    .taskId(taskId)
                    .extractIndex(extractIndex)
                    .originalName(originalName)
                    .birthDate(birthDate)
                    .gender(gender)
                    .nationality(nationality)
                    .originalText(originalText)
                    .rawJson(rawJson)
                    .confirmed(false)
                    .imported(false)
                    .importedPersonId(null)
                    .createdTime(LocalDateTime.now())
                    .build();
            extractResultRepository.save(result);
            log.info("【档案融合】保存提取结果: taskId={}, resultId={}, originalName={}, index={}", taskId, resultId, originalName, extractIndex);

            Set<String> matchFields = parseSimilarMatchFields(task.getSimilarMatchFields());
            List<Person> similar = findSimilarPersons(matchFields, originalName, birthDate, gender, nationality, task.getCreatorUsername());
            for (Person person : similar) {
                ArchiveSimilarMatch match = ArchiveSimilarMatch.builder()
                        .matchId(matchIdGenerator.incrementAndGet())
                        .taskId(taskId)
                        .resultId(resultId)
                        .personId(person.getPersonId())
                        .createdTime(LocalDateTime.now())
                        .build();
                similarMatchRepository.save(match);
            }

            int newCount = (task.getExtractCount() != null ? task.getExtractCount() : 0) + 1;
            task.setExtractCount(newCount);
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
            log.info("【档案融合】进度更新: taskId={}, 已提取={}/{}", taskId, newCount, task.getTotalExtractCount() != null ? task.getTotalExtractCount() : "?");
        } catch (Exception e) {
            log.warn("【档案融合】保存单条结果失败: taskId={}, index={}, error={}", taskId, extractIndex, e.getMessage());
        }
    }

    private static final Set<String> SIMILAR_MATCH_ALLOWED = Set.of("originalName", "birthDate", "gender", "nationality");

    private static Set<String> parseSimilarMatchFields(String similarMatchFields) {
        if (similarMatchFields == null || similarMatchFields.isBlank()) {
            return Set.of("originalName", "birthDate", "gender", "nationality");
        }
        return Arrays.stream(similarMatchFields.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty() && SIMILAR_MATCH_ALLOWED.contains(s))
                .collect(Collectors.toSet());
    }

    /**
     * 相似档案查询：按任务配置的属性组合匹配
     */
    private List<Person> findSimilarPersons(Set<String> matchFields, String originalName, LocalDate birthDate,
                                            String gender, String nationality, String currentUsername) {
        if (matchFields == null || matchFields.isEmpty()) {
            return Collections.emptyList();
        }
        if (matchFields.contains("originalName") && (originalName == null || originalName.isBlank())) {
            return Collections.emptyList();
        }
        if (matchFields.contains("birthDate") && birthDate == null) {
            return Collections.emptyList();
        }
        if (matchFields.contains("gender") && (gender == null || gender.isBlank())) {
            return Collections.emptyList();
        }
        if (matchFields.contains("nationality") && (nationality == null || nationality.isBlank())) {
            return Collections.emptyList();
        }
        List<Person> all = personRepository.findSimilarByFields(matchFields, originalName, birthDate, gender, nationality);
        String user = (currentUsername != null && !currentUsername.isBlank()) ? currentUsername.trim() : null;
        return all.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsPublic()) || (user != null && user.equals(p.getCreatedBy())))
                .collect(Collectors.toList());
    }

    // ==================== 文件解析方法 ====================

    private String parseFileToText(MultipartFile file, String fileType) throws Exception {
        switch (fileType.toUpperCase()) {
            case "DOCX":
                return parseDocx(file);
            case "DOC":
                return parseDoc(file);
            case "PDF":
                return parsePdf(file);
            default:
                throw new IllegalArgumentException("不支持的文件类型: " + fileType + "，仅支持 Word(.doc/.docx)、PDF");
        }
    }

    /**
     * 解析 Excel 为多行文本。第一个 sheet 的首行作为表头（列名），所有 sheet 的数据行格式化为「列名: 值」便于大模型理解。
     * 返回：第 0 项为表头行（空格拼接，用于原文展示），第 1..n 项为数据行（列名: 值，换行分隔）。
     */
    private List<String> parseExcelToRowTexts(MultipartFile file) throws Exception {
        List<String> rowTexts = new ArrayList<>();
        List<String> headerNames = null;
        int maxCol = 0;
        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;
                    int lastCellNum = row.getLastCellNum() <= 0 ? 0 : row.getLastCellNum();
                    if (headerNames == null && s == 0 && r == 0) {
                        headerNames = new ArrayList<>();
                        for (int c = 0; c < lastCellNum; c++) {
                            Cell cell = row.getCell(c);
                            String name = cell != null ? getCellString(cell) : null;
                            if (name == null || name.isBlank()) {
                                name = "列" + (c + 1);
                            } else {
                                name = name.trim();
                            }
                            headerNames.add(name);
                        }
                        maxCol = headerNames.size();
                        String headerLine = String.join(" ", headerNames);
                        rowTexts.add(headerLine.isBlank() ? "(表头)" : headerLine);
                        continue;
                    }
                    if (headerNames == null || headerNames.isEmpty()) {
                        headerNames = new ArrayList<>();
                        for (int c = 0; c < lastCellNum; c++) headerNames.add("列" + (c + 1));
                        maxCol = headerNames.size();
                        rowTexts.add(String.join(" ", headerNames));
                        continue;
                    }
                    StringBuilder sb = new StringBuilder();
                    for (int c = 0; c < maxCol; c++) {
                        String colName = c < headerNames.size() ? headerNames.get(c) : ("列" + (c + 1));
                        Cell cell = row.getCell(c);
                        String v = cell != null ? getCellString(cell) : null;
                        if (v != null) v = v.trim();
                        if (v == null) v = "";
                        if (sb.length() > 0) sb.append("\n");
                        sb.append(colName).append(": ").append(v);
                    }
                    String rowText = sb.toString();
                    if (!rowText.isBlank()) {
                        rowTexts.add(rowText);
                    }
                }
            }
        }
        if (rowTexts.isEmpty() && headerNames != null && !headerNames.isEmpty()) {
            rowTexts.add(String.join(" ", headerNames));
        }
        return rowTexts;
    }

    /**
     * 解析 CSV 为多行文本。优先 UTF-8 解码，若出现替换符或解码异常则使用 GBK（常见于 Windows 导出的中文 CSV），避免中文乱码。
     */
    private List<String> parseCsvToLines(MultipartFile file) throws Exception {
        byte[] bytes = file.getBytes();
        String content = decodeCsvContent(bytes);
        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new StringReader(content))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty()) {
                    lines.add(trimmed);
                }
            }
        }
        return lines;
    }

    /** 常见中文 CSV 编码：先 UTF-8，含替换符或异常时用 GBK */
    private static final Charset GBK = Charset.forName("GBK");

    private String decodeCsvContent(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return "";
        // 先按 UTF-8 解码
        String utf8 = new String(bytes, StandardCharsets.UTF_8);
        if (!utf8.contains("\uFFFD")) {
            return stripBomUtf8(utf8);
        }
        // 出现替换符说明可能为 GBK 等编码，用 GBK 重解
        return new String(bytes, GBK);
    }

    private static String stripBomUtf8(String s) {
        if (s != null && s.startsWith("\uFEFF")) {
            return s.substring(1);
        }
        return s != null ? s : "";
    }

    private static final DataFormatter DATA_FORMATTER = new DataFormatter();

    /** 取单元格显示值，避免公式/数字按公式或整数取导致中文或格式丢失 */
    private String getCellString(Cell cell) {
        if (cell == null) return null;
        CellType type = cell.getCellType();
        if (type == CellType.FORMULA) {
            type = cell.getCachedFormulaResultType();
        }
        switch (type) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
            case FORMULA:
                return DATA_FORMATTER.formatCellValue(cell);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return null;
        }
    }

    private String parseDocx(MultipartFile file) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (XWPFDocument doc = new XWPFDocument(file.getInputStream())) {
            for (XWPFParagraph p : doc.getParagraphs()) {
                String t = p.getText();
                if (t != null && !t.isBlank()) sb.append(t).append("\n");
            }
        }
        return sb.toString();
    }

    private String parseDoc(MultipartFile file) throws Exception {
        try (HWPFDocument doc = new HWPFDocument(file.getInputStream());
             WordExtractor extractor = new WordExtractor(doc)) {
            return extractor.getText();
        }
    }

    private String parsePdf(MultipartFile file) throws Exception {
        try (PDDocument doc = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(doc);
        }
    }

    // ==================== 图片提取方法 ====================

    private List<String> extractAndUploadImagesFromFile(MultipartFile file, String fileType, String taskId) {
        List<String> paths = new ArrayList<>();
        String typeUpper = fileType != null ? fileType.toUpperCase() : "";
        try {
            if ("DOCX".equals(typeUpper)) {
                paths = extractImagesFromDocxAndUpload(file, taskId);
            } else if ("DOC".equals(typeUpper)) {
                paths = extractImagesFromDocAndUpload(file, taskId);
            } else if ("PDF".equals(typeUpper)) {
                paths = extractImagesFromPdfAndUpload(file, taskId);
            }
        } catch (Exception e) {
            log.warn("【档案融合】档案图片提取或上传失败: fileType={}, taskId={}", fileType, taskId, e);
        }
        return paths;
    }

    private List<String> extractImagesFromDocAndUpload(MultipartFile file, String taskId) throws Exception {
        List<String> paths = new ArrayList<>();
        try (HWPFDocument doc = new HWPFDocument(file.getInputStream())) {
            PicturesTable picturesTable = doc.getPicturesTable();
            if (picturesTable == null) return paths;

            List<Picture> pictures = picturesTable.getAllPictures();
            if (pictures != null && !pictures.isEmpty()) {
                for (int i = 0; i < pictures.size(); i++) {
                    Picture pic = pictures.get(i);
                    byte[] data = pic.getContent();
                    if (data == null || data.length == 0) continue;
                    String fileName = pic.suggestFullFileName();
                    if (fileName == null || fileName.isBlank()) {
                        fileName = "image-" + i + ".jpg";
                    }
                    try {
                        String path = seaweedFSService.uploadBytes(data, fileName, taskId);
                        paths.add(path);
                    } catch (Exception e) {
                        log.warn("【档案融合】DOC 单张图片上传失败: fileName={}", fileName, e);
                    }
                }
            }

            if (paths.isEmpty()) {
                Range range = doc.getRange();
                int numRuns = range.numCharacterRuns();
                for (int i = 0; i < numRuns; i++) {
                    CharacterRun run = range.getCharacterRun(i);
                    if (!picturesTable.hasPicture(run)) continue;
                    Picture pic = picturesTable.extractPicture(run, true);
                    if (pic == null) continue;
                    byte[] data = pic.getContent();
                    if (data == null || data.length == 0) continue;
                    String fileName = pic.suggestFullFileName();
                    if (fileName == null || fileName.isBlank()) {
                        fileName = "image-" + i + ".jpg";
                    }
                    try {
                        String path = seaweedFSService.uploadBytes(data, fileName, taskId);
                        paths.add(path);
                    } catch (Exception e) {
                        log.warn("【档案融合】DOC CharacterRun 图片上传失败: fileName={}", fileName, e);
                    }
                }
            }
        }
        return paths;
    }

    private List<String> extractImagesFromDocxAndUpload(MultipartFile file, String taskId) throws Exception {
        List<String> paths = new ArrayList<>();
        try (XWPFDocument doc = new XWPFDocument(file.getInputStream())) {
            List<XWPFPictureData> pictures = doc.getAllPictures();
            for (int i = 0; i < pictures.size(); i++) {
                XWPFPictureData pic = pictures.get(i);
                byte[] data = pic.getData();
                if (data == null || data.length == 0) continue;
                String fileName = pic.getFileName();
                if (fileName == null || fileName.isBlank()) {
                    fileName = "image-" + i + ".jpg";
                }
                try {
                    String path = seaweedFSService.uploadBytes(data, fileName, taskId);
                    paths.add(path);
                } catch (Exception e) {
                    log.warn("【档案融合】DOCX 单张图片上传失败: fileName={}", fileName, e);
                }
            }
        }
        return paths;
    }

    private List<String> extractImagesFromPdfAndUpload(MultipartFile file, String taskId) throws Exception {
        List<String> paths = new ArrayList<>();
        try (PDDocument doc = PDDocument.load(file.getInputStream())) {
            int imageIndex = 0;
            for (PDPage page : doc.getPages()) {
                PDResources resources = page.getResources();
                if (resources == null) continue;
                for (COSName name : resources.getXObjectNames()) {
                    try {
                        PDXObject xObject = resources.getXObject(name);
                        if (xObject instanceof PDImageXObject img) {
                            byte[] data = imageBytesFromPDImage(img);
                            if (data != null && data.length > 0) {
                                String fileName = "pdf-image-" + imageIndex + ".png";
                                String path = seaweedFSService.uploadBytes(data, fileName, taskId);
                                paths.add(path);
                                imageIndex++;
                            }
                        } else if (xObject instanceof PDFormXObject form) {
                            List<String> nested = extractImagesFromPdfFormAndUpload(form, taskId, imageIndex);
                            paths.addAll(nested);
                            imageIndex += nested.size();
                        }
                    } catch (Exception e) {
                        log.debug("【档案融合】PDF 单张图片处理跳过: {}", e.getMessage());
                    }
                }
            }
        }
        return paths;
    }

    private List<String> extractImagesFromPdfFormAndUpload(PDFormXObject form, String taskId, int startIndex) {
        List<String> paths = new ArrayList<>();
        try {
            PDResources resources = form.getResources();
            if (resources == null) return paths;
            int i = startIndex;
            for (COSName name : resources.getXObjectNames()) {
                PDXObject xObject = resources.getXObject(name);
                if (xObject instanceof PDImageXObject img) {
                    byte[] data = imageBytesFromPDImage(img);
                    if (data != null && data.length > 0) {
                        String fileName = "pdf-image-" + i + ".png";
                        String path = seaweedFSService.uploadBytes(data, fileName, taskId);
                        paths.add(path);
                        i++;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("【档案融合】PDF Form 内图片处理跳过: {}", e.getMessage());
        }
        return paths;
    }

    private byte[] imageBytesFromPDImage(PDImageXObject img) {
        try {
            BufferedImage bufferedImage = img.getImage();
            if (bufferedImage == null) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(bufferedImage, "png", out);
            return out.toByteArray();
        } catch (Exception e) {
            log.debug("【档案融合】PDImage 转字节失败: {}", e.getMessage());
            return null;
        }
    }

    private static String stringOrNull(Object o) {
        if (o == null) return null;
        String s = o.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static LocalDate parseBirthDate(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return LocalDate.parse(s.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e) {
            try {
                return LocalDate.parse(s.trim(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            } catch (Exception e2) {
                return null;
            }
        }
    }
}
