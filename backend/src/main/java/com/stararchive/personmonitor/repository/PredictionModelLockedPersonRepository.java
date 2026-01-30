package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.PredictionModelLockedPerson;
import com.stararchive.personmonitor.entity.PredictionModelLockedPersonId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 模型锁定人员数据访问（语义规则匹配结果）
 */
@Repository
public interface PredictionModelLockedPersonRepository extends JpaRepository<PredictionModelLockedPerson, PredictionModelLockedPersonId> {

    List<PredictionModelLockedPerson> findByModelId(String modelId);

    long countByModelId(String modelId);

    @Modifying
    @Query("DELETE FROM PredictionModelLockedPerson p WHERE p.modelId = :modelId")
    void deleteByModelId(@Param("modelId") String modelId);
}
