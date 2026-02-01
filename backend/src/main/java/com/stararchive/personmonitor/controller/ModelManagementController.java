package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.dto.PredictionModelDTO;
import com.stararchive.personmonitor.service.ModelManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 智能化模型管理：模型 CRUD、启动/暂停、规则配置
 */
@Slf4j
@RestController
@RequestMapping("/models")
@RequiredArgsConstructor
public class ModelManagementController {

    private final ModelManagementService modelManagementService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PredictionModelDTO>>> list() {
        return ResponseEntity.ok(ApiResponse.success(modelManagementService.list()));
    }

    @GetMapping("/{modelId}")
    public ResponseEntity<ApiResponse<PredictionModelDTO>> getById(@PathVariable String modelId) {
        PredictionModelDTO dto = modelManagementService.getById(modelId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    /**
     * 分页查询模型命中（锁定）的人员列表，按可见性过滤（公开或当前用户为创建人）
     */
    @GetMapping("/{modelId}/locked-persons")
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getLockedPersons(
            @PathVariable String modelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-Username", required = false) String currentUser) {
        if (modelManagementService.getById(modelId) == null) {
            return ResponseEntity.notFound().build();
        }
        PageResponse<PersonCardDTO> result = modelManagementService.getLockedPersons(modelId, page, size, currentUser);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PredictionModelDTO>> create(@RequestBody PredictionModelDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("模型名称不能为空"));
        }
        PredictionModelDTO created = modelManagementService.create(dto);
        return ResponseEntity.ok(ApiResponse.success(created));
    }

    @PutMapping("/{modelId}")
    public ResponseEntity<ApiResponse<PredictionModelDTO>> update(
            @PathVariable String modelId,
            @RequestBody PredictionModelDTO dto) {
        PredictionModelDTO updated = modelManagementService.update(modelId, dto);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @DeleteMapping("/{modelId}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String modelId) {
        if (!modelManagementService.delete(modelId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/{modelId}/start")
    public ResponseEntity<ApiResponse<PredictionModelDTO>> start(@PathVariable String modelId) {
        PredictionModelDTO dto = modelManagementService.start(modelId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/{modelId}/pause")
    public ResponseEntity<ApiResponse<PredictionModelDTO>> pause(@PathVariable String modelId) {
        PredictionModelDTO dto = modelManagementService.pause(modelId);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/{modelId}/rule-config")
    public ResponseEntity<ApiResponse<Map<String, String>>> getRuleConfig(@PathVariable String modelId) {
        String ruleConfig = modelManagementService.getRuleConfig(modelId);
        if (ruleConfig == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(Map.of("ruleConfig", ruleConfig)));
    }

    @PutMapping("/{modelId}/rule-config")
    public ResponseEntity<ApiResponse<PredictionModelDTO>> updateRuleConfig(
            @PathVariable String modelId,
            @RequestBody Map<String, String> body) {
        String ruleConfig = body != null ? body.get("ruleConfig") : null;
        PredictionModelDTO dto = modelManagementService.updateRuleConfig(modelId, ruleConfig);
        if (dto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(ApiResponse.success(dto));
    }
}
