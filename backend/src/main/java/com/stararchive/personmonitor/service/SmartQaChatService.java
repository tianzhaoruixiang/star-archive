package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stararchive.personmonitor.config.BailianProperties;
import com.stararchive.personmonitor.dto.QaMessageDTO;
import com.stararchive.personmonitor.dto.SmartQaChatResponse;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.entity.QaChunk;
import com.stararchive.personmonitor.entity.QaSession;
import com.stararchive.personmonitor.repository.QaChunkRepository;
import com.stararchive.personmonitor.repository.QaSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * 智能问答 - RAG 检索与 LLM 对话
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmartQaChatService {

    private static final int RAG_TOP_K = 10;
    private static final int HISTORY_MESSAGES_LIMIT = 10;
    private static final String RAG_SYSTEM_PROMPT = "你是一个基于知识库的问答助手。请严格根据【参考知识库内容】回答用户问题；若参考内容中无法找到答案，请如实说明。不要编造内容。";

    private final QaSessionRepository qaSessionRepository;
    private final QaChunkRepository qaChunkRepository;
    private final QaMessageService qaMessageService;
    private final EmbeddingService embeddingService;
    private final SystemConfigService systemConfigService;
    private final BailianProperties bailianProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private static final ExecutorService STREAM_EXECUTOR = Executors.newCachedThreadPool();
    private static final long SSE_TIMEOUT_MS = 120_000L;

    /**
     * 发送用户消息，检索知识库，调用大模型生成回复并保存消息。
     */
    @Transactional(noRollbackFor = Exception.class)
    public SmartQaChatResponse chat(String sessionId, String userContent, String creatorUsername) {
        QaSession session = qaSessionRepository.findById(sessionId)
                .filter(s -> creatorUsername.equals(s.getCreatorUsername()))
                .orElse(null);
        if (session == null) {
            throw new IllegalArgumentException("会话不存在或无权操作");
        }
        String kbId = session.getKbId();

        qaMessageService.addMessage(sessionId, "user", userContent, creatorUsername);

        List<QaChunk> chunks = qaChunkRepository.findByKbIdOrderBySeqAsc(kbId);
        List<QaChunk> topChunks = retrieveTopChunks(chunks, userContent, RAG_TOP_K);
        String context = topChunks.stream()
                .map(QaChunk::getContent)
                .filter(c -> c != null && !c.isBlank())
                .collect(Collectors.joining("\n\n"));

        List<Map<String, String>> messages = buildMessages(sessionId, creatorUsername, userContent, context);

        String baseUrl = resolveLlmBaseUrl();
        String apiKey = resolveLlmApiKey();
        String model = resolveLlmModel();
        if (baseUrl == null || baseUrl.isBlank() || apiKey == null || apiKey.isBlank()) {
            String fallback = "未配置大模型，无法生成回复。请在系统配置中填写大模型 API 信息。";
            var msg = qaMessageService.addMessage(sessionId, "assistant", fallback, creatorUsername);
            return new SmartQaChatResponse(msg.getId(), fallback);
        }

        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", messages);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String content = extractContentFromChatResponse(response.getBody());
                if (content != null) {
                    var msg = qaMessageService.addMessage(sessionId, "assistant", content, creatorUsername);
                    return new SmartQaChatResponse(msg.getId(), content);
                }
            }
        } catch (Exception e) {
            log.warn("智能问答-大模型调用失败: sessionId={}, error={}", sessionId, e.getMessage());
        }
        String err = "大模型返回异常，请稍后重试。";
        var msg = qaMessageService.addMessage(sessionId, "assistant", err, creatorUsername);
        return new SmartQaChatResponse(msg.getId(), err);
    }

    /**
     * 流式对话：发送 SSE 事件 data: {"content":"delta"}，结束时 data: {"messageId":"xxx","done":true}。
     */
    @Transactional(noRollbackFor = Exception.class)
    public SseEmitter chatStream(String sessionId, String userContent, String creatorUsername) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        QaSession session = qaSessionRepository.findById(sessionId)
                .filter(s -> creatorUsername.equals(s.getCreatorUsername()))
                .orElse(null);
        if (session == null) {
            emitter.completeWithError(new IllegalArgumentException("会话不存在或无权操作"));
            return emitter;
        }
        String kbId = session.getKbId();
        qaMessageService.addMessage(sessionId, "user", userContent, creatorUsername);

        List<QaChunk> chunks = qaChunkRepository.findByKbIdOrderBySeqAsc(kbId);
        List<QaChunk> topChunks = retrieveTopChunks(chunks, userContent, RAG_TOP_K);
        String context = topChunks.stream()
                .map(QaChunk::getContent)
                .filter(c -> c != null && !c.isBlank())
                .collect(Collectors.joining("\n\n"));
        List<Map<String, String>> messages = buildMessages(sessionId, creatorUsername, userContent, context);

        String baseUrl = resolveLlmBaseUrl();
        String apiKey = resolveLlmApiKey();
        String model = resolveLlmModel();
        if (baseUrl == null || baseUrl.isBlank() || apiKey == null || apiKey.isBlank()) {
            String fallback = "未配置大模型，无法生成回复。请在系统配置中填写大模型 API 信息。";
            QaMessageDTO saved = qaMessageService.addMessage(sessionId, "assistant", fallback, creatorUsername);
            STREAM_EXECUTOR.execute(() -> sendStreamDone(emitter, fallback, saved.getId()));
            return emitter;
        }

        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";
        Map<String, Object> bodyMap = new HashMap<>();
        bodyMap.put("model", model);
        bodyMap.put("messages", messages);
        bodyMap.put("stream", true);
        String bodyJson;
        try {
            bodyJson = objectMapper.writeValueAsString(bodyMap);
        } catch (Exception e) {
            log.warn("序列化请求体失败: {}", e.getMessage());
            sendStreamError(emitter, "大模型请求异常，请稍后重试。");
            return emitter;
        }

        STREAM_EXECUTOR.execute(() -> {
            try {
                HttpClient client = HttpClient.newBuilder().build();
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(bodyJson, StandardCharsets.UTF_8))
                        .build();
                HttpResponse<java.util.stream.Stream<String>> response = client.send(
                        request,
                        HttpResponse.BodyHandlers.ofLines());
                StringBuilder fullContent = new StringBuilder();
                try (java.util.stream.Stream<String> lines = response.body()) {
                    lines.forEach(line -> {
                        if (line.startsWith("data: ")) {
                            String payload = line.substring(6).trim();
                            if ("[DONE]".equals(payload)) return;
                            String delta = extractDeltaContent(payload);
                            if (delta != null && !delta.isEmpty()) {
                                fullContent.append(delta);
                                try {
                                    emitter.send(SseEmitter.event().data(Map.of("content", delta)));
                                } catch (Exception e) {
                                    throw new RuntimeException(e);
                                }
                            }
                        }
                    });
                }
                String content = fullContent.toString();
                if (content.isEmpty()) content = "大模型未返回有效内容。";
                QaMessageDTO msg = qaMessageService.addMessage(sessionId, "assistant", content, creatorUsername);
                emitter.send(SseEmitter.event().data(Map.of("messageId", msg.getId(), "done", true)));
                emitter.complete();
            } catch (Exception e) {
                log.warn("智能问答-流式调用失败: sessionId={}, error={}", sessionId, e.getMessage());
                String err = "大模型调用异常，请稍后重试。";
                try {
                    QaMessageDTO msg = qaMessageService.addMessage(sessionId, "assistant", err, creatorUsername);
                    emitter.send(SseEmitter.event().data(Map.of("messageId", msg.getId(), "done", true)));
                } catch (Exception sendEx) {
                    // ignore
                }
                emitter.completeWithError(e);
            }
        });
        return emitter;
    }

    private void sendStreamDone(SseEmitter emitter, String content, String messageId) {
        try {
            emitter.send(SseEmitter.event().data(Map.of("content", content)));
            emitter.send(SseEmitter.event().data(Map.of("messageId", messageId, "done", true)));
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    }

    private void sendStreamError(SseEmitter emitter, String message) {
        try {
            emitter.send(SseEmitter.event().data(Map.of("error", message)));
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
    }

    /** 从 OpenAI 流式响应 data 行中解析 delta.content */
    private String extractDeltaContent(String dataJson) {
        try {
            JsonNode root = objectMapper.readTree(dataJson);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                return choices.get(0).path("delta").path("content").asText(null);
            }
        } catch (Exception e) {
            // ignore
        }
        return null;
    }

    private List<QaChunk> retrieveTopChunks(List<QaChunk> chunks, String query, int topK) {
        if (chunks == null || chunks.isEmpty()) return List.of();
        float[] queryEmb = embeddingService.embed(query);
        if (queryEmb != null) {
            return chunks.stream()
                    .filter(c -> c.getEmbedding() != null && !c.getEmbedding().isBlank())
                    .map(c -> {
                        float[] emb = parseEmbedding(c.getEmbedding());
                        double score = emb != null ? cosineSimilarity(queryEmb, emb) : 0;
                        return new Object[] { c, score };
                    })
                    .filter(pair -> ((double) pair[1]) > 0)
                    .sorted(Comparator.comparingDouble(p -> -((double) p[1])))
                    .limit(topK)
                    .map(p -> (QaChunk) p[0])
                    .collect(Collectors.toList());
        }
        String[] words = query.replaceAll("\\s+", " ").trim().split(" ");
        return chunks.stream()
                .filter(c -> {
                    String content = c.getContent();
                    if (content == null) return false;
                    for (String w : words) {
                        if (w.length() >= 2 && content.contains(w)) return true;
                    }
                    return false;
                })
                .limit(topK)
                .collect(Collectors.toList());
    }

    private float[] parseEmbedding(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            List<Double> list = objectMapper.readValue(json, new TypeReference<List<Double>>() {});
            if (list == null) return null;
            float[] arr = new float[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i).floatValue();
            return arr;
        } catch (Exception e) {
            return null;
        }
    }

    private static double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0 || nb == 0) return 0;
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    private List<Map<String, String>> buildMessages(String sessionId, String creatorUsername, String userContent, String context) {
        List<QaMessageDTO> history = qaMessageService.listBySession(sessionId, creatorUsername);
        int from = Math.max(0, history.size() - HISTORY_MESSAGES_LIMIT);
        List<Map<String, String>> messages = new ArrayList<>();
        String systemContent = RAG_SYSTEM_PROMPT + "\n\n【参考知识库内容】\n" + (context != null && !context.isBlank() ? context : "（暂无相关内容）");
        messages.add(Map.of("role", "system", "content", systemContent));
        for (int i = from; i < history.size(); i++) {
            var m = history.get(i);
            messages.add(Map.of("role", m.getRole(), "content", m.getContent() != null ? m.getContent() : ""));
        }
        return messages;
    }

    private String extractContentFromChatResponse(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                return choices.get(0).path("message").path("content").asText("");
            }
        } catch (Exception e) {
            log.warn("解析 chat 响应失败: {}", e.getMessage());
        }
        return null;
    }

    private String resolveLlmBaseUrl() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmBaseUrl() != null && !cfg.getLlmBaseUrl().isBlank()) return cfg.getLlmBaseUrl().trim();
        return bailianProperties.getBaseUrl() != null ? bailianProperties.getBaseUrl() : "";
    }

    private String resolveLlmApiKey() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmApiKey() != null && !cfg.getLlmApiKey().isBlank()) return cfg.getLlmApiKey();
        return bailianProperties.getApiKey() != null ? bailianProperties.getApiKey() : "";
    }

    private String resolveLlmModel() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmModel() != null && !cfg.getLlmModel().isBlank()) return cfg.getLlmModel().trim();
        return bailianProperties.getModel() != null ? bailianProperties.getModel() : "qwen-plus";
    }
}
