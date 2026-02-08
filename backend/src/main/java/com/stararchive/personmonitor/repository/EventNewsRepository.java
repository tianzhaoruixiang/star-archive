package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.EventNews;
import com.stararchive.personmonitor.entity.EventNewsId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 事件-新闻关联表数据访问
 */
@Repository
public interface EventNewsRepository extends JpaRepository<EventNews, EventNewsId> {

    List<EventNews> findByEventIdOrderByPublishTimeDesc(String eventId);

    @Query("SELECT en.newsId FROM EventNews en WHERE en.eventId = :eventId")
    List<String> findNewsIdsByEventId(@Param("eventId") String eventId);

    @Query("SELECT en.newsId FROM EventNews en")
    List<String> findAllNewsIdsInEvents();
}
