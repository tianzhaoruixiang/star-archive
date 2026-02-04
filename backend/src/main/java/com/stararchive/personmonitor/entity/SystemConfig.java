package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 系统配置实体（key-value 存储）
 */
@Entity
@Table(name = "system_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfig {

    @Id
    @Column(name = "config_key", nullable = false, length = 200)
    private String configKey;

    @Column(name = "config_value", length = 8000)
    private String configValue;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
