package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.PredictionModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 预测模型数据访问
 */
@Repository
public interface PredictionModelRepository extends JpaRepository<PredictionModel, String> {

    List<PredictionModel> findAllByOrderByUpdatedTimeDesc();
}
