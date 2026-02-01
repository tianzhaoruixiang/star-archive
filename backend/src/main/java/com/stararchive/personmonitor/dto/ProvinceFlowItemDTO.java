package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 省份间人员流动项（出发省 → 目的省，去重人数）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProvinceFlowItemDTO {
    /** 出发省份 */
    private String fromProvince;
    /** 目的省份 */
    private String toProvince;
    /** 该流动路径上去重人员数 */
    private long personCount;
}
