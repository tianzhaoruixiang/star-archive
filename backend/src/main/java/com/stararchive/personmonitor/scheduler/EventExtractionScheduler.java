package com.stararchive.personmonitor.scheduler;

import com.stararchive.personmonitor.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 事件提取定时任务：每日凌晨 2 点从新闻中提取事件并聚类落库
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EventExtractionScheduler {

    private final EventService eventService;

    /** 每天 02:00 执行 */
    @Scheduled(cron = "${event.extraction.cron:0 0 2 * * ?}")
    public void runDailyExtraction() {
        log.info("【事件提取】定时任务开始");
        try {
            eventService.runDailyExtraction();
        } catch (Exception e) {
            log.error("【事件提取】定时任务异常", e);
        }
        log.info("【事件提取】定时任务结束");
    }
}
