package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stararchive.personmonitor.config.BailianProperties;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.entity.PredictionModel;
import com.stararchive.personmonitor.entity.PredictionModelLockedPerson;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.PredictionModelLockedPersonRepository;
import com.stararchive.personmonitor.repository.PredictionModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 语义规则匹配服务：根据模型语义规则（自然语言）调用大模型对人物档案进行相似/条件匹配，
 * 模型启动后自动执行，将满足规则的人员写入 prediction_model_locked_person 并更新模型 locked_count。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SemanticModelMatchService {

    private static final int BATCH_SIZE = 20;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final BailianProperties bailianProperties;
    private final SystemConfigService systemConfigService;
    private final PredictionModelRepository predictionModelRepository;
    private final PersonRepository personRepository;
    private final PredictionModelLockedPersonRepository lockedPersonRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    private static final String SEMANTIC_MATCH_SYSTEM_PROMPT =
            "你是一个人物档案筛选助手。给定一条语义规则和若干人物档案（JSON数组，每项含 person_id, chinese_name, birth_date, gender, person_tags, organization, belonging_group 等），请判断每个人物是否满足该规则。\n"
                    + "请仅返回满足规则的人物 person_id 组成的 JSON 数组，格式如 [\"id1\",\"id2\"]。不要返回其他说明或 markdown 代码块。";

    /**
     * 模型启动后异步执行语义匹配：按语义规则调用大模型筛选人物，更新锁定人员表及模型 locked_count。
     */
    @Async
    @Transactional(rollbackFor = Exception.class)
    public void runSemanticMatchAsync(String modelId) {
        PredictionModel model = predictionModelRepository.findById(modelId).orElse(null);
        if (model == null) {
            log.warn("语义匹配：模型不存在 modelId={}", modelId);
            return;
        }
        String ruleConfig = model.getRuleConfig();
        if (ruleConfig == null || ruleConfig.isBlank()) {
            log.info("语义匹配：模型无语义规则，跳过 modelId={}", modelId);
            return;
        }
        log.info("语义匹配开始：modelId={}, rule={}", modelId, ruleConfig);

        List<String> allMatchedPersonIds = new ArrayList<>();
        int page = 0;
        org.springframework.data.domain.Pageable pageable =
                org.springframework.data.domain.PageRequest.of(page, BATCH_SIZE,
                        org.springframework.data.domain.Sort.by("personId"));
        org.springframework.data.domain.Page<Person> personPage = personRepository.findAll(pageable);

        while (personPage.hasContent()) {
            List<Person> batch = personPage.getContent();
            List<Map<String, Object>> summaries = batch.stream()
                    .map(this::toPersonSummary)
                    .collect(Collectors.toList());
            String summariesJson;
            try {
                summariesJson = objectMapper.writeValueAsString(summaries);
            } catch (Exception e) {
                log.warn("序列化人物摘要失败", e);
                page++;
                if (page >= personPage.getTotalPages()) break;
                pageable = org.springframework.data.domain.PageRequest.of(page, BATCH_SIZE,
                        org.springframework.data.domain.Sort.by("personId"));
                personPage = personRepository.findAll(pageable);
                continue;
            }
            List<String> batchMatched = callLlmMatchPersons(ruleConfig, summariesJson);
            if (batchMatched != null) {
                allMatchedPersonIds.addAll(batchMatched);
            }
            if (!personPage.hasNext()) break;
            page++;
            pageable = org.springframework.data.domain.PageRequest.of(page, BATCH_SIZE,
                    org.springframework.data.domain.Sort.by("personId"));
            personPage = personRepository.findAll(pageable);
        }

        lockedPersonRepository.deleteByModelId(modelId);
        LocalDateTime now = LocalDateTime.now();
        for (String personId : allMatchedPersonIds) {
            lockedPersonRepository.save(PredictionModelLockedPerson.builder()
                    .modelId(modelId)
                    .personId(personId)
                    .createdTime(now)
                    .build());
        }
        model.setLockedCount(allMatchedPersonIds.size());
        model.setUpdatedTime(now);
        predictionModelRepository.save(model);
        log.info("语义匹配完成：modelId={}, lockedCount={}", modelId, allMatchedPersonIds.size());
    }

    private Map<String, Object> toPersonSummary(Person p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("person_id", p.getPersonId());
        m.put("chinese_name", p.getChineseName());
        m.put("original_name", p.getOriginalName());
        if (p.getBirthDate() != null) {
            m.put("birth_date", p.getBirthDate().format(DATE_FMT));
            try {
                int year = p.getBirthDate().getYear();
                int age = java.time.Year.now().getValue() - year;
                m.put("age", age);
            } catch (Exception ignored) {}
        } else {
            m.put("birth_date", null);
        }
        m.put("gender", p.getGender());
        m.put("nationality", p.getNationality());
        m.put("person_tags", p.getPersonTags() != null ? p.getPersonTags() : Collections.emptyList());
        m.put("organization", p.getOrganization());
        m.put("belonging_group", p.getBelongingGroup());
        m.put("highest_education", p.getHighestEducation());
        return m;
    }

    /**
     * 调用大模型：给定语义规则和人物档案 JSON，返回满足规则的人物 person_id 数组。
     * 大模型配置优先使用系统配置，为空时回退到 application.yml 的 bailian 配置。
     */
    private List<String> callLlmMatchPersons(String semanticRule, String personsJson) {
        String apiKey = resolveLlmApiKey();
        String baseUrl = resolveLlmBaseUrl();
        String model = resolveLlmModel();
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("未配置大模型 API Key（系统配置与 bailian 均未配置），语义匹配跳过本批次");
            return Collections.emptyList();
        }
        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";
        String userContent = "语义规则：\n" + semanticRule + "\n\n人物档案列表：\n" + personsJson;

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", SEMANTIC_MATCH_SYSTEM_PROMPT),
                Map.of("role", "user", "content", userContent)
        ));
        body.put("response_format", Map.of("type", "json_object"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return Collections.emptyList();
            }
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.size() == 0) {
                return Collections.emptyList();
            }
            String content = choices.get(0).path("message").path("content").asText();
            content = unwrapJsonFromMarkdown(content.trim());
            JsonNode node = objectMapper.readTree(content);
            // 支持 {"person_ids": ["id1","id2"]} 或 直接 ["id1","id2"]
            if (node.isArray()) {
                List<String> list = objectMapper.convertValue(node, new TypeReference<List<String>>() {});
                return list != null ? list : Collections.emptyList();
            }
            if (node.has("person_ids")) {
                List<String> list = objectMapper.convertValue(node.get("person_ids"), new TypeReference<List<String>>() {});
                return list != null ? list : Collections.emptyList();
            }
            return Collections.emptyList();
        } catch (Exception e) {
            log.warn("大模型语义匹配本批次失败: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

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
}
