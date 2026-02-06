package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.QaDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QaDocumentRepository extends JpaRepository<QaDocument, String> {

    List<QaDocument> findByKbIdOrderByCreatedTimeDesc(String kbId);

    void deleteByKbId(String kbId);
}
