package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 预测模型 DTO（列表/详情/创建/更新）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionModelDTO {

    private String modelId;
    private String name;
    private String description;
    private String status;
    /** 语义规则（自然语言），如：满足年龄大于20岁且具有高消费标签的所有人群 */
    private String ruleConfig;
    private Integer lockedCount;
    private String accuracy;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}
