package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.ArchiveExtractResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 档案提取结果数据访问接口
 */
@Repository
public interface ArchiveExtractResultRepository extends JpaRepository<ArchiveExtractResult, String> {

    List<ArchiveExtractResult> findByTaskIdOrderByExtractIndexAsc(String taskId);
}
