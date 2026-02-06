package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.dto.QaMessageDTO;
import com.stararchive.personmonitor.entity.QaMessage;
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
 * 智能问答 - 消息服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QaMessageService {

    private final QaMessageRepository qaMessageRepository;
    private final QaSessionRepository qaSessionRepository;

    public List<QaMessageDTO> listBySession(String sessionId, String creatorUsername) {
        if (qaSessionRepository.findById(sessionId).filter(s -> creatorUsername.equals(s.getCreatorUsername())).isEmpty()) {
            return List.of();
        }
        return qaMessageRepository.findBySessionIdOrderByCreatedTimeAsc(sessionId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(noRollbackFor = Exception.class)
    public QaMessageDTO addMessage(String sessionId, String role, String content, String creatorUsername) {
        if (qaSessionRepository.findById(sessionId).filter(s -> creatorUsername.equals(s.getCreatorUsername())).isEmpty()) {
            throw new IllegalArgumentException("会话不存在或无权操作");
        }
        QaMessage msg = new QaMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setSessionId(sessionId);
        msg.setRole(role);
        msg.setContent(content != null ? content : "");
        msg.setCreatedTime(LocalDateTime.now());
        qaMessageRepository.save(msg);
        return toDTO(msg);
    }

    private QaMessageDTO toDTO(QaMessage e) {
        QaMessageDTO dto = new QaMessageDTO();
        dto.setId(e.getId());
        dto.setSessionId(e.getSessionId());
        dto.setRole(e.getRole());
        dto.setContent(e.getContent());
        dto.setCreatedTime(e.getCreatedTime());
        return dto;
    }
}
