package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stararchive.personmonitor.config.BailianProperties;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.*;
import com.stararchive.personmonitor.entity.*;
import com.stararchive.personmonitor.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.multipart.MultipartFile;

import com.stararchive.personmonitor.common.ByteArrayMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * 人员档案导入融合服务：文件解析、大模型抽取（Qwen3）、相似档案匹配
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveFusionService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_EXTRACTING = "EXTRACTING";
    private static final String STATUS_MATCHING = "MATCHING";
    private static final String STATUS_SUCCESS = "SUCCESS";
    private static final String STATUS_FAILED = "FAILED";

    /** 绑定每段原始文本与对应抽取结果，用于写入 archive_extract_result.original_text */
    private record TextAndPerson(String originalText, Map<String, Object> person) {}

    private final ArchiveImportTaskRepository taskRepository;
    private final ArchiveExtractResultRepository extractResultRepository;
    private final ArchiveSimilarMatchRepository similarMatchRepository;
    private final PersonRepository personRepository;
    private final PersonService personService;
    private final BailianProperties bailianProperties;
    private final SeaweedFSService seaweedFSService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${page.default-size:20}")
    private int defaultPageSize;

    private static final AtomicLong matchIdGenerator = new AtomicLong(System.currentTimeMillis() * 1000);

    /**
     * 批量上传：上传文件至 SeaweedFS、新建任务（状态 PENDING），接口立即返回。
     * 大模型提取由异步任务执行，执行成功后更新任务状态为 SUCCESS/FAILED 及提取人数。
     */
    @Transactional(rollbackFor = Exception.class)
    public ArchiveImportTaskDTO createTaskAndExtract(MultipartFile file, Integer creatorUserId, String creatorUsername) {
        String taskId = UUID.randomUUID().toString().replace("-", "");
        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
        String fileType = resolveFileType(fileName);

        String filePathId;
        try {
            filePathId = seaweedFSService.upload(file, taskId);
        } catch (Exception e) {
            log.error("上传文件至 SeaweedFS 失败: taskId={}", taskId, e);
            throw new RuntimeException("上传文件失败: " + (e.getMessage() != null ? e.getMessage() : "未知错误"));
        }

        ArchiveImportTask task = ArchiveImportTask.builder()
                .taskId(taskId)
                .fileName(fileName)
                .fileType(fileType)
                .filePathId(filePathId)
                .status(STATUS_PENDING)
                .creatorUserId(creatorUserId)
                .creatorUsername(creatorUsername)
                .extractCount(0)
                .createdTime(LocalDateTime.now())
                .updatedTime(LocalDateTime.now())
                .build();
        taskRepository.save(task);

        runExtractionAsync(taskId);
        return toTaskDTO(task);
    }

    /**
     * 异步执行大模型提取：从 SeaweedFS 拉取文件，解析并抽取，更新任务状态与提取结果。
     * 仅处理 PENDING 状态任务，开始时将状态更新为 EXTRACTING，完成后更新为 SUCCESS/FAILED。
     */
    @Async
    public void runExtractionAsync(String taskId) {
        ArchiveImportTask task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return;
        }
        String status = task.getStatus();
        if (!STATUS_PENDING.equals(status) && !STATUS_EXTRACTING.equals(status)) {
            return;
        }
        if (STATUS_PENDING.equals(status)) {
            task.setStatus(STATUS_EXTRACTING);
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
        }
        String path = task.getFilePathId();
        if (path == null || path.isBlank()) {
            task.setStatus(STATUS_FAILED);
            task.setErrorMessage("任务未关联文件存储路径");
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
            return;
        }
        byte[] fileBytes = seaweedFSService.download(path);
        if (fileBytes == null || fileBytes.length == 0) {
            task.setStatus(STATUS_FAILED);
            task.setErrorMessage("无法从存储下载文件");
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
            return;
        }
        MultipartFile file = new ByteArrayMultipartFile("file", task.getFileName(), fileBytes);
        performExtractionWithFile(taskId, file);
    }

    /**
     * 根据已上传文件执行解析与大模型抽取，写入提取结果并更新任务状态。
     */
    private void performExtractionWithFile(String taskId, MultipartFile file) {
        ArchiveImportTask task = taskRepository.findById(taskId).orElse(null);
        if (task == null) return;

        try {
            List<TextAndPerson> textAndPersons = new ArrayList<>();
            String fileTypeUpper = task.getFileType() != null ? task.getFileType().toUpperCase() : "";

            if ("XLSX".equals(fileTypeUpper) || "XLS".equals(fileTypeUpper)) {
                List<String> rowTexts = parseExcelToRowTexts(file);
                if (rowTexts.isEmpty()) {
                    task.setStatus(STATUS_FAILED);
                    task.setErrorMessage("Excel 解析后无有效行");
                    task.setUpdatedTime(LocalDateTime.now());
                    taskRepository.save(task);
                    return;
                }
                task.setOriginalText(String.join("\n\n------\n\n", rowTexts));
                taskRepository.save(task);
                for (int i = 1; i < rowTexts.size(); i++) {
                    String rowText = rowTexts.get(i);
                    if (rowText == null || rowText.isBlank()) continue;
                    List<Map<String, Object>> one = extractOnePersonByQwen(rowText);
                    if (!one.isEmpty()) {
                        textAndPersons.add(new TextAndPerson(rowText, one.get(0)));
                    }
                }
            } else if ("CSV".equals(fileTypeUpper)) {
                List<String> lineTexts = parseCsvToLines(file);
                if (lineTexts.isEmpty()) {
                    task.setStatus(STATUS_FAILED);
                    task.setErrorMessage("CSV 解析后无有效行");
                    task.setUpdatedTime(LocalDateTime.now());
                    taskRepository.save(task);
                    return;
                }
                task.setOriginalText(String.join("\n\n--- 下一行 ---\n\n", lineTexts));
                taskRepository.save(task);
                for (int i = 1; i < lineTexts.size(); i++) {
                    String lineText = lineTexts.get(i);
                    if (lineText == null || lineText.isBlank()) continue;
                    List<Map<String, Object>> one = extractOnePersonByQwen(lineText);
                    if (!one.isEmpty()) {
                        textAndPersons.add(new TextAndPerson(lineText, one.get(0)));
                    }
                }
            } else {
                String text = parseFileToText(file, task.getFileType());
                if (text == null || text.isBlank()) {
                    task.setStatus(STATUS_FAILED);
                    task.setErrorMessage("文件解析后无有效文本");
                    task.setUpdatedTime(LocalDateTime.now());
                    taskRepository.save(task);
                    return;
                }
                task.setOriginalText(text);
                taskRepository.save(task);
                List<String> avatarPaths = extractAndUploadImagesFromFile(file, task.getFileType(), taskId);
                List<Map<String, Object>> one = extractOnePersonByQwen(text);
                if (!one.isEmpty()) {
                    Map<String, Object> personMap = one.get(0);
                    if (!avatarPaths.isEmpty()) {
                        personMap.put("avatar_files", avatarPaths);
                    }
                    textAndPersons.add(new TextAndPerson(text, personMap));
                }
            }
            if (textAndPersons.isEmpty()) {
                task.setStatus(STATUS_SUCCESS);
                task.setExtractCount(0);
                task.setUpdatedTime(LocalDateTime.now());
                taskRepository.save(task);
                log.info("档案融合任务完成(无抽取结果): taskId={}", taskId);
                return;
            }

            task.setStatus(STATUS_MATCHING);
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);

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

                List<Person> similar = findSimilarPersons(originalName, birthDate, gender, nationality);
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

            task.setStatus(STATUS_SUCCESS);
            task.setExtractCount(index);
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
            log.info("档案融合任务完成: taskId={}, extractCount={}", taskId, index);
        } catch (Exception e) {
            log.error("档案融合任务失败: taskId=" + taskId, e);
            task.setStatus(STATUS_FAILED);
            task.setErrorMessage(e.getMessage() != null ? e.getMessage() : "未知错误");
            task.setUpdatedTime(LocalDateTime.now());
            taskRepository.save(task);
        }
    }

    /**
     * 批量上传：对每个文件上传至 SeaweedFS 并创建任务（状态 PENDING），接口立即返回；
     * 大模型提取由异步任务执行，完成后更新任务状态。
     */
    public ArchiveFusionBatchCreateResultDTO batchCreateTasksAndExtract(
            List<MultipartFile> files,
            Integer creatorUserId,
            String creatorUsername) {
        List<ArchiveImportTaskDTO> tasks = new ArrayList<>();
        List<ArchiveFusionBatchCreateResultDTO.BatchCreateError> errors = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
            try {
                ArchiveImportTaskDTO dto = createTaskAndExtract(file, creatorUserId, creatorUsername);
                if (dto != null) {
                    tasks.add(dto);
                } else {
                    errors.add(new ArchiveFusionBatchCreateResultDTO.BatchCreateError(fileName, "创建任务返回为空"));
                }
            } catch (Exception e) {
                log.warn("批量上传单文件失败: fileName={}", fileName, e);
                errors.add(new ArchiveFusionBatchCreateResultDTO.BatchCreateError(
                        fileName,
                        e.getMessage() != null ? e.getMessage() : "未知错误"));
            }
        }
        return ArchiveFusionBatchCreateResultDTO.builder()
                .successCount(tasks.size())
                .failedCount(errors.size())
                .tasks(tasks)
                .errors(errors)
                .build();
    }

    private String resolveFileType(String fileName) {
        if (fileName == null) return "UNKNOWN";
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return lower.endsWith(".xlsx") ? "XLSX" : "XLS";
        if (lower.endsWith(".docx") || lower.endsWith(".doc")) return lower.endsWith(".docx") ? "DOCX" : "DOC";
        if (lower.endsWith(".csv")) return "CSV";
        if (lower.endsWith(".pdf")) return "PDF";
        return "UNKNOWN";
    }

    /** 大模型抽取单人时系统提示（与 person 表结构一致） */
    private static final String EXTRACT_ONE_SYSTEM_PROMPT =
            "你是一个人物档案抽取助手。从用户提供的文本中抽取**一个人物**的档案信息。"
                    + "按以下字段提取（与人物表 person 结构一致），无法确定的填空字符串或空数组："
                    + "chinese_name(中文姓名)、original_name(原始姓名)、alias_names(别名数组)、gender(性别)、id_numbers(证件号数组)、birth_date(出生日期 yyyy-MM-dd)、nationality(国籍)、nationality_code(国籍三字码)、household_address(户籍地址)、highest_education(最高学历)、phone_numbers(手机号数组)、emails(邮箱数组)、passport_numbers(护照号数组)、id_card_number(身份证号)、person_tags(标签数组)、work_experience(工作经历JSON字符串)、education_experience(教育经历JSON字符串)、remark(备注)。"
                    + "请严格以 JSON 格式返回，**只返回一个 JSON 对象**，直接包含上述字段（不要包在 persons 数组里）。字符串用双引号，数组用 []，日期格式 yyyy-MM-dd。";

    /**
     * 从一段文本中抽取一个人物档案（Word/PDF 整份简历或 Excel/CSV 的一行）。
     * 优先调用大模型；失败或未配置时走 mockExtractOne（mock 内部也会尝试调大模型）。
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractOnePersonByQwen(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        List<Map<String, Object>> fromLlm = callLlmExtractOnePerson(text);
        if (!fromLlm.isEmpty()) {
            return fromLlm;
        }
        return mockExtractOne(text);
    }

    /**
     * 调用大模型接口将文本转换为结构化人物信息（JSON，与 person 表一致）。
     * 未配置 apiKey 或调用异常时返回空列表。
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> callLlmExtractOnePerson(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptyList();
        }
        if (bailianProperties.getApiKey() == null || bailianProperties.getApiKey().isBlank()) {
            log.debug("未配置 bailian.api-key，跳过大模型抽取");
            return Collections.emptyList();
        }
        String url = bailianProperties.getBaseUrl().replaceAll("/$", "") + "/chat/completions";
        String userContent = "请从以下文本中抽取一个人物档案，按上述 person 表结构返回一个 JSON 对象：\n\n"
                + text.substring(0, Math.min(12000, text.length()));

        Map<String, Object> body = new HashMap<>();
        body.put("model", bailianProperties.getModel());
        body.put("messages", List.of(
                Map.of("role", "system", "content", EXTRACT_ONE_SYSTEM_PROMPT),
                Map.of("role", "user", "content", userContent)
        ));
        body.put("response_format", Map.of("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(bailianProperties.getApiKey());
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && choices.size() > 0) {
                    String content = choices.get(0).path("message").path("content").asText();
                    content = unwrapJsonFromMarkdown(content);
                    JsonNode data = objectMapper.readTree(content);
                    JsonNode personNode = data.has("person") ? data.path("person") : data;
                    if (personNode.isObject()) {
                        Map<String, Object> map = objectMapper.convertValue(personNode, Map.class);
                        return List.of(map);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("大模型抽取单人失败: {}，请检查网络与返回 JSON 格式（需为单个对象或含 person 节点）", e.getMessage());
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

    /**
     * Mock 抽取：优先调用大模型接口将文本转为结构化人物 JSON；
     * 大模型不可用时返回与 person 表结构一致的占位数据（便于区分真实抽取失败）。
     */
    private List<Map<String, Object>> mockExtractOne(String text) {
        List<Map<String, Object>> fromLlm = callLlmExtractOnePerson(text);
        if (!fromLlm.isEmpty()) {
            return fromLlm;
        }
        log.warn("大模型抽取未返回有效结果，使用占位数据。请检查 bailian.api-key 配置及大模型返回 JSON 格式。");
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
     * 解析 Word/PDF 为整份文本（用于整份文档抽取一个人物）。
     */
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
     * Excel 按行解析：每行拼接为该行的单元格文本，返回行列表。一行对应大模型抽取一个人物。
     */
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

    /**
     * CSV 按行解析：每行作为一条文本，用于大模型每行抽取一个人物。
     */
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

    /**
     * 从档案文件（DOC/DOCX/PDF）中提取图片，上传至 SeaweedFS，返回 Filer 相对路径列表。
     * 用于人物头像：导入时写入 person.avatar_files，前端通过 /api/avatar?path= 展示。
     */
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
            log.warn("档案图片提取或上传失败: fileType={}, taskId={}", fileType, taskId, e);
        }
        return paths;
    }

    /**
     * 从 .doc（老格式 Word）中提取图片并上传至 SeaweedFS。
     * 先尝试 getAllPictures()；若为空则按 POI 建议扫描所有 CharacterRun 提取图片（部分 .doc 图片不在连续 data stream 中）。
     */
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
                        log.warn("DOC 单张图片上传失败: fileName={}", fileName, e);
                    }
                }
            }

            // POI 文档：并非所有 .doc 的图片都在 data stream 中连续存放，建议扫描所有 CharacterRun
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
                        log.warn("DOC CharacterRun 图片上传失败: fileName={}", fileName, e);
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
                    log.warn("DOCX 单张图片上传失败: fileName={}", fileName, e);
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
                        log.debug("PDF 单张图片处理跳过: {}", e.getMessage());
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
            log.debug("PDF Form 内图片处理跳过: {}", e.getMessage());
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
            log.debug("PDImage 转字节失败: {}", e.getMessage());
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

    /** 相似档案条件：原始姓名+出生日期+性别+国籍 均非空时才查询 */
    private List<Person> findSimilarPersons(String originalName, LocalDate birthDate, String gender, String nationality) {
        if (originalName == null || originalName.isBlank()
                || birthDate == null
                || gender == null || gender.isBlank()
                || nationality == null || nationality.isBlank()) {
            return Collections.emptyList();
        }
        return personRepository.findSimilarByOriginalNameAndBirthDateAndGenderAndNationality(
                originalName, birthDate, gender, nationality);
    }

    public PageResponse<ArchiveImportTaskDTO> listTasks(Integer creatorUserId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdTime"));
        Page<ArchiveImportTask> taskPage = creatorUserId != null
                ? taskRepository.findByCreatorUserIdOrderByCreatedTimeDesc(creatorUserId, pageable)
                : taskRepository.findAllByOrderByCreatedTimeDesc(pageable);
        List<ArchiveImportTaskDTO> list = taskPage.getContent().stream().map(this::toTaskDTO).collect(Collectors.toList());
        return PageResponse.of(list, page, size, taskPage.getTotalElements());
    }

    /**
     * 按 taskId 获取任务（用于文件下载/预览时取 filePathId、fileName）
     */
    public java.util.Optional<ArchiveImportTask> getTask(String taskId) {
        return taskRepository.findById(taskId);
    }

    public ArchiveFusionTaskDetailDTO getTaskDetail(String taskId) {
        ArchiveImportTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("任务不存在: " + taskId));
        List<ArchiveExtractResult> results = extractResultRepository.findByTaskIdOrderByExtractIndexAsc(taskId);
        List<ArchiveExtractResultDTO> resultDTOs = results.stream().map(r -> {
            List<Person> similar = findSimilarPersons(r.getOriginalName(), r.getBirthDate(), r.getGender(), r.getNationality());
            List<PersonCardDTO> cards = similar.stream().map(personService::toCardDTO).collect(Collectors.toList());
            return ArchiveExtractResultDTO.builder()
                    .resultId(r.getResultId())
                    .taskId(r.getTaskId())
                    .extractIndex(r.getExtractIndex())
                    .originalName(r.getOriginalName())
                    .birthDate(r.getBirthDate())
                    .gender(r.getGender())
                    .nationality(r.getNationality())
                    .originalText(r.getOriginalText())
                    .rawJson(r.getRawJson())
                    .confirmed(Boolean.TRUE.equals(r.getConfirmed()))
                    .imported(Boolean.TRUE.equals(r.getImported()))
                    .importedPersonId(r.getImportedPersonId())
                    .similarPersons(cards)
                    .build();
        }).collect(Collectors.toList());
        return ArchiveFusionTaskDetailDTO.builder()
                .task(toTaskDTO(task))
                .extractResults(resultDTOs)
                .build();
    }

    private ArchiveImportTaskDTO toTaskDTO(ArchiveImportTask task) {
        return ArchiveImportTaskDTO.builder()
                .taskId(task.getTaskId())
                .fileName(task.getFileName())
                .fileType(task.getFileType())
                .status(task.getStatus())
                .originalText(task.getOriginalText())
                .extractCount(task.getExtractCount())
                .errorMessage(task.getErrorMessage())
                .creatorUsername(task.getCreatorUsername())
                .createdTime(task.getCreatedTime())
                .updatedTime(task.getUpdatedTime())
                .build();
    }

    /**
     * 人工确认后导入：将选中的提取结果写入 person 表
     */
    @Transactional(rollbackFor = Exception.class)
    public List<String> confirmImport(String taskId, List<String> resultIds) {
        if (resultIds == null || resultIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> importedPersonIds = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (String resultId : resultIds) {
            ArchiveExtractResult result = extractResultRepository.findById(resultId)
                    .orElse(null);
            if (result == null || !taskId.equals(result.getTaskId()) || Boolean.TRUE.equals(result.getImported())) {
                continue;
            }
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = objectMapper.readValue(result.getRawJson(), Map.class);
                Person person = mapFromRawJsonToPerson(map);
                if (person == null) continue;
                person.setCreatedTime(now);
                person.setUpdatedTime(now);
                personRepository.save(person);
                result.setConfirmed(true);
                result.setImported(true);
                result.setImportedPersonId(person.getPersonId());
                extractResultRepository.save(result);
                importedPersonIds.add(person.getPersonId());
            } catch (Exception e) {
                log.warn("导入提取结果失败: resultId={}", resultId, e);
            }
        }
        return importedPersonIds;
    }

    private Person mapFromRawJsonToPerson(Map<String, Object> map) {
        String originalName = stringOrNull(map.get("original_name"));
        String birthDateStr = stringOrNull(map.get("birth_date"));
        String gender = stringOrNull(map.get("gender"));
        String nationality = stringOrNull(map.get("nationality"));
        LocalDate birthDate = parseBirthDate(birthDateStr);
        String personId = generatePersonId(originalName, birthDate, gender, nationality);
        if (personId == null) return null;

        Person person = new Person();
        person.setPersonId(personId);
        person.setOriginalName(originalName);
        person.setChineseName(stringOrNull(map.get("chinese_name")));
        person.setGender(gender);
        person.setNationality(nationality);
        person.setNationalityCode(stringOrNull(map.get("nationality_code")));
        person.setBirthDate(birthDate != null ? birthDate.atStartOfDay() : null);
        person.setHouseholdAddress(stringOrNull(map.get("household_address")));
        person.setHighestEducation(stringOrNull(map.get("highest_education")));
        person.setIdCardNumber(stringOrNull(map.get("id_card_number")));
        person.setRemark(stringOrNull(map.get("remark")));
        person.setIsKeyPerson(false);
        person.setAliasNames(listFromMap(map, "alias_names"));
        person.setIdNumbers(listFromMap(map, "id_numbers"));
        person.setPhoneNumbers(listFromMap(map, "phone_numbers"));
        person.setEmails(listFromMap(map, "emails"));
        person.setPassportNumbers(listFromMap(map, "passport_numbers"));
        person.setPersonTags(listFromMap(map, "person_tags"));
        person.setAvatarFiles(listFromMap(map, "avatar_files"));
        person.setTwitterAccounts(listFromMap(map, "twitter_accounts"));
        person.setLinkedinAccounts(listFromMap(map, "linkedin_accounts"));
        person.setFacebookAccounts(listFromMap(map, "facebook_accounts"));
        // 空字符串无法被解析为 jsonb，需转为 null
        Object we = map.get("work_experience");
        person.setWorkExperience(jsonStringOrNull(we));
        Object ee = map.get("education_experience");
        person.setEducationExperience(jsonStringOrNull(ee));
        return person;
    }

    /** 供 JSON 列使用：空字符串 DB 无法解析为 jsonb，返回 null。 */
    private static String jsonStringOrNull(Object o) {
        if (o == null) return null;
        String s = o.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static List<String> listFromMap(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return null;
        if (v instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object o : list) {
                if (o != null) out.add(o.toString().trim());
            }
            return out.isEmpty() ? null : out;
        }
        String s = v.toString().trim();
        return s.isEmpty() ? null : List.of(s);
    }

    private static String generatePersonId(String originalName, LocalDate birthDate, String gender, String nationality) {
        String raw = (originalName != null ? originalName : "") + "|" + (birthDate != null ? birthDate.toString() : "") + "|" + (gender != null ? gender : "") + "|" + (nationality != null ? nationality : "");
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }
}
