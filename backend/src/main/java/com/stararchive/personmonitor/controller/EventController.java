package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.EventDetailDTO;
import com.stararchive.personmonitor.dto.EventDTO;
import com.stararchive.personmonitor.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 事件控制器（态势感知-事件聚合）
 */
@Slf4j
@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<EventDTO>>> getEventList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<EventDTO> result = eventService.getEventList(page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDetailDTO>> getEventDetail(@PathVariable String eventId) {
        EventDetailDTO dto = eventService.getEventDetail(eventId);
        return dto != null
                ? ResponseEntity.ok(ApiResponse.success(dto))
                : ResponseEntity.status(404).body(ApiResponse.error("事件不存在"));
    }

    /**
     * 手动触发事件聚合：从近期新闻中提取事件摘要并聚类落库（与定时任务逻辑一致）。
     * @param sinceDays 可选，取最近几天内的新闻（默认 1）；测试或补跑历史时可传 30、365 等。
     * @param useLlm 是否调用大模型生成摘要（默认 true）；传 false 时仅用标题聚类，适合测试或无 API Key 时。
     */
    @PostMapping("/extract")
    public ResponseEntity<ApiResponse<String>> runExtraction(
            @RequestParam(required = false, defaultValue = "1") int sinceDays,
            @RequestParam(required = false, defaultValue = "true") boolean useLlm
    ) {
        try {
            eventService.runDailyExtraction(sinceDays, useLlm);
            return ResponseEntity.ok(ApiResponse.success("事件聚合已执行完成", null));
        } catch (Exception e) {
            log.error("【事件提取】手动触发异常", e);
            return ResponseEntity.status(500).body(ApiResponse.error("执行失败: " + e.getMessage()));
        }
    }
}
