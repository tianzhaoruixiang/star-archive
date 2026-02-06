package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.dto.KnowledgeBaseDTO;
import com.stararchive.personmonitor.entity.KnowledgeBase;
import com.stararchive.personmonitor.repository.KnowledgeBaseRepository;
import com.stararchive.personmonitor.repository.QaChunkRepository;
import com.stararchive.personmonitor.repository.QaDocumentRepository;
import com.stararchive.personmonitor.repository.QaMessageRepository;
import com.stararchive.personmonitor.repository.QaSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 智能问答 - 知识库服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeBaseService {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final QaDocumentRepository qaDocumentRepository;
    private final QaChunkRepository qaChunkRepository;
    private final QaSessionRepository qaSessionRepository;
    private final QaMessageRepository qaMessageRepository;

    public List<KnowledgeBaseDTO> listByUser(String creatorUsername) {
        return knowledgeBaseRepository.findByCreatorUsernameOrderByUpdatedTimeDesc(creatorUsername)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public KnowledgeBaseDTO get(String id, String creatorUsername) {
        return knowledgeBaseRepository.findById(id)
                .filter(kb -> creatorUsername.equals(kb.getCreatorUsername()))
                .map(this::toDTO)
                .orElse(null);
    }

    @Transactional(noRollbackFor = Exception.class)
    public KnowledgeBaseDTO create(String name, String creatorUsername) {
        KnowledgeBase entity = new KnowledgeBase();
        entity.setId(UUID.randomUUID().toString());
        entity.setName(name != null ? name.trim() : "未命名知识库");
        entity.setCreatorUsername(creatorUsername);
        entity.setCreatedTime(LocalDateTime.now());
        entity.setUpdatedTime(LocalDateTime.now());
        knowledgeBaseRepository.save(entity);
        log.info("知识库已创建: id={}, name={}", entity.getId(), entity.getName());
        return toDTO(entity);
    }

    @Transactional(noRollbackFor = Exception.class)
    public KnowledgeBaseDTO update(String id, String name, String creatorUsername) {
        KnowledgeBase entity = knowledgeBaseRepository.findById(id)
                .filter(kb -> creatorUsername.equals(kb.getCreatorUsername()))
                .orElse(null);
        if (entity == null) {
            return null;
        }
        if (name != null && !name.isBlank()) {
            entity.setName(name.trim());
        }
        entity.setUpdatedTime(LocalDateTime.now());
        knowledgeBaseRepository.save(entity);
        return toDTO(entity);
    }

    @Transactional(noRollbackFor = Exception.class)
    public boolean delete(String id, String creatorUsername) {
        KnowledgeBase kb = knowledgeBaseRepository.findById(id)
                .filter(k -> creatorUsername.equals(k.getCreatorUsername()))
                .orElse(null);
        if (kb == null) {
            return false;
        }
        List<com.stararchive.personmonitor.entity.QaSession> sessions = qaSessionRepository.findByKbId(id);
        for (com.stararchive.personmonitor.entity.QaSession s : sessions) {
            qaMessageRepository.deleteBySessionId(s.getId());
        }
        qaSessionRepository.deleteByKbId(id);
        qaChunkRepository.deleteByKbId(id);
        qaDocumentRepository.deleteByKbId(id);
        knowledgeBaseRepository.deleteByIdAndCreatorUsername(id, creatorUsername);
        log.info("知识库已删除: id={}", id);
        return true;
    }

    private KnowledgeBaseDTO toDTO(KnowledgeBase e) {
        KnowledgeBaseDTO dto = new KnowledgeBaseDTO();
        dto.setId(e.getId());
        dto.setName(e.getName());
        dto.setCreatorUsername(e.getCreatorUsername());
        dto.setCreatedTime(e.getCreatedTime());
        dto.setUpdatedTime(e.getUpdatedTime());
        return dto;
    }
}
