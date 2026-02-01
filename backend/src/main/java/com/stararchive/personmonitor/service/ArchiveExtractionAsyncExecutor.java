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
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

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

    /** 绑定每段原始文本与对应抽取结果 */
    private record TextAndPerson(String originalText, Map<String, Object> person) {}

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

    private static final AtomicLong matchIdGenerator = new AtomicLong(System.currentTimeMillis() * 1000);

    /** 大模型抽取单人时系统提示 */
    private static final String EXTRACT_ONE_SYSTEM_PROMPT =
            "你是一个人物档案抽取助手。从用户提供的文本中抽取**一个人物**的档案信息。"
                    + "按以下字段提取（与人物表 person 结构一致），无法确定的填空字符串或空数组："
                    + "chinese_name(中文姓名)、original_name(原始姓名)、alias_names(别名数组)、gender(性别)、id_numbers(证件号数组)、birth_date(出生日期 yyyy-MM-dd)、nationality(国籍)、nationality_code(国籍三字码)、household_address(户籍地址)、highest_education(最高学历)、phone_numbers(手机号数组)、emails(邮箱数组)、passport_numbers(护照号数组)、id_card_number(身份证号)、person_tags(标签数组)、work_experience(工作经历JSON字符串)、education_experience(教育经历JSON字符串)、remark(备注)。"
                    + "**重要：person_tags（人物标签）必须根据【上传文件的文件名】与【人物档案文本内容】综合推断，且只能从用户消息中提供的「参考标签表」里选择（可多选），标签名必须与参考表完全一致；若无法匹配则 person_tags 返回空数组 []。**"
                    + "请严格以 JSON 格式返回，**只返回一个 JSON 对象**，直接包含上述字段（不要包在 persons 数组里）。字符串用双引号，数组用 []，日期格式 yyyy-MM-dd。";

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
            List<TextAndPerson> textAndPersons = new ArrayList<>();
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
                taskRepository.save(task);
                
                // 从第2行开始（跳过表头）
                for (int i = 1; i < rowTexts.size(); i++) {
                    String rowText = rowTexts.get(i);
                    if (rowText == null || rowText.isBlank()) continue;
                    
                    log.info("【档案融合】开始提取 Excel 第{}行: taskId={}", i + 1, taskId);
                    try {
                        List<Map<String, Object>> one = extractOnePersonByQwen(rowText, fileName, allTags, taskId);
                        if (!one.isEmpty()) {
                            textAndPersons.add(new TextAndPerson(rowText, one.get(0)));
                            log.info("【档案融合】Excel 第{}行提取成功: taskId={}, 提取姓名={}", 
                                    i + 1, taskId, one.get(0).get("original_name"));
                        } else {
                            log.warn("【档案融合】Excel 第{}行未提取到人物: taskId={}", i + 1, taskId);
                        }
                    } catch (Exception e) {
                        log.warn("【档案融合】Excel 第{}行提取失败，已跳过: taskId={}, 错误={}", i + 1, taskId, e.getMessage(), e);
                    }
                }
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
                taskRepository.save(task);
                
                for (int i = 1; i < lineTexts.size(); i++) {
                    String lineText = lineTexts.get(i);
                    if (lineText == null || lineText.isBlank()) continue;
                    
                    log.info("【档案融合】开始提取 CSV 第{}行: taskId={}", i + 1, taskId);
                    try {
                        List<Map<String, Object>> one = extractOnePersonByQwen(lineText, fileName, allTags, taskId);
                        if (!one.isEmpty()) {
                            textAndPersons.add(new TextAndPerson(lineText, one.get(0)));
                            log.info("【档案融合】CSV 第{}行提取成功: taskId={}, 提取姓名={}", 
                                    i + 1, taskId, one.get(0).get("original_name"));
                        } else {
                            log.warn("【档案融合】CSV 第{}行未提取到人物: taskId={}", i + 1, taskId);
                        }
                    } catch (Exception e) {
                        log.warn("【档案融合】CSV 第{}行提取失败，已跳过: taskId={}, 错误={}", i + 1, taskId, e.getMessage(), e);
                    }
                }
            } else {
                // Word / PDF 等整份文档
                log.info("【档案融合】开始解析文档文件: taskId={}, fileType={}", taskId, fileTypeUpper);
                String text = parseFileToText(file, task.getFileType());
                
                if (text == null || text.isBlank()) {
                    log.error("【档案融合】文档解析后无有效文本: taskId={}", taskId);
                    markTaskFailed(task, "文件解析后无有效文本");
                    return;
                }
                
                log.info("【档案融合】文档解析完成: taskId={}, 文本长度={}", taskId, text.length());
                task.setOriginalText(text);
                taskRepository.save(task);
                
                // 提取图片
                log.info("【档案融合】开始提取文档中的图片: taskId={}", taskId);
                List<String> avatarPaths = extractAndUploadImagesFromFile(file, task.getFileType(), taskId);
                log.info("【档案融合】图片提取完成: taskId={}, 图片数量={}", taskId, avatarPaths.size());
                
                log.info("【档案融合】开始大模型提取人物信息: taskId={}", taskId);
                List<Map<String, Object>> one = extractOnePersonByQwen(text, fileName, allTags, taskId);
                if (!one.isEmpty()) {
                    Map<String, Object> personMap = one.get(0);
                    if (!avatarPaths.isEmpty()) {
                        personMap.put("avatar_files", avatarPaths);
                    }
                    textAndPersons.add(new TextAndPerson(text, personMap));
                    log.info("【档案融合】文档提取成功: taskId={}, 提取姓名={}", taskId, personMap.get("original_name"));
                } else {
                    log.warn("【档案融合】文档未提取到人物信息: taskId={}", taskId);
                }
            }
            
            if (textAndPersons.isEmpty()) {
                task.setStatus(STATUS_SUCCESS);
                task.setExtractCount(0);
                task.setUpdatedTime(LocalDateTime.now());
                taskRepository.save(task);
                log.info("【档案融合】任务完成(无抽取结果): taskId={}", taskId);
                return;
            }

            // 更新状态为匹配中
            task.setStatus(STATUS_MATCHING);
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
            log.info("【档案融合】任务状态更新为 MATCHING: taskId={}, 待保存提取结果数={}", taskId, textAndPersons.size());

            // 保存提取结果并匹配相似人物
            int index = 0;
            for (TextAndPerson tp : textAndPersons) {
                Map<String, Object> p = tp.person();
                String resultId = UUID.randomUUID().toString().replace("-", "");
                String originalName = stringOrNull(p.get("original_name"));
                String birthDateStr = stringOrNull(p.get("birth_date"));
                String gender = stringOrNull(p.get("gender"));
                String nationality = stringOrNull(p.get("nationality"));
                LocalDate birthDate = parseBirthDate(birthDateStr);

                String rawJson = objectMapper.writeValueAsString(p);

                ArchiveExtractResult result = ArchiveExtractResult.builder()
                        .resultId(resultId)
                        .taskId(taskId)
                        .extractIndex(index)
                        .originalName(originalName)
                        .birthDate(birthDate)
                        .gender(gender)
                        .nationality(nationality)
                        .originalText(tp.originalText())
                        .rawJson(rawJson)
                        .confirmed(false)
                        .imported(false)
                        .importedPersonId(null)
                        .createdTime(LocalDateTime.now())
                        .build();
                extractResultRepository.save(result);
                log.info("【档案融合】保存提取结果: taskId={}, resultId={}, originalName={}, index={}", 
                        taskId, resultId, originalName, index);

                // 查找相似人物
                List<Person> similar = findSimilarPersons(originalName, birthDate, gender, nationality, task.getCreatorUsername());
                log.info("【档案融合】相似人物匹配: taskId={}, resultId={}, 相似人物数={}", taskId, resultId, similar.size());
                
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
                index++;
            }

            // 更新任务为成功
            task.setStatus(STATUS_SUCCESS);
            task.setExtractCount(index);
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
            log.info("【档案融合】任务完成: taskId={}, extractCount={}", taskId, index);
            
        } catch (Exception e) {
            log.error("【档案融合】任务执行异常: taskId={}", taskId, e);
            markTaskFailed(task, e.getMessage() != null ? e.getMessage() : "未知错误");
        }
    }

    /**
     * 标记任务失败
     */
    private void markTaskFailed(ArchiveImportTask task, String errorMessage) {
        task.setStatus(STATUS_FAILED);
        task.setErrorMessage(errorMessage);
        task.setUpdatedTime(LocalDateTime.now());
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
        return mockExtractOne(text, fileName, allTags != null ? allTags : List.of(), taskId);
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
        body.put("messages", List.of(
                Map.of("role", "system", "content", EXTRACT_ONE_SYSTEM_PROMPT),
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

    /**
     * Mock 抽取：大模型不可用时返回占位数据
     */
    private List<Map<String, Object>> mockExtractOne(String text, String fileName, List<Tag> allTags, String taskId) {
        List<Map<String, Object>> fromLlm = callLlmExtractOnePerson(text, fileName, allTags != null ? allTags : List.of(), taskId);
        if (!fromLlm.isEmpty()) {
            return fromLlm;
        }
        log.warn("【档案融合】大模型抽取未返回有效结果，使用占位数据: taskId={}", taskId);
        Map<String, Object> one = new HashMap<>();
        one.put("chinese_name", "（抽取失败-占位）");
        one.put("original_name", "（抽取失败-占位）");
        one.put("birth_date", "1990-01-01");
        one.put("gender", "男");
        one.put("nationality", "中国");
        one.put("nationality_code", "CHN");
        one.put("household_address", "");
        one.put("highest_education", "");
        one.put("alias_names", Collections.emptyList());
        one.put("id_numbers", Collections.emptyList());
        one.put("phone_numbers", Collections.emptyList());
        one.put("emails", Collections.emptyList());
        one.put("passport_numbers", Collections.emptyList());
        one.put("id_card_number", "");
        one.put("person_tags", Collections.emptyList());
        one.put("work_experience", "");
        one.put("education_experience", "");
        one.put("remark", "");
        return List.of(one);
    }

    /**
     * 相似档案查询
     */
    private List<Person> findSimilarPersons(String originalName, LocalDate birthDate, String gender, String nationality, String currentUsername) {
        if (originalName == null || originalName.isBlank()
                || birthDate == null
                || gender == null || gender.isBlank()
                || nationality == null || nationality.isBlank()) {
            return Collections.emptyList();
        }
        List<Person> all = personRepository.findSimilarByOriginalNameAndBirthDateAndGenderAndNationality(
                originalName, birthDate, gender, nationality);
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

    private List<String> parseExcelToRowTexts(MultipartFile file) throws Exception {
        List<String> rowTexts = new ArrayList<>();
        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;
                    StringBuilder sb = new StringBuilder();
                    for (int c = 0; c < row.getLastCellNum(); c++) {
                        Cell cell = row.getCell(c);
                        if (cell != null) {
                            String v = getCellString(cell);
                            if (v != null && !v.isBlank()) sb.append(v).append(" ");
                        }
                    }
                    String rowText = sb.toString().trim();
                    if (!rowText.isEmpty()) {
                        rowTexts.add(rowText);
                    }
                }
            }
        }
        return rowTexts;
    }

    private List<String> parseCsvToLines(MultipartFile file) throws Exception {
        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
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

    private String getCellString(Cell cell) {
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> null;
        };
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
