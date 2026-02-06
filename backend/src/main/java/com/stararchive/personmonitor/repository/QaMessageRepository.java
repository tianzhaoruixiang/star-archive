package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.QaMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QaMessageRepository extends JpaRepository<QaMessage, String> {

    List<QaMessage> findBySessionIdOrderByCreatedTimeAsc(String sessionId);

    void deleteBySessionId(String sessionId);
}
