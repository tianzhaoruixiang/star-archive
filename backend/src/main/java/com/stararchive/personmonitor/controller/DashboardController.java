package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.dto.DashboardMapDTO;
import com.stararchive.personmonitor.dto.DashboardStatsDTO;
import com.stararchive.personmonitor.dto.ProvinceRanksDTO;
import com.stararchive.personmonitor.dto.ProvinceStatsDTO;
import com.stararchive.personmonitor.dto.TravelTrendDTO;
import com.stararchive.personmonitor.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

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
     * 按人员所属机构统计，返回 TOP15（用于首页机构分布）
     */
    @GetMapping("/organization-top15")
    public ResponseEntity<ApiResponse<List<DashboardMapDTO.MapItem>>> getOrganizationTop15() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getOrganizationTop15()));
    }

    /**
     * 按人物所属群体统计人数，用于首页群体类别卡片
     */
    @GetMapping("/group-category-stats")
    public ResponseEntity<ApiResponse<List<DashboardMapDTO.MapItem>>> getGroupCategoryStats() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getGroupCategoryStats()));
    }

    /**
     * 按人员档案签证类型统计，返回 TOP15（用于首页签证类型排名，统计 person 表 visa_type）
     */
    @GetMapping("/visa-type-top15")
    public ResponseEntity<ApiResponse<List<DashboardMapDTO.MapItem>>> getVisaTypeTop15() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getVisaTypeTop15()));
    }

    /**
     * 各地排名（全部 / 昨日新增 / 昨日流出 / 驻留），基于 person_travel 统计
     */
    @GetMapping("/province-ranks")
    public ResponseEntity<ApiResponse<ProvinceRanksDTO>> getProvinceRanks() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getProvinceRanks()));
    }

    /**
     * 人物行程趋势（近 N 天按日、按类型统计），用于首页「人物行程趋势分析」图表
     */
    @GetMapping("/travel-trend")
    public ResponseEntity<ApiResponse<TravelTrendDTO>> getTravelTrend(
            @RequestParam(defaultValue = "14") int days) {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getTravelTrend(days)));
    }

    /**
     * 获取首页地图与四角卡片数据（机构分布、活跃省份、签证类型、人员类别）
     */
    @GetMapping("/map-stats")
    public ResponseEntity<ApiResponse<DashboardMapDTO>> getMapStats() {
        DashboardMapDTO mapStats = dashboardService.getMapStats();
        return ResponseEntity.ok(ApiResponse.success(mapStats));
    }

    /**
     * 省份下钻统计：该省人物分布（去重人员数、行程数、签证/机构/群体排名）
     * @param provinceName URL 编码的省份名（如 北京市）
     */
    @GetMapping("/province/{provinceName}/stats")
    public ResponseEntity<ApiResponse<ProvinceStatsDTO>> getProvinceStats(
            @PathVariable String provinceName) {
        String decoded = provinceName;
        try {
            decoded = URLDecoder.decode(provinceName, StandardCharsets.UTF_8.name());
        } catch (UnsupportedEncodingException e) {
            // use as-is
        }
        ProvinceStatsDTO stats = dashboardService.getProvinceStats(decoded);
        return ResponseEntity.ok(ApiResponse.success(stats));
    }
}
