package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.PersonDirectory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 重点人员库-人员关联数据访问
 */
@Repository
public interface PersonDirectoryRepository extends JpaRepository<PersonDirectory, PersonDirectory.PersonDirectoryId> {

    long countById_DirectoryId(Integer directoryId);

    Page<PersonDirectory> findById_DirectoryId(Integer directoryId, Pageable pageable);

    /** 统计出现在任意目录中的不重复人员总数（用于「全部」） */
    @Query("SELECT COUNT(DISTINCT pd.id.personId) FROM PersonDirectory pd")
    long countDistinctPersonIds();

    /** 分页查询出现在任意目录中的不重复人员 ID（用于「全部」列表） */
    @Query(value = "SELECT DISTINCT pd.id.personId FROM PersonDirectory pd ORDER BY pd.id.personId")
    Page<String> findDistinctPersonIds(Pageable pageable);
}
