package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.dto.*;
import com.stararchive.personmonitor.service.QaDocumentService;
import com.stararchive.personmonitor.service.QaMessageService;
import com.stararchive.personmonitor.service.QaSessionService;
import com.stararchive.personmonitor.service.SmartQaChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

/**
 * 智能问答 - 文档、会话、消息、对话 API
 */
@RestController
@RequestMapping("/smart-qa")
@RequiredArgsConstructor
public class SmartQaController {

    private final QaDocumentService qaDocumentService;
    private final QaSessionService qaSessionService;
    private final QaMessageService qaMessageService;
    private final SmartQaChatService smartQaChatService;

    // ==================== 文档 ====================

    @PostMapping("/knowledge-bases/{kbId}/documents")
    public ResponseEntity<ApiResponse<QaDocumentDTO>> uploadDocument(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String kbId,
            @RequestParam("file") MultipartFile file) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请选择要上传的文件"));
        }
        try {
            QaDocumentDTO dto = qaDocumentService.upload(kbId, username, file);
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/knowledge-bases/{kbId}/documents")
    public ResponseEntity<ApiResponse<List<QaDocumentDTO>>> listDocuments(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String kbId) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        List<QaDocumentDTO> list = qaDocumentService.listByKb(kbId, username);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @DeleteMapping("/documents/{docId}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String docId) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        boolean deleted = qaDocumentService.delete(docId, username);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ==================== 会话 ====================

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<QaSessionDTO>>> listSessions(
            @RequestHeader(value = "X-Username", required = false) String username) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        List<QaSessionDTO> list = qaSessionService.listByUser(username);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/knowledge-bases/{kbId}/sessions")
    public ResponseEntity<ApiResponse<List<QaSessionDTO>>> listSessionsByKb(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String kbId) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        List<QaSessionDTO> list = qaSessionService.listByKbAndUser(kbId, username);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<ApiResponse<QaSessionDTO>> getSession(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String id) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        QaSessionDTO dto = qaSessionService.get(id, username);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<QaSessionDTO>> createSession(
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestBody Map<String, String> body) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        String kbId = body != null ? body.get("kbId") : null;
        if (kbId == null || kbId.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("缺少 kbId"));
        }
        try {
            QaSessionDTO dto = qaSessionService.create(kbId, username);
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/sessions/{id}")
    public ResponseEntity<ApiResponse<QaSessionDTO>> updateSessionTitle(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        String title = body != null ? body.get("title") : null;
        QaSessionDTO dto = qaSessionService.updateTitle(id, title, username);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String id) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        boolean deleted = qaSessionService.delete(id, username);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ==================== 消息 ====================

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<QaMessageDTO>>> listMessages(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String sessionId) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        List<QaMessageDTO> list = qaMessageService.listBySession(sessionId, username);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // ==================== 对话（流式 SSE） ====================

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestBody SmartQaChatRequest request) {
        if (username == null || username.isBlank()) {
            SseEmitter emitter = new SseEmitter(0L);
            emitter.completeWithError(new IllegalArgumentException("请先登录"));
            return emitter;
        }
        if (request == null || request.getSessionId() == null || request.getSessionId().isBlank()) {
            SseEmitter emitter = new SseEmitter(0L);
            emitter.completeWithError(new IllegalArgumentException("缺少 sessionId"));
            return emitter;
        }
        if (request.getContent() == null || request.getContent().isBlank()) {
            SseEmitter emitter = new SseEmitter(0L);
            emitter.completeWithError(new IllegalArgumentException("请输入问题"));
            return emitter;
        }
        return smartQaChatService.chatStream(
                request.getSessionId(),
                request.getContent(),
                username);
    }
}
