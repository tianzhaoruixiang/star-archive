package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.PersonSocialDynamic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 人物社交动态数据访问接口
 */
@Repository
public interface PersonSocialDynamicRepository extends JpaRepository<PersonSocialDynamic, String> {
    
    /**
     * 分页查询社交动态
     */
    Page<PersonSocialDynamic> findAllByOrderByPublishTimeDesc(Pageable pageable);
    
    /**
     * 查询指定人物的社交动态
     */
    @Query(value = "SELECT * FROM person_social_dynamic WHERE JSON_CONTAINS(related_person_ids, JSON_ARRAY(:personId)) = 1 ORDER BY publish_time DESC", nativeQuery = true)
    List<PersonSocialDynamic> findByPersonId(@Param("personId") String personId);
    
    /**
     * 统计今日社交动态数量
     */
    @Query("SELECT COUNT(psd) FROM PersonSocialDynamic psd WHERE psd.publishTime >= :startTime AND psd.publishTime <= :endTime")
    long countByPublishTimeBetween(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
    
    /**
     * 按社交平台查询
     */
    Page<PersonSocialDynamic> findBySocialAccountTypeOrderByPublishTimeDesc(String socialAccountType, Pageable pageable);
}
