package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.ArchiveExtractResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 档案提取结果数据访问接口
 */
@Repository
public interface ArchiveExtractResultRepository extends JpaRepository<ArchiveExtractResult, String> {

    List<ArchiveExtractResult> findByTaskIdOrderByExtractIndexAsc(String taskId);

    /** 分页查询某任务的提取结果（按 extractIndex 升序） */
    Page<ArchiveExtractResult> findByTaskIdOrderByExtractIndexAsc(String taskId, Pageable pageable);

    /** 查询某任务下未导入的 resultId 列表（用于全部导入异步任务） */
    @Query("SELECT r.resultId FROM ArchiveExtractResult r WHERE r.taskId = :taskId AND (r.imported IS NULL OR r.imported = false)")
    List<String> findResultIdsByTaskIdAndImportedFalse(@Param("taskId") String taskId);

    /** 统计某任务下未导入的条数 */
    @Query("SELECT COUNT(r) FROM ArchiveExtractResult r WHERE r.taskId = :taskId AND (r.imported IS NULL OR r.imported = false)")
    long countByTaskIdAndImportedFalse(@Param("taskId") String taskId);
}
