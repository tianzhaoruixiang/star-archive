package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 模型锁定人员 - 语义规则匹配结果（模型启动后大模型根据语义规则筛选出的人员）
 */
@Entity
@Table(name = "prediction_model_locked_person")
@IdClass(PredictionModelLockedPersonId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionModelLockedPerson {

    @Id
    @Column(name = "model_id", nullable = false, length = 64)
    private String modelId;

    @Id
    @Column(name = "person_id", nullable = false, length = 200)
    private String personId;

    @Column(name = "created_time")
    private LocalDateTime createdTime;
}
