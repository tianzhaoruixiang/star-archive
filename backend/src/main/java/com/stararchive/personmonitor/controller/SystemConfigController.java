package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * 系统配置接口（系统名称、Logo、前端 base URL、导航显示隐藏）
 */
@RestController
@RequestMapping("/system-config")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService systemConfigService;

    /**
     * 获取公开配置（前端 Layout 使用，无需鉴权可放开）
     */
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<SystemConfigDTO>> getPublicConfig() {
        return ResponseEntity.ok(ApiResponse.success(systemConfigService.getPublicConfig()));
    }

    /**
     * 获取完整配置（管理端）
     */
    @GetMapping
    public ResponseEntity<ApiResponse<SystemConfigDTO>> getConfig() {
        return ResponseEntity.ok(ApiResponse.success(systemConfigService.getConfig()));
    }

    /**
     * 更新系统配置
     */
    @PutMapping
    public ResponseEntity<ApiResponse<SystemConfigDTO>> updateConfig(@RequestBody @Valid SystemConfigDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(systemConfigService.updateConfig(dto)));
    }
}
