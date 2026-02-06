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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 智能问答 - 文本嵌入服务（调用 OpenAI 兼容的 /embeddings 接口）。
 * 未配置嵌入模型时返回 null，RAG 将使用关键词检索。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmbeddingService {

    private static final String DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

    private final SystemConfigService systemConfigService;
    private final BailianProperties bailianProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 对单段文本做嵌入，返回向量；未配置 API 或嵌入模型时返回 null。
     */
    public float[] embed(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String baseUrl = resolveBaseUrl();
        String apiKey = resolveApiKey();
        String model = resolveEmbeddingModel();
        if (baseUrl == null || baseUrl.isBlank() || apiKey == null || apiKey.isBlank() || model == null || model.isBlank()) {
            log.debug("智能问答-嵌入：未配置 baseUrl/apiKey/embeddingModel，跳过向量嵌入");
            return null;
        }
        String url = baseUrl.replaceAll("/$", "") + "/embeddings";
        Map<String, Object> body = Map.of(
                "input", text,
                "model", model
        );
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode data = root.path("data");
                if (data.isArray() && data.size() > 0) {
                    JsonNode emb = data.get(0).path("embedding");
                    if (emb.isArray()) {
                        List<Float> list = new ArrayList<>();
                        emb.forEach(n -> list.add((float) n.asDouble()));
                        float[] arr = new float[list.size()];
                        for (int i = 0; i < list.size(); i++) {
                            arr[i] = list.get(i);
                        }
                        return arr;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("智能问答-嵌入调用失败: {}", e.getMessage());
        }
        return null;
    }

    private String resolveBaseUrl() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmBaseUrl() != null && !cfg.getLlmBaseUrl().isBlank()) {
            return cfg.getLlmBaseUrl().trim();
        }
        return bailianProperties.getBaseUrl() != null ? bailianProperties.getBaseUrl() : "";
    }

    private String resolveApiKey() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmApiKey() != null && !cfg.getLlmApiKey().isBlank()) {
            return cfg.getLlmApiKey();
        }
        return bailianProperties.getApiKey() != null ? bailianProperties.getApiKey() : "";
    }

    private String resolveEmbeddingModel() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmEmbeddingModel() != null && !cfg.getLlmEmbeddingModel().isBlank()) {
            return cfg.getLlmEmbeddingModel().trim();
        }
        return DEFAULT_EMBEDDING_MODEL;
    }
}
