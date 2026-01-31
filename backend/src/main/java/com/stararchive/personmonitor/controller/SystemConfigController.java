package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.service.SeaweedFSService;
import com.stararchive.personmonitor.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.Map;

/**
 * 系统配置接口（系统名称、Logo、前端 base URL、导航显示隐藏）
 */
@Slf4j
@RestController
@RequestMapping("/system-config")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService systemConfigService;
    private final SeaweedFSService seaweedFSService;

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

    /**
     * 上传系统 Logo 到 SeaweedFS（默认路径 archive-fusion/system/logo.{ext}），返回可用的 Logo URL。
     */
    @PostMapping("/logo")
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadLogo(
            @RequestParam("file") MultipartFile file) {
        try {
            String path = seaweedFSService.uploadSystemLogo(file);
            String logoUrl = seaweedFSService.getAvatarProxyPath(path);
            return ResponseEntity.ok(ApiResponse.success(Map.of("logoUrl", logoUrl)));
        } catch (Exception e) {
            log.warn("Logo 上传失败: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Logo 上传失败: " + (e.getMessage() != null ? e.getMessage() : "未知错误")));
        }
    }
}
