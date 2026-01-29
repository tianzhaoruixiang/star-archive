package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.SocialDynamicDTO;
import com.stararchive.personmonitor.service.SocialDynamicService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 社交动态控制器（态势感知-社交动态）
 */
@Slf4j
@RestController
@RequestMapping("/social-dynamics")
@RequiredArgsConstructor
public class SocialDynamicController {

    private final SocialDynamicService socialDynamicService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SocialDynamicDTO>>> getSocialList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String platform
    ) {
        PageResponse<SocialDynamicDTO> result = socialDynamicService.getSocialList(page, size, platform);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
