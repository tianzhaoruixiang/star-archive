package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 事件表数据访问
 */
@Repository
public interface EventRepository extends JpaRepository<Event, String> {

    Page<Event> findAll(Pageable pageable);
}
