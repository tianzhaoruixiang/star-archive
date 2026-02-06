package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.dto.KnowledgeBaseDTO;
import com.stararchive.personmonitor.service.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 智能问答 - 知识库 API
 */
@RestController
@RequestMapping("/smart-qa/knowledge-bases")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<KnowledgeBaseDTO>>> list(
            @RequestHeader(value = "X-Username", required = false) String username) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        List<KnowledgeBaseDTO> list = knowledgeBaseService.listByUser(username);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeBaseDTO>> get(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String id) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        KnowledgeBaseDTO dto = knowledgeBaseService.get(id, username);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<KnowledgeBaseDTO>> create(
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestBody Map<String, String> body) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        String name = body != null ? body.get("name") : null;
        try {
            KnowledgeBaseDTO dto = knowledgeBaseService.create(name, username);
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeBaseDTO>> update(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        String name = body != null ? body.get("name") : null;
        KnowledgeBaseDTO dto = knowledgeBaseService.update(id, name, username);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String id) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        boolean deleted = knowledgeBaseService.delete(id, username);
        if (!deleted) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
