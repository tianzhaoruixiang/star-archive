package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 首页地图与四角卡片数据 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMapDTO {

    /** 各省人员数量（地图着色） name=省份名, value=人数 */
    private List<MapItem> provinceCounts;
    /** 机构分布 Top5 */
    private List<MapItem> orgTop5;
    /** 活跃省份排名（全部/昨日新增/驻留） */
    private List<MapItem> activeProvinceRank;
    /** 出入境签证类型统计 */
    private List<MapItem> visaTypeStats;
    /** 人员类别（业务标签）统计 */
    private List<MapItem> personCategoryStats;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MapItem {
        private String name;
        private Long value;
    }
}
