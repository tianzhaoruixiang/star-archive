package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.Directory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 重点人员库目录数据访问
 */
@Repository
public interface DirectoryRepository extends JpaRepository<Directory, Integer> {

    List<Directory> findByParentDirectoryIdIsNullOrderByDirectoryId();

    List<Directory> findByParentDirectoryIdOrderByDirectoryId(Integer parentId);
}
