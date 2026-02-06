package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.QaSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QaSessionRepository extends JpaRepository<QaSession, String> {

    List<QaSession> findByKbIdAndCreatorUsernameOrderByUpdatedTimeDesc(String kbId, String creatorUsername);

    List<QaSession> findByCreatorUsernameOrderByUpdatedTimeDesc(String creatorUsername);

    List<QaSession> findByKbId(String kbId);

    void deleteByKbId(String kbId);

    void deleteByIdAndCreatorUsername(String id, String creatorUsername);
}
