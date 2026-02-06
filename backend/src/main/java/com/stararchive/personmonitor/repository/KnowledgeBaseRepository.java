package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.KnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, String> {

    List<KnowledgeBase> findByCreatorUsernameOrderByUpdatedTimeDesc(String creatorUsername);

    void deleteByIdAndCreatorUsername(String id, String creatorUsername);
}
