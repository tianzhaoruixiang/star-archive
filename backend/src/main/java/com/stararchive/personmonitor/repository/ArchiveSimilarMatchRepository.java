package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.ArchiveSimilarMatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 档案相似匹配结果数据访问接口
 */
@Repository
public interface ArchiveSimilarMatchRepository extends JpaRepository<ArchiveSimilarMatch, Long> {

    List<ArchiveSimilarMatch> findByTaskId(String taskId);

    List<ArchiveSimilarMatch> findByResultId(String resultId);
}
