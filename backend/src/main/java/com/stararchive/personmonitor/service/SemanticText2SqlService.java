package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stararchive.personmonitor.config.BailianProperties;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 语义转 SQL（Text2Sql）：根据自然语言规则调用百炼大模型生成仅查询 person 表的 SELECT 语句，
 * 用于模型管理「实时语义命中人数」统计。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SemanticText2SqlService {

    private static final String PERSON_SCHEMA_DESC =
            "表名: person。列: person_id(主键), chinese_name, original_name, organization, belonging_group, "
                    + "gender, birth_date, nationality, person_tags(JSON数组), remark, is_public, created_by, "
                    + "deleted(软删, 未删为false), marital_status, highest_education, visa_type, passport_number。";

    private static final String TEXT2SQL_SYSTEM_PROMPT =
            "你是 SQL 生成助手。根据给定的自然语言规则和 person 表结构，生成一条且仅一条 Doris 4.0 兼容的 SELECT 语句。\n"
                    + "要求：\n"
                    + "1. 只允许 SELECT 语句，只能查询 person 表。\n"
                    + "2. 必须只返回 person_id 列，格式：SELECT person_id FROM person WHERE <条件>。\n"
                    + "3. 条件中需包含 (deleted = 0 OR deleted IS NULL) 以排除已软删记录。\n"
                    + "4. person_tags 为 JSON 数组，判断包含某标签可用 JSON_CONTAINS(person_tags, JSON_ARRAY('标签名'))。\n"
                    + "5. 不要返回任何说明或 markdown 代码块，只返回一条 SQL。";

    private static final Pattern FORBIDDEN_SQL = Pattern.compile(
            "(?i)(UPDATE|DELETE|INSERT|DROP|CREATE|ALTER|TRUNCATE|EXEC|;\\s*$)");

    private final BailianProperties bailianProperties;
    private final SystemConfigService systemConfigService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 根据语义规则生成仅查询 person 表的 SELECT person_id 语句；失败或非法返回 null。
     */
    public String generateSql(String semanticRule) {
        if (semanticRule == null || semanticRule.isBlank()) {
            return null;
        }
        String apiKey = resolveLlmApiKey();
        String baseUrl = resolveLlmBaseUrl();
        String model = resolveLlmModel();
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("未配置大模型 API Key，Text2Sql 跳过");
            return null;
        }
        String userContent = "表结构说明：\n" + PERSON_SCHEMA_DESC + "\n\n自然语言规则：\n" + semanticRule.trim();

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", TEXT2SQL_SYSTEM_PROMPT),
                Map.of("role", "user", "content", userContent)
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return null;
            }
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.size() == 0) {
                return null;
            }
            String content = choices.get(0).path("message").path("content").asText();
            String sql = unwrapSql(content.trim());
            return validateAndNormalizeSql(sql);
        } catch (Exception e) {
            log.warn("Text2Sql 调用失败: {}", e.getMessage());
            return null;
        }
    }

    private static String unwrapSql(String content) {
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
     * 校验并规范化：仅允许 SELECT person_id FROM person ...，禁止多语句与写操作。
     */
    private String validateAndNormalizeSql(String sql) {
        if (sql == null || sql.isBlank()) return null;
        String s = sql.trim();
        if (s.endsWith(";")) {
            s = s.substring(0, s.length() - 1).trim();
        }
        String upper = s.toUpperCase();
        if (!upper.startsWith("SELECT ")) return null;
        if (FORBIDDEN_SQL.matcher(s).find()) return null;
        if (!upper.contains(" FROM PERSON")) return null;
        if (!upper.contains("PERSON_ID")) return null;
        String lower = s.toLowerCase();
        if (!lower.contains("deleted")) {
            if (lower.contains(" where ")) {
                s = s.replaceFirst("(?i)\\s+WHERE\\s+", " WHERE (deleted = 0 OR deleted IS NULL) AND ");
            } else {
                s = s.replaceFirst("(?i)FROM\\s+person\\s*$", "FROM person WHERE (deleted = 0 OR deleted IS NULL)");
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
