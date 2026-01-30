package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.SystemConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 系统配置数据访问
 */
@Repository
public interface SystemConfigRepository extends JpaRepository<SystemConfig, String> {

    List<SystemConfig> findAllByOrderByConfigKeyAsc();
}
