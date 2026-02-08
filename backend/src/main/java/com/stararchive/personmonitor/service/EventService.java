package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.config.BailianProperties;
import com.stararchive.personmonitor.dto.EventDetailDTO;
import com.stararchive.personmonitor.dto.EventDTO;
import com.stararchive.personmonitor.dto.NewsDTO;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.entity.Event;
import com.stararchive.personmonitor.entity.EventNews;
import com.stararchive.personmonitor.entity.News;
import com.stararchive.personmonitor.repository.EventNewsRepository;
import com.stararchive.personmonitor.repository.EventRepository;
import com.stararchive.personmonitor.repository.NewsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 事件服务：事件列表/详情、每日定时从新闻中提取事件（大模型摘要 + 流式聚类）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventService {

    private static final String EVENT_EXTRACT_SYSTEM_PROMPT =
            "你是一个新闻事件摘要助手。根据用户提供的新闻标题和正文，用一句话（不超过50字）概括该新闻所描述的事件，仅输出这一句话，不要其他解释。";

    private final EventRepository eventRepository;
    private final EventNewsRepository eventNewsRepository;
    private final NewsRepository newsRepository;
    private final SystemConfigService systemConfigService;
    private final BailianProperties bailianProperties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    public PageResponse<EventDTO> getEventList(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "eventDate").and(Sort.by(Sort.Direction.DESC, "lastPublishTime")));
        Page<Event> eventPage = eventRepository.findAll(pageable);
        List<EventDTO> list = eventPage.getContent().stream().map(this::toDTO).collect(Collectors.toList());
        return PageResponse.of(list, page, size, eventPage.getTotalElements());
    }

    public EventDetailDTO getEventDetail(String eventId) {
        return eventRepository.findById(eventId)
                .map(event -> {
                    List<EventNews> links = eventNewsRepository.findByEventIdOrderByPublishTimeDesc(eventId);
                    List<String> newsIds = links.stream().map(EventNews::getNewsId).collect(Collectors.toList());
                    List<News> newsList = newsRepository.findAllById(newsIds);
                    Map<String, News> newsMap = newsList.stream().collect(Collectors.toMap(News::getNewsId, n -> n));
                    List<NewsDTO> relatedNews = links.stream()
                            .map(en -> newsMap.get(en.getNewsId()))
                            .filter(Objects::nonNull)
                            .map(this::newsToDTO)
                            .collect(Collectors.toList());
                    return new EventDetailDTO(
                            event.getEventId(),
                            event.getTitle(),
                            event.getSummary(),
                            event.getEventDate(),
                            event.getNewsCount(),
                            event.getFirstPublishTime(),
                            event.getLastPublishTime(),
                            relatedNews
                    );
                })
                .orElse(null);
    }

    /**
     * 每日定时执行：从近期新闻中提取事件摘要，按相似性流式聚类后写入事件表。
     * 流程：1）取未入事件的近期新闻 2）大模型提取每条新闻的事件摘要 3）按日期+摘要相似度聚类 4）落库 Event 与 EventNews。
     */
    @Transactional
    public void runDailyExtraction() {
        LocalDateTime since = LocalDate.now().minusDays(1).atStartOfDay();
        Set<String> existingNewsIds = new HashSet<>(eventNewsRepository.findAllNewsIdsInEvents());
        List<News> candidates = newsRepository.findByPublishTimeGreaterThanEqualOrderByPublishTimeAsc(since).stream()
                .filter(n -> !existingNewsIds.contains(n.getNewsId()))
                .collect(Collectors.toList());
        if (candidates.isEmpty()) {
            log.info("【事件提取】近一日无未处理新闻，跳过");
            return;
        }
        String apiKey = resolveLlmApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("【事件提取】未配置大模型 API Key，跳过");
            return;
        }
        List<NewsWithSummary> withSummaries = new ArrayList<>();
        for (News n : candidates) {
            String summary = extractEventSummaryByLlm(n, apiKey);
            if (summary != null && !summary.isBlank()) {
                withSummaries.add(new NewsWithSummary(n, summary.trim()));
            }
        }
        if (withSummaries.isEmpty()) {
            log.info("【事件提取】未得到任何摘要，跳过聚类");
            return;
        }
        List<List<NewsWithSummary>> clusters = clusterByDateAndSimilarity(withSummaries);
        for (List<NewsWithSummary> cluster : clusters) {
            if (cluster.isEmpty()) continue;
            NewsWithSummary first = cluster.get(0);
            String title = first.summary;
            if (cluster.size() > 1) {
                title = cluster.stream().map(ns -> ns.summary).max(Comparator.comparingInt(String::length)).orElse(title);
            }
            LocalDate eventDate = first.news.getPublishTime().toLocalDate();
            LocalDateTime firstTime = cluster.stream().map(ns -> ns.news.getPublishTime()).min(LocalDateTime::compareTo).orElse(first.news.getPublishTime());
            LocalDateTime lastTime = cluster.stream().map(ns -> ns.news.getPublishTime()).max(LocalDateTime::compareTo).orElse(first.news.getPublishTime());
            String eventId = "evt-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            Event event = Event.builder()
                    .eventId(eventId)
                    .title(title.length() > 500 ? title.substring(0, 500) : title)
                    .summary(null)
                    .eventDate(eventDate)
                    .newsCount(cluster.size())
                    .firstPublishTime(firstTime)
                    .lastPublishTime(lastTime)
                    .createdTime(LocalDateTime.now())
                    .updatedTime(LocalDateTime.now())
                    .build();
            eventRepository.save(event);
            for (NewsWithSummary ns : cluster) {
                eventNewsRepository.save(new EventNews(eventId, ns.news.getNewsId(), ns.news.getPublishTime(), LocalDateTime.now()));
            }
            log.info("【事件提取】创建事件: eventId={}, title={}, newsCount={}", eventId, title.substring(0, Math.min(30, title.length())), cluster.size());
        }
    }

    private String extractEventSummaryByLlm(News news, String apiKey) {
        String baseUrl = resolveLlmBaseUrl();
        String model = resolveLlmModel();
        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";
        String userContent = "标题：" + (news.getTitle() != null ? news.getTitle() : "") + "\n正文：" + (news.getContent() != null ? news.getContent().substring(0, Math.min(2000, news.getContent().length())) : "");
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", EVENT_EXTRACT_SYSTEM_PROMPT),
                Map.of("role", "user", "content", userContent)
        ));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && choices.size() > 0) {
                    return choices.get(0).path("message").path("content").asText().trim();
                }
            }
        } catch (Exception e) {
            log.warn("【事件提取】LLM 调用失败: newsId={}, error={}", news.getNewsId(), e.getMessage());
        }
        return null;
    }

    /** 按事件日期分组，同日内按摘要相似度聚类（简单词集合 Jaccard） */
    private List<List<NewsWithSummary>> clusterByDateAndSimilarity(List<NewsWithSummary> withSummaries) {
        Map<LocalDate, List<NewsWithSummary>> byDate = withSummaries.stream().collect(Collectors.groupingBy(ns -> ns.news.getPublishTime().toLocalDate()));
        List<List<NewsWithSummary>> result = new ArrayList<>();
        for (List<NewsWithSummary> dayList : byDate.values()) {
            result.addAll(clusterBySimilarity(dayList, 0.25));
        }
        return result;
    }

    private List<List<NewsWithSummary>> clusterBySimilarity(List<NewsWithSummary> list, double threshold) {
        if (list.size() <= 1) return list.stream().map(Collections::singletonList).collect(Collectors.toList());
        List<List<NewsWithSummary>> clusters = new ArrayList<>();
        for (NewsWithSummary ns : list) {
            Set<String> ws = summaryWords(ns.summary);
            List<NewsWithSummary> found = null;
            for (List<NewsWithSummary> cluster : clusters) {
                for (NewsWithSummary c : cluster) {
                    if (jaccardSimilarity(ws, summaryWords(c.summary)) >= threshold) {
                        found = cluster;
                        break;
                    }
                }
                if (found != null) break;
            }
            if (found != null) found.add(ns);
            else clusters.add(new ArrayList<>(List.of(ns)));
        }
        return clusters;
    }

    private static Set<String> summaryWords(String s) {
        if (s == null || s.isBlank()) return Collections.emptySet();
        return Arrays.stream(s.replaceAll("\\p{P}", " ").split("\\s+")).filter(w -> w.length() >= 2).collect(Collectors.toSet());
    }

    private static double jaccardSimilarity(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) return 1.0;
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        Set<String> inter = new HashSet<>(a);
        inter.retainAll(b);
        return (double) inter.size() / union.size();
    }

    private String resolveLlmApiKey() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmApiKey() != null && !cfg.getLlmApiKey().isBlank()) return cfg.getLlmApiKey();
        return bailianProperties.getApiKey() != null ? bailianProperties.getApiKey() : "";
    }

    private String resolveLlmBaseUrl() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmBaseUrl() != null && !cfg.getLlmBaseUrl().isBlank()) return cfg.getLlmBaseUrl().trim();
        return bailianProperties.getBaseUrl() != null ? bailianProperties.getBaseUrl() : "";
    }

    private String resolveLlmModel() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmModel() != null && !cfg.getLlmModel().isBlank()) return cfg.getLlmModel().trim();
        return bailianProperties.getModel() != null ? bailianProperties.getModel() : "qwen-plus";
    }

    private EventDTO toDTO(Event e) {
        return new EventDTO(
                e.getEventId(),
                e.getTitle(),
                e.getSummary(),
                e.getEventDate(),
                e.getNewsCount(),
                e.getFirstPublishTime(),
                e.getLastPublishTime()
        );
    }

    private NewsDTO newsToDTO(News n) {
        return new NewsDTO(
                n.getNewsId(),
                n.getMediaName(),
                n.getTitle(),
                n.getContent(),
                n.getAuthors(),
                n.getPublishTime(),
                n.getTags(),
                n.getOriginalUrl(),
                n.getCategory()
        );
    }

    private static class NewsWithSummary {
        final News news;
        final String summary;

        NewsWithSummary(News news, String summary) {
            this.news = news;
            this.summary = summary;
        }
    }
}
