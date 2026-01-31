package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 省份下钻统计 DTO：该省人物分布与排名
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProvinceStatsDTO {

    /** 该省涉及的去重人员数（有目的地为该省行程的人员数） */
    private long totalPersonCount;
    /** 该省行程记录总数（目的地为该省） */
    private long travelRecordCount;
    /** 签证类型排名（该省行程按签证类型统计） */
    private List<RankItem> visaTypeRank;
    /** 机构分布排名（该省涉及人员按机构统计） */
    private List<RankItem> organizationRank;
    /** 所属群体排名（该省涉及人员按所属群体统计） */
    private List<RankItem> belongingGroupRank;
    /** 城市分布排名（该省行程按到达城市统计） */
    private List<RankItem> cityRank;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RankItem {
        private String name;
        private long value;
    }
}
