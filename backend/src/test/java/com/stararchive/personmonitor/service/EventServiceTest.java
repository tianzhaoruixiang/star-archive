package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.config.BailianProperties;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.entity.Event;
import com.stararchive.personmonitor.entity.EventNews;
import com.stararchive.personmonitor.entity.News;
import com.stararchive.personmonitor.repository.EventNewsRepository;
import com.stararchive.personmonitor.repository.EventRepository;
import com.stararchive.personmonitor.repository.NewsRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * 事件聚合单元测试：使用真实新闻数据，Mock 大模型返回摘要，验证事件与 event_news 的生成。
 */
@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventRepository eventRepository;
    @Mock
    private EventNewsRepository eventNewsRepository;
    @Mock
    private NewsRepository newsRepository;
    @Mock
    private SystemConfigService systemConfigService;
    @Mock
    private BailianProperties bailianProperties;
    @Mock
    private RestTemplate restTemplate;

    private EventService eventService;

    private static final String LLM_RESPONSE_SINGLE =
            "{\"choices\":[{\"message\":{\"content\":\"北京某区发生一起重大交通事故\"}}]}";
    private static final String LLM_RESPONSE_SAME_TOPIC =
            "{\"choices\":[{\"message\":{\"content\":\"上海市政府发布新的住房限购政策\"}}]}";

    @BeforeEach
    void setUp() {
        eventService = new EventService(
                eventRepository,
                eventNewsRepository,
                newsRepository,
                systemConfigService,
                bailianProperties,
                new com.fasterxml.jackson.databind.ObjectMapper(),
                restTemplate
        );
    }

    /**
     * 真实数据：三条同主题新闻，大模型返回相同摘要 → 应聚为 1 个事件，3 条 event_news。
     */
    @Test
    void runDailyExtraction_withRealNews_sameSummary_clustersIntoOneEvent() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDateTime t1 = yesterday.atStartOfDay().plusHours(8);
        LocalDateTime t2 = yesterday.atStartOfDay().plusHours(12);
        LocalDateTime t3 = yesterday.atStartOfDay().plusHours(18);

        News n1 = createNews("news-1", "北京朝阳区发生多车追尾事故", "今日上午北京朝阳区某路口发生多车追尾...", t1);
        News n2 = createNews("news-2", "朝阳区交通事故致多人受伤", "据报朝阳区交通事故造成多人受伤送医...", t2);
        News n3 = createNews("news-3", "北京一起重大交通事故最新进展", "北京交警通报朝阳区交通事故最新进展...", t3);

        when(eventNewsRepository.findAllNewsIdsInEvents()).thenReturn(Collections.emptyList());
        when(newsRepository.findByPublishTimeGreaterThanEqualOrderByPublishTimeAsc(any()))
                .thenReturn(List.of(n1, n2, n3));

        SystemConfigDTO config = new SystemConfigDTO();
        config.setLlmApiKey("test-key");
        config.setLlmBaseUrl("https://dashscope.aliyuncs.com/compatible-mode/v1");
        config.setLlmModel("qwen-plus");
        when(systemConfigService.getConfig()).thenReturn(config);

        // 三条新闻都返回同一句摘要，便于聚为一类
        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(LLM_RESPONSE_SINGLE));

        eventService.runDailyExtraction();

        ArgumentCaptor<Event> eventCaptor = ArgumentCaptor.forClass(Event.class);
        verify(eventRepository, times(1)).save(eventCaptor.capture());
        Event savedEvent = eventCaptor.getValue();
        assertNotNull(savedEvent.getEventId());
        assertTrue(savedEvent.getEventId().startsWith("evt-"));
        assertEquals("北京某区发生一起重大交通事故", savedEvent.getTitle());
        assertEquals(yesterday, savedEvent.getEventDate());
        assertEquals(3, savedEvent.getNewsCount());
        assertEquals(t1, savedEvent.getFirstPublishTime());
        assertEquals(t3, savedEvent.getLastPublishTime());

        ArgumentCaptor<EventNews> linkCaptor = ArgumentCaptor.forClass(EventNews.class);
        verify(eventNewsRepository, times(3)).save(linkCaptor.capture());
        List<EventNews> links = linkCaptor.getAllValues();
        assertEquals(savedEvent.getEventId(), links.get(0).getEventId());
        assertTrue(links.stream().map(EventNews::getNewsId).toList().containsAll(List.of("news-1", "news-2", "news-3")));
    }

    /**
     * 真实数据：两条不同日期的新闻，大模型返回相同摘要 → 按日期分组后各成 1 个事件。
     */
    @Test
    void runDailyExtraction_withRealNews_differentDates_createsTwoEvents() {
        LocalDate day1 = LocalDate.now().minusDays(2);
        LocalDate day2 = LocalDate.now().minusDays(1);
        News n1 = createNews("n1", "上海限购松绑", "上海发布住房限购新政...", day1.atStartOfDay().plusHours(10));
        News n2 = createNews("n2", "上海调整限购政策", "上海市进一步调整限购...", day2.atStartOfDay().plusHours(9));

        when(eventNewsRepository.findAllNewsIdsInEvents()).thenReturn(Collections.emptyList());
        when(newsRepository.findByPublishTimeGreaterThanEqualOrderByPublishTimeAsc(any()))
                .thenReturn(List.of(n1, n2));

        SystemConfigDTO config = new SystemConfigDTO();
        config.setLlmApiKey("test-key");
        config.setLlmBaseUrl("https://example.com");
        config.setLlmModel("qwen-plus");
        when(systemConfigService.getConfig()).thenReturn(config);

        when(restTemplate.exchange(any(String.class), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(LLM_RESPONSE_SAME_TOPIC))
                .thenReturn(ResponseEntity.ok(LLM_RESPONSE_SAME_TOPIC));

        eventService.runDailyExtraction();

        verify(eventRepository, times(2)).save(any(Event.class));
        verify(eventNewsRepository, times(2)).save(any(EventNews.class));
    }

    /**
     * 无候选新闻时跳过提取，不调用大模型、不落库。
     */
    @Test
    void runDailyExtraction_noCandidates_skipsExtraction() {
        when(eventNewsRepository.findAllNewsIdsInEvents()).thenReturn(Collections.emptyList());
        when(newsRepository.findByPublishTimeGreaterThanEqualOrderByPublishTimeAsc(any()))
                .thenReturn(Collections.emptyList());

        eventService.runDailyExtraction();

        verify(restTemplate, never()).exchange(any(), any(), any(), eq(String.class));
        verify(eventRepository, never()).save(any());
        verify(eventNewsRepository, never()).save(any());
    }

    /**
     * 未配置大模型 API Key 时跳过提取。
     */
    @Test
    void runDailyExtraction_noLlmKey_skipsExtraction() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        News n1 = createNews("n1", "某新闻", "正文", yesterday.atStartOfDay());
        when(eventNewsRepository.findAllNewsIdsInEvents()).thenReturn(Collections.emptyList());
        when(newsRepository.findByPublishTimeGreaterThanEqualOrderByPublishTimeAsc(any()))
                .thenReturn(List.of(n1));
        when(systemConfigService.getConfig()).thenReturn(new SystemConfigDTO());

        eventService.runDailyExtraction();

        verify(restTemplate, never()).exchange(any(), any(), any(), eq(String.class));
        verify(eventRepository, never()).save(any());
    }

    private static News createNews(String newsId, String title, String content, LocalDateTime publishTime) {
        News n = new News();
        n.setNewsId(newsId);
        n.setTitle(title);
        n.setContent(content);
        n.setPublishTime(publishTime);
        n.setMediaName("测试媒体");
        return n;
    }
}
