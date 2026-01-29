package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.PersonDirectory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 重点人员库-人员关联数据访问
 */
@Repository
public interface PersonDirectoryRepository extends JpaRepository<PersonDirectory, PersonDirectory.PersonDirectoryId> {

    long countById_DirectoryId(Integer directoryId);

    Page<PersonDirectory> findById_DirectoryId(Integer directoryId, Pageable pageable);
}
