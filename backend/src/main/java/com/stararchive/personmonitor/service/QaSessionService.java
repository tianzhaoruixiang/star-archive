package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.dto.QaSessionDTO;
import com.stararchive.personmonitor.entity.QaSession;
import com.stararchive.personmonitor.repository.KnowledgeBaseRepository;
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
 * 智能问答 - 会话服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QaSessionService {

    private final QaSessionRepository qaSessionRepository;
    private final QaMessageRepository qaMessageRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;

    public List<QaSessionDTO> listByUser(String creatorUsername) {
        return qaSessionRepository.findByCreatorUsernameOrderByUpdatedTimeDesc(creatorUsername)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<QaSessionDTO> listByKbAndUser(String kbId, String creatorUsername) {
        return qaSessionRepository.findByKbIdAndCreatorUsernameOrderByUpdatedTimeDesc(kbId, creatorUsername)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public QaSessionDTO get(String id, String creatorUsername) {
        return qaSessionRepository.findById(id)
                .filter(s -> creatorUsername.equals(s.getCreatorUsername()))
                .map(this::toDTO)
                .orElse(null);
    }

    @Transactional(noRollbackFor = Exception.class)
    public QaSessionDTO create(String kbId, String creatorUsername) {
        if (knowledgeBaseRepository.findById(kbId).filter(kb -> creatorUsername.equals(kb.getCreatorUsername())).isEmpty()) {
            throw new IllegalArgumentException("知识库不存在或无权操作");
        }
        QaSession entity = new QaSession();
        entity.setId(UUID.randomUUID().toString());
        entity.setKbId(kbId);
        entity.setTitle("新会话");
        entity.setCreatorUsername(creatorUsername);
        entity.setCreatedTime(LocalDateTime.now());
        entity.setUpdatedTime(LocalDateTime.now());
        qaSessionRepository.save(entity);
        log.info("会话已创建: id={}, kbId={}", entity.getId(), kbId);
        return toDTO(entity);
    }

    @Transactional(noRollbackFor = Exception.class)
    public QaSessionDTO updateTitle(String id, String title, String creatorUsername) {
        QaSession entity = qaSessionRepository.findById(id)
                .filter(s -> creatorUsername.equals(s.getCreatorUsername()))
                .orElse(null);
        if (entity == null) return null;
        entity.setTitle(title != null && !title.isBlank() ? title.trim() : entity.getTitle());
        entity.setUpdatedTime(LocalDateTime.now());
        qaSessionRepository.save(entity);
        return toDTO(entity);
    }

    @Transactional(noRollbackFor = Exception.class)
    public boolean delete(String id, String creatorUsername) {
        if (qaSessionRepository.findById(id).filter(s -> creatorUsername.equals(s.getCreatorUsername())).isEmpty()) {
            return false;
        }
        qaMessageRepository.deleteBySessionId(id);
        qaSessionRepository.deleteByIdAndCreatorUsername(id, creatorUsername);
        return true;
    }

    private QaSessionDTO toDTO(QaSession e) {
        QaSessionDTO dto = new QaSessionDTO();
        dto.setId(e.getId());
        dto.setKbId(e.getKbId());
        dto.setTitle(e.getTitle());
        dto.setCreatorUsername(e.getCreatorUsername());
        dto.setCreatedTime(e.getCreatedTime());
        dto.setUpdatedTime(e.getUpdatedTime());
        return dto;
    }
}
