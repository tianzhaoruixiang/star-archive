package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeType;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.*;
import com.stararchive.personmonitor.entity.*;
import com.stararchive.personmonitor.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 人员档案导入融合服务：文件解析、大模型抽取（Qwen3）、相似档案匹配
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveFusionService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_FAILED = "FAILED";

    private final ArchiveImportTaskRepository taskRepository;
    private final ArchiveExtractResultRepository extractResultRepository;
    private final ArchiveSimilarMatchRepository similarMatchRepository;
    private final PersonRepository personRepository;
    private final PersonService personService;
    private final SeaweedFSService seaweedFSService;
    private final ObjectMapper objectMapper;
    
    /** 异步提取执行器（从其他 Bean 调用以确保 @Async 代理生效） */
    private final ArchiveExtractionAsyncExecutor asyncExecutor;

    @Value("${page.default-size:20}")
    private int defaultPageSize;

    /**
     * 批量上传：上传文件至 SeaweedFS、新建任务（状态 PENDING），接口立即返回。
     * 大模型提取由异步任务执行，执行成功后更新任务状态为 SUCCESS/FAILED 及提取人数。
     */
    @Transactional(rollbackFor = Exception.class)
    public ArchiveImportTaskDTO createTaskAndExtract(MultipartFile file, Integer creatorUserId, String creatorUsername,
                                                     String similarMatchFields) {
        String taskId = UUID.randomUUID().toString().replace("-", "");
        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
        String fileType = resolveFileType(fileName);
        String normalizedMatchFields = normalizeSimilarMatchFields(similarMatchFields);

        log.info("【档案融合】创建任务开始: taskId={}, fileName={}, fileType={}, creatorUsername={}, similarMatchFields={}",
                taskId, fileName, fileType, creatorUsername, normalizedMatchFields);

        String filePathId;
        try {
            filePathId = seaweedFSService.upload(file, taskId);
            log.info("【档案融合】文件上传成功: taskId={}, filePathId={}", taskId, filePathId);
        } catch (Exception e) {
            log.error("【档案融合】上传文件至 SeaweedFS 失败: taskId={}", taskId, e);
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
                .totalExtractCount(0)
                .extractCount(0)
                .similarMatchFields(normalizedMatchFields)
                .createdTime(LocalDateTime.now())
                .updatedTime(LocalDateTime.now())
                .build();
        taskRepository.save(task);
        log.info("【档案融合】任务已保存: taskId={}, status={}", taskId, STATUS_PENDING);

        // 有事务时在提交后触发异步提取；无事务时（如批量上传内部调用）直接触发，避免 Transaction synchronization is not active
        final String taskIdForAsync = taskId;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    log.info("【档案融合】事务已提交，触发异步提取: taskId={}", taskIdForAsync);
                    asyncExecutor.executeExtractionAsync(taskIdForAsync);
                }
            });
        } else {
            log.info("【档案融合】无活动事务，直接触发异步提取: taskId={}", taskIdForAsync);
            asyncExecutor.executeExtractionAsync(taskIdForAsync);
        }

        return toTaskDTO(task);
    }

    /**
     * 批量上传：对每个文件上传至 SeaweedFS 并创建任务（状态 PENDING），接口立即返回；
     * 大模型提取由异步任务执行，完成后更新任务状态。
     */
    public ArchiveFusionBatchCreateResultDTO batchCreateTasksAndExtract(
            List<MultipartFile> files,
            Integer creatorUserId,
            String creatorUsername,
            String similarMatchFields) {
        List<ArchiveImportTaskDTO> tasks = new ArrayList<>();
        List<ArchiveFusionBatchCreateResultDTO.BatchCreateError> errors = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
            try {
                ArchiveImportTaskDTO dto = createTaskAndExtract(file, creatorUserId, creatorUsername, similarMatchFields);
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

    /**
     * 失败任务重新导入：仅允许状态为 FAILED 的任务重试。
     * 清空该任务的提取结果、重置状态为 PENDING 并重新触发异步提取。
     */
    @Transactional(rollbackFor = Exception.class)
    public ArchiveImportTaskDTO retryTask(String taskId) {
        ArchiveImportTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在"));
        if (!STATUS_FAILED.equals(task.getStatus())) {
            throw new IllegalArgumentException("仅失败状态的任务支持重新导入，当前状态: " + task.getStatus());
        }
        // 清空该任务已有的提取结果
        List<ArchiveExtractResult> existing = extractResultRepository.findByTaskIdOrderByExtractIndexAsc(taskId);
        if (!existing.isEmpty()) {
            extractResultRepository.deleteAll(existing);
        }
        task.setStatus(STATUS_PENDING);
        task.setErrorMessage(null);
        task.setExtractCount(0);
        task.setTotalExtractCount(0);
        task.setUpdatedTime(LocalDateTime.now());
        taskRepository.save(task);
        log.info("【档案融合】失败任务重新导入: taskId={}", taskId);
        final String taskIdForAsync = taskId;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    asyncExecutor.executeExtractionAsync(taskIdForAsync);
                }
            });
        } else {
            asyncExecutor.executeExtractionAsync(taskIdForAsync);
        }
        return toTaskDTO(task);
    }

    /**
     * 删除档案融合导入任务：仅删除任务及关联的提取结果、相似匹配记录；SeaweedFS 文件保留。
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteTask(String taskId) {
        if (taskId == null || taskId.isBlank()) {
            throw new IllegalArgumentException("任务编号不能为空");
        }
        if (!taskRepository.existsById(taskId)) {
            throw new IllegalArgumentException("任务不存在");
        }
        List<ArchiveExtractResult> results = extractResultRepository.findByTaskIdOrderByExtractIndexAsc(taskId);
        if (!results.isEmpty()) {
            extractResultRepository.deleteAll(results);
        }
        List<ArchiveSimilarMatch> matches = similarMatchRepository.findByTaskId(taskId);
        if (!matches.isEmpty()) {
            similarMatchRepository.deleteAll(matches);
        }
        taskRepository.deleteById(taskId);
        log.info("【档案融合】删除任务: taskId={}", taskId);
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

    /**
     * 相似档案查询：按选定的属性组合匹配，仅当选中的属性均有值时才查询。
     * 比对范围仅限当前用户可见的档案：公开档案 或 创建人为 currentUsername 的私有档案。
     *
     * @param matchFields 参与比对的属性集合（originalName, birthDate, gender, nationality）
     * @param currentUsername 当前用户（任务创建人或查看详情的用户），为空时仅返回公开档案
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

    /**
     * 分页查询导入任务列表。仅返回当前用户创建的任务；未传当前用户时返回空列表。
     *
     * @param currentUsername 当前登录用户名（X-Username），为空时返回空列表
     */
    public PageResponse<ArchiveImportTaskDTO> listTasks(String currentUsername, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdTime"));
        if (currentUsername == null || currentUsername.isBlank()) {
            return PageResponse.of(List.of(), page, size, 0L);
        }
        String username = currentUsername.trim();
        Page<ArchiveImportTask> taskPage = taskRepository.findByCreatorUsernameOrderByCreatedTimeDesc(username, pageable);
        List<ArchiveImportTaskDTO> list = taskPage.getContent().stream().map(this::toTaskDTO).collect(Collectors.toList());
        return PageResponse.of(list, page, size, taskPage.getTotalElements());
    }

    /**
     * 按 taskId 获取任务（用于文件下载/预览时取 filePathId、fileName）
     */
    public java.util.Optional<ArchiveImportTask> getTask(String taskId) {
        return taskRepository.findById(taskId);
    }

    /**
     * 获取任务详情（仅任务信息，不包含提取结果列表）。提取结果由分页接口 {@link #getTaskExtractResultsPage} 获取。
     *
     * @param currentUsername 当前用户（X-Username），用于权限校验
     */
    public ArchiveFusionTaskDetailDTO getTaskDetail(String taskId, String currentUsername) {
        ArchiveImportTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("任务不存在: " + taskId));
        ArchiveImportTaskDTO taskDTO = toTaskDTO(task);
        taskDTO.setUnimportedCount(extractResultRepository.countByTaskIdAndImportedFalse(taskId));
        return ArchiveFusionTaskDetailDTO.builder()
                .task(taskDTO)
                .extractResults(Collections.emptyList())
                .build();
    }

    /**
     * 分页获取任务提取结果（含每条结果的库内相似档案）。相似档案比对范围仅限 currentUsername 可见的档案。
     *
     * @param currentUsername 当前用户（X-Username），为空时相似档案仅包含公开档案
     */
    public PageResponse<ArchiveExtractResultDTO> getTaskExtractResultsPage(String taskId, int page, int size, String currentUsername) {
        ArchiveImportTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("任务不存在: " + taskId));
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "extractIndex"));
        Page<ArchiveExtractResult> resultPage = extractResultRepository.findByTaskIdOrderByExtractIndexAsc(taskId, pageable);
        String user = (currentUsername != null && !currentUsername.isBlank()) ? currentUsername.trim() : null;
        Set<String> matchFields = parseSimilarMatchFields(task.getSimilarMatchFields());
        List<ArchiveExtractResultDTO> resultDTOs = resultPage.getContent().stream().map(r -> {
            List<Person> similar = findSimilarPersons(matchFields, r.getOriginalName(), r.getBirthDate(), r.getGender(), r.getNationality(), user);
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
        return PageResponse.of(resultDTOs, page, size, resultPage.getTotalElements());
    }

    private ArchiveImportTaskDTO toTaskDTO(ArchiveImportTask task) {
        Long durationSeconds = null;
        if (task.getCreatedTime() != null && task.getCompletedTime() != null) {
            durationSeconds = ChronoUnit.SECONDS.between(task.getCreatedTime(), task.getCompletedTime());
        }
        return ArchiveImportTaskDTO.builder()
                .taskId(task.getTaskId())
                .fileName(task.getFileName())
                .fileType(task.getFileType())
                .status(task.getStatus())
                .originalText(task.getOriginalText())
                .totalExtractCount(task.getTotalExtractCount())
                .extractCount(task.getExtractCount())
                .errorMessage(task.getErrorMessage())
                .creatorUsername(task.getCreatorUsername())
                .createdTime(task.getCreatedTime())
                .updatedTime(task.getUpdatedTime())
                .completedTime(task.getCompletedTime())
                .durationSeconds(durationSeconds)
                .similarMatchFields(task.getSimilarMatchFields())
                .build();
    }

    /** 相似判定允许的属性名 */
    private static final Set<String> SIMILAR_MATCH_ALLOWED = Set.of("originalName", "birthDate", "gender", "nationality");
    /** 默认相似判定属性：四者均参与 */
    private static final String DEFAULT_SIMILAR_MATCH_FIELDS = "originalName,birthDate,gender,nationality";

    private static Set<String> parseSimilarMatchFields(String similarMatchFields) {
        if (similarMatchFields == null || similarMatchFields.isBlank()) {
            return Set.copyOf(List.of("originalName", "birthDate", "gender", "nationality"));
        }
        return Arrays.stream(similarMatchFields.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty() && SIMILAR_MATCH_ALLOWED.contains(s))
                .collect(Collectors.toSet());
    }

    private static String normalizeSimilarMatchFields(String similarMatchFields) {
        Set<String> set = parseSimilarMatchFields(similarMatchFields);
        if (set.isEmpty()) {
            return DEFAULT_SIMILAR_MATCH_FIELDS;
        }
        return String.join(",", set);
    }

    /**
     * 人工确认后导入：将选中的提取结果与库中档案合并后写入 person 表。
     * 入库前先根据相似匹配查询库中已有档案，若有则与新增档案合并（单值以有值为主，多值合并去重），不覆盖已有有效属性；若无则新建人物。
     * batchTags 不为空时为本批每个人物追加这些标签。
     *
     * @param importAsPublic true=导入为公开档案（所有人可见），false=导入为私有档案（仅创建人可见）；合并到已有档案时不修改其公开性。
     */
    @Transactional(rollbackFor = Exception.class)
    public List<String> confirmImport(String taskId, List<String> resultIds, List<String> batchTags, boolean importAsPublic) {
        if (resultIds == null || resultIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> tagsToAdd = (batchTags != null && !batchTags.isEmpty())
                ? batchTags.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().toList()
                : List.<String>of();
        ArchiveImportTask task = taskRepository.findById(taskId).orElse(null);
        String creatorUsername = task != null ? task.getCreatorUsername() : null;
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
                Person incoming = mapFromRawJsonToPerson(map);
                if (incoming == null) continue;

                // 先查库中相似档案：有则合并，无则新建
                List<ArchiveSimilarMatch> matches = similarMatchRepository.findByResultId(resultId);
                Person existing = null;
                if (matches != null && !matches.isEmpty()) {
                    String existingPersonId = matches.get(0).getPersonId();
                    existing = personRepository.findById(existingPersonId).orElse(null);
                }

                Person person;
                if (existing != null) {
                    // 合并：单值以有值为主，多值合并去重；不覆盖已有档案的 personId/createdBy/createdTime/公开性等
                    mergePersonData(existing, incoming);
                    if (!tagsToAdd.isEmpty()) {
                        List<String> merged = mergeAndDedupe(existing.getPersonTags(), tagsToAdd);
                        existing.setPersonTags(merged);
                    }
                    existing.setUpdatedTime(now);
                    personRepository.save(existing);
                    person = existing;
                } else {
                    // 无相似档案，新建
                    if (!tagsToAdd.isEmpty()) {
                        List<String> existingTags = incoming.getPersonTags() != null ? new ArrayList<>(incoming.getPersonTags()) : new ArrayList<>();
                        java.util.Set<String> set = new java.util.LinkedHashSet<>(existingTags);
                        set.addAll(tagsToAdd);
                        incoming.setPersonTags(new ArrayList<>(set));
                    }
                    incoming.setIsPublic(importAsPublic);
                    incoming.setCreatedBy(creatorUsername);
                    incoming.setCreatedTime(now);
                    incoming.setUpdatedTime(now);
                    personRepository.save(incoming);
                    person = incoming;
                }

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

    /**
     * 合并规则：单值属性以有值的为主（保留已有非空值），多值属性合并后去重。
     * 不修改 existing 的 personId、createdBy、createdTime、deleted、deletedTime、deletedBy、isPublic。
     */
    private void mergePersonData(Person existing, Person incoming) {
        existing.setChineseName(preferNonEmpty(existing.getChineseName(), incoming.getChineseName()));
        existing.setOriginalName(preferNonEmpty(existing.getOriginalName(), incoming.getOriginalName()));
        existing.setOrganization(preferNonEmpty(existing.getOrganization(), incoming.getOrganization()));
        existing.setBelongingGroup(preferNonEmpty(existing.getBelongingGroup(), incoming.getBelongingGroup()));
        existing.setGender(preferNonEmpty(existing.getGender(), incoming.getGender()));
        existing.setMaritalStatus(preferNonEmpty(existing.getMaritalStatus(), incoming.getMaritalStatus()));
        existing.setIdNumber(preferNonEmpty(existing.getIdNumber(), incoming.getIdNumber()));
        existing.setBirthDate(preferNonEmpty(existing.getBirthDate(), incoming.getBirthDate()));
        existing.setNationality(preferNonEmpty(existing.getNationality(), incoming.getNationality()));
        existing.setNationalityCode(preferNonEmpty(existing.getNationalityCode(), incoming.getNationalityCode()));
        existing.setHouseholdAddress(preferNonEmpty(existing.getHouseholdAddress(), incoming.getHouseholdAddress()));
        existing.setHighestEducation(preferNonEmpty(existing.getHighestEducation(), incoming.getHighestEducation()));
        existing.setIdCardNumber(preferNonEmpty(existing.getIdCardNumber(), incoming.getIdCardNumber()));
        existing.setPassportNumber(preferNonEmpty(existing.getPassportNumber(), incoming.getPassportNumber()));
        existing.setPassportType(preferNonEmpty(existing.getPassportType(), incoming.getPassportType()));
        existing.setVisaType(preferNonEmpty(existing.getVisaType(), incoming.getVisaType()));
        existing.setVisaNumber(preferNonEmpty(existing.getVisaNumber(), incoming.getVisaNumber()));
        existing.setWorkExperience(mergeJsonArrayField(existing.getWorkExperience(), incoming.getWorkExperience()));
        existing.setEducationExperience(mergeJsonArrayField(existing.getEducationExperience(), incoming.getEducationExperience()));
        existing.setRelatedPersons(mergeJsonArrayField(existing.getRelatedPersons(), incoming.getRelatedPersons()));
        existing.setRemark(preferNonEmpty(existing.getRemark(), incoming.getRemark()));
        existing.setIsKeyPerson(preferNonEmpty(existing.getIsKeyPerson(), incoming.getIsKeyPerson()));

        existing.setAliasNames(mergeAndDedupe(existing.getAliasNames(), incoming.getAliasNames()));
        existing.setAvatarFiles(mergeAndDedupe(existing.getAvatarFiles(), incoming.getAvatarFiles()));
        existing.setPhoneNumbers(mergeAndDedupe(existing.getPhoneNumbers(), incoming.getPhoneNumbers()));
        existing.setEmails(mergeAndDedupe(existing.getEmails(), incoming.getEmails()));
        existing.setPassportNumbers(mergeAndDedupe(existing.getPassportNumbers(), incoming.getPassportNumbers()));
        existing.setTwitterAccounts(mergeAndDedupe(existing.getTwitterAccounts(), incoming.getTwitterAccounts()));
        existing.setLinkedinAccounts(mergeAndDedupe(existing.getLinkedinAccounts(), incoming.getLinkedinAccounts()));
        existing.setFacebookAccounts(mergeAndDedupe(existing.getFacebookAccounts(), incoming.getFacebookAccounts()));
        existing.setPersonTags(mergeAndDedupe(existing.getPersonTags(), incoming.getPersonTags()));
    }

    private static String preferNonEmpty(String existing, String incoming) {
        if (existing != null && !existing.isBlank()) return existing;
        return incoming;
    }

    private static LocalDateTime preferNonEmpty(LocalDateTime existing, LocalDateTime incoming) {
        return existing != null ? existing : incoming;
    }

    private static Boolean preferNonEmpty(Boolean existing, Boolean incoming) {
        return existing != null ? existing : incoming;
    }

    /** 多值属性：合并两个列表并去重（保持顺序，已有在前） */
    private static List<String> mergeAndDedupe(List<String> existing, List<String> incoming) {
        java.util.Set<String> set = new java.util.LinkedHashSet<>();
        if (existing != null) set.addAll(existing);
        if (incoming != null) {
            for (String s : incoming) {
                if (s != null && !s.isBlank()) set.add(s.trim());
            }
        }
        return set.isEmpty() ? null : new ArrayList<>(set);
    }

    /**
     * JSON 数组类字段（工作经历、教育经历、关系人）合并去重：将两段 JSON 解析为数组，合并后按结构去重，再序列化回字符串。
     * 若任一侧非合法 JSON 或非数组/对象，则退化为单值以有值为主。
     */
    private String mergeJsonArrayField(String existingStr, String incomingStr) {
        List<JsonNode> existingItems = parseJsonToNodeList(existingStr);
        List<JsonNode> incomingItems = parseJsonToNodeList(incomingStr);
        if (existingItems == null && incomingItems == null) return preferNonEmpty(existingStr, incomingStr);
        if (existingItems == null) existingItems = new ArrayList<>();
        if (incomingItems == null) incomingItems = new ArrayList<>();
        List<JsonNode> merged = new ArrayList<>(existingItems);
        for (JsonNode in : incomingItems) {
            if (in == null || in.isNull()) continue;
            boolean duplicate = false;
            for (JsonNode ex : merged) {
                if (ex != null && ex.equals(in)) {
                    duplicate = true;
                    break;
                }
            }
            if (!duplicate) merged.add(in);
        }
        if (merged.isEmpty()) return null;
        try {
            ArrayNode array = objectMapper.createArrayNode();
            merged.forEach(array::add);
            String out = objectMapper.writeValueAsString(array);
            return out.isEmpty() ? null : out;
        } catch (Exception e) {
            log.warn("合并 JSON 数组字段时序列化失败，退回以有值为主", e);
            return preferNonEmpty(existingStr, incomingStr);
        }
    }

    /** 将 JSON 字符串解析为节点列表：若为数组则返回元素列表，若为对象则包装为单元素列表，否则返回 null。 */
    private List<JsonNode> parseJsonToNodeList(String jsonStr) {
        if (jsonStr == null || jsonStr.isBlank()) return null;
        try {
            JsonNode node = objectMapper.readTree(jsonStr.trim());
            if (node == null || node.isNull()) return null;
            if (node.isArray()) {
                List<JsonNode> list = new ArrayList<>();
                node.forEach(list::add);
                return list;
            }
            if (node.isObject()) return Collections.singletonList(node);
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 全部导入（异步）：将本任务下所有未导入的提取结果提交给后台异步任务逐批导入，接口立即返回。
     *
     * @return 本批提交的条数（将后台导入）
     */
    public int confirmImportAllAsync(String taskId, List<String> batchTags, boolean importAsPublic) {
        ArchiveImportTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("任务不存在: " + taskId));
        List<String> resultIds = extractResultRepository.findResultIdsByTaskIdAndImportedFalse(taskId);
        if (resultIds.isEmpty()) {
            return 0;
        }
        List<String> tags = (batchTags != null && !batchTags.isEmpty())
                ? batchTags.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().toList()
                : List.<String>of();
        asyncExecutor.runConfirmImportAllAsync(taskId, resultIds, tags, importAsPublic);
        log.info("【档案融合】已提交全部导入异步任务: taskId={}, 共 {} 条", taskId, resultIds.size());
        return resultIds.size();
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
        person.setMaritalStatus(stringOrNull(map.get("marital_status")));
        person.setNationality(nationality);
        person.setNationalityCode(stringOrNull(map.get("nationality_code")));
        person.setBirthDate(birthDate != null ? birthDate.atStartOfDay() : null);
        person.setHouseholdAddress(stringOrNull(map.get("household_address")));
        person.setHighestEducation(stringOrNull(map.get("highest_education")));
        person.setIdCardNumber(stringOrNull(map.get("id_card_number")));
        person.setRemark(stringOrNull(map.get("remark")));
        person.setIsKeyPerson(false);
        person.setIsPublic(true);
        person.setCreatedBy(null);
        person.setAliasNames(listFromMap(map, "alias_names"));
        person.setIdNumber(stringOrNull(map.get("id_number")));
        person.setPhoneNumbers(listFromMap(map, "phone_numbers"));
        person.setEmails(listFromMap(map, "emails"));
        person.setPassportNumbers(listFromMap(map, "passport_numbers"));
        person.setPassportNumber(stringOrNull(map.get("passport_number")));
        person.setPassportType(stringOrNull(map.get("passport_type")));
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
