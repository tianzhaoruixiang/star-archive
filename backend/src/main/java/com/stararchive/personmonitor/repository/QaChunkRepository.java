package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.QaChunk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QaChunkRepository extends JpaRepository<QaChunk, String> {

    List<QaChunk> findByKbIdOrderBySeqAsc(String kbId);

    List<QaChunk> findByDocIdOrderBySeqAsc(String docId);

    void deleteByDocId(String docId);

    void deleteByKbId(String kbId);
}
