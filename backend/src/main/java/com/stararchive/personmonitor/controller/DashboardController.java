package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.dto.DashboardMapDTO;
import com.stararchive.personmonitor.dto.DashboardStatsDTO;
import com.stararchive.personmonitor.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 首页大屏控制器
 */
@Slf4j
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    /**
     * 获取首页统计数据
     */
    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getStatistics() {
        DashboardStatsDTO stats = dashboardService.getStatistics();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    /**
     * 获取首页地图与四角卡片数据（机构分布、活跃省份、签证类型、人员类别）
     */
    @GetMapping("/map-stats")
    public ResponseEntity<ApiResponse<DashboardMapDTO>> getMapStats() {
        DashboardMapDTO mapStats = dashboardService.getMapStats();
        return ResponseEntity.ok(ApiResponse.success(mapStats));
    }
}
