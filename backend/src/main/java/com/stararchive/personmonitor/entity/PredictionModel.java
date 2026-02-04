package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 预测模型实体 - 智能化模型管理
 */
@Entity
@Table(name = "prediction_model")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionModel {

    @Id
    @Column(name = "model_id", length = 64, nullable = false)
    private String modelId;

    @Column(name = "name", nullable = false, length = 300)
    private String name;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "status", nullable = false, length = 50)
    private String status;

    @Column(name = "rule_config", columnDefinition = "TEXT")
    private String ruleConfig;

    @Column(name = "locked_count")
    private Integer lockedCount;

    @Column(name = "accuracy", length = 100)
    private String accuracy;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
