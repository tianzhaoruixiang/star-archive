package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.PersonTravel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 人物行程数据访问接口
 */
@Repository
public interface PersonTravelRepository extends JpaRepository<PersonTravel, Long> {
    
    /**
     * 查询指定人物的行程记录
     */
    Page<PersonTravel> findByPersonIdOrderByEventTimeDesc(String personId, Pageable pageable);
    
    /**
     * 查询指定人物的所有行程记录
     */
    List<PersonTravel> findByPersonIdOrderByEventTimeDesc(String personId);
    
    /**
     * 查询指定人物在指定时间范围内的行程
     */
    List<PersonTravel> findByPersonIdAndEventTimeBetween(
            String personId, 
            LocalDateTime startTime, 
            LocalDateTime endTime
    );
    
    /**
     * 统计指定时间范围内的行程数量
     */
    @Query("SELECT COUNT(pt) FROM PersonTravel pt WHERE pt.eventTime >= :startTime AND pt.eventTime <= :endTime")
    long countByEventTimeBetween(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
}
