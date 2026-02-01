package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

    private final ArchiveImportTaskRepository taskRepository;
    private final ArchiveExtractResultRepository extractResultRepository;
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
    public ArchiveImportTaskDTO createTaskAndExtract(MultipartFile file, Integer creatorUserId, String creatorUsername) {
        String taskId = UUID.randomUUID().toString().replace("-", "");
        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
        String fileType = resolveFileType(fileName);

        log.info("【档案融合】创建任务开始: taskId={}, fileName={}, fileType={}, creatorUsername={}", 
                taskId, fileName, fileType, creatorUsername);

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
                .extractCount(0)
                .createdTime(LocalDateTime.now())
                .updatedTime(LocalDateTime.now())
                .build();
        taskRepository.save(task);
        log.info("【档案融合】任务已保存: taskId={}, status={}", taskId, STATUS_PENDING);

        // 通过单独的 Bean 调用异步方法，确保 @Async 代理生效
        log.info("【档案融合】准备触发异步提取: taskId={}", taskId);
        asyncExecutor.executeExtractionAsync(taskId);
        log.info("【档案融合】异步提取已触发，接口即将返回: taskId={}", taskId);
        
        return toTaskDTO(task);
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

    /**
     * 相似档案条件：原始姓名+出生日期+性别+国籍 均非空时才查询。
     * 比对范围仅限当前用户可见的档案：公开档案 或 创建人为 currentUsername 的私有档案。
     *
     * @param currentUsername 当前用户（任务创建人或查看详情的用户），为空时仅返回公开档案
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
     * 获取任务详情（提取结果及每条结果的库内相似档案）。相似档案比对范围仅限 currentUsername 可见的档案。
     *
     * @param currentUsername 当前用户（X-Username），为空时相似档案仅包含公开档案
     */
    public ArchiveFusionTaskDetailDTO getTaskDetail(String taskId, String currentUsername) {
        ArchiveImportTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NoSuchElementException("任务不存在: " + taskId));
        List<ArchiveExtractResult> results = extractResultRepository.findByTaskIdOrderByExtractIndexAsc(taskId);
        String user = (currentUsername != null && !currentUsername.isBlank()) ? currentUsername.trim() : null;
        List<ArchiveExtractResultDTO> resultDTOs = results.stream().map(r -> {
            List<Person> similar = findSimilarPersons(r.getOriginalName(), r.getBirthDate(), r.getGender(), r.getNationality(), user);
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
     * 人工确认后导入：将选中的提取结果写入 person 表；batchTags 不为空时为本批每个人物追加这些标签。
     *
     * @param importAsPublic true=导入为公开档案（所有人可见），false=导入为私有档案（仅创建人可见）
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
                Person person = mapFromRawJsonToPerson(map);
                if (person == null) continue;
                if (!tagsToAdd.isEmpty()) {
                    List<String> existing = person.getPersonTags() != null ? new ArrayList<>(person.getPersonTags()) : new ArrayList<>();
                    java.util.Set<String> set = new java.util.LinkedHashSet<>(existing);
                    set.addAll(tagsToAdd);
                    person.setPersonTags(new ArrayList<>(set));
                }
                person.setIsPublic(importAsPublic);
                person.setCreatedBy(creatorUsername);
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
        person.setIsPublic(true);
        person.setCreatedBy(null);
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
