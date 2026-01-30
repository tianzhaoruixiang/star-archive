package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 人物行程趋势 DTO（按日统计，支持按类型拆分）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TravelTrendDTO {

    /** 日期列表，如 ["2025-01-15", "2025-01-16", ...] */
    private List<String> dates;
    /** 系列：名称 + 每日数量，如 航班/火车/汽车/合计 */
    private List<SeriesItem> series;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeriesItem {
        private String name;
        private List<Long> data;
    }
}
