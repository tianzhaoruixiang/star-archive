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
}
