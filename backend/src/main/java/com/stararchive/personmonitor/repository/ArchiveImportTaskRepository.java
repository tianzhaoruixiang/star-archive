package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.ArchiveImportTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 档案导入任务数据访问接口
 */
@Repository
public interface ArchiveImportTaskRepository extends JpaRepository<ArchiveImportTask, String> {

    /**
     * 按创建者分页查询，按创建时间倒序
     */
    Page<ArchiveImportTask> findByCreatorUserIdOrderByCreatedTimeDesc(Integer creatorUserId, Pageable pageable);

    /**
     * 分页查询全部任务，按创建时间倒序
     */
    Page<ArchiveImportTask> findAllByOrderByCreatedTimeDesc(Pageable pageable);
}
