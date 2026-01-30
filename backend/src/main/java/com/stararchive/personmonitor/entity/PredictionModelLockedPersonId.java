package com.stararchive.personmonitor.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 模型锁定人员复合主键
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionModelLockedPersonId implements Serializable {

    private String modelId;
    private String personId;
}
