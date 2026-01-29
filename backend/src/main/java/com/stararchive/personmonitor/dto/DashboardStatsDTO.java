package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 首页统计数据DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    
    private Long totalPersonCount;
    private Long keyPersonCount;
    private Long todayNewsCount;
    private Long todaySocialDynamicCount;
}
