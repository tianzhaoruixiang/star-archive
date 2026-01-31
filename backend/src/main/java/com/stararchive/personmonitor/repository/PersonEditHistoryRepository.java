package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.PersonEditHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 人物档案编辑历史 Repository
 */
public interface PersonEditHistoryRepository extends JpaRepository<PersonEditHistory, String> {

    List<PersonEditHistory> findByPersonIdOrderByEditTimeDesc(String personId, org.springframework.data.domain.Pageable pageable);
}
