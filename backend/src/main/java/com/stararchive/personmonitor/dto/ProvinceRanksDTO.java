package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 首页各地排名数据（基于 person_travel 统计）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProvinceRanksDTO {

    /** 全部：各省份人员到达数量，数量越多排名越靠前 */
    private List<DashboardMapDTO.MapItem> all;
    /** 昨日新增：昨日到达各省份的人员数量 */
    private List<DashboardMapDTO.MapItem> yesterdayArrival;
    /** 昨日流出：昨日离开各省份的人员数量 */
    private List<DashboardMapDTO.MapItem> yesterdayDeparture;
    /** 驻留：各省份驻留人数 = 累计到达 - 累计离开 */
    private List<DashboardMapDTO.MapItem> stay;
}
