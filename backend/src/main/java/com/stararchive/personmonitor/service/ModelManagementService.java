package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.dto.PredictionModelDTO;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.entity.PredictionModel;
import com.stararchive.personmonitor.entity.PredictionModelLockedPerson;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.PredictionModelLockedPersonRepository;
import com.stararchive.personmonitor.repository.PredictionModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 智能化模型管理服务：模型 CRUD、启动/暂停、规则配置
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModelManagementService {

    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_PAUSED = "PAUSED";

    private final PredictionModelRepository predictionModelRepository;
    private final PredictionModelLockedPersonRepository lockedPersonRepository;
    private final PersonRepository personRepository;
    private final PersonService personService;
    private final SemanticModelMatchService semanticModelMatchService;
    private final SemanticText2SqlService semanticText2SqlService;

    public List<PredictionModelDTO> list() {
        return predictionModelRepository.findAllByOrderByUpdatedTimeDesc().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public PredictionModelDTO getById(String modelId) {
        return predictionModelRepository.findById(modelId)
                .map(this::toDTO)
                .orElse(null);
    }

    @Transactional
    public PredictionModelDTO create(PredictionModelDTO dto) {
        String modelId = UUID.randomUUID().toString().replace("-", "");
        PredictionModel entity = PredictionModel.builder()
                .modelId(modelId)
                .name(dto.getName() != null ? dto.getName().trim() : "")
                .description(dto.getDescription() != null ? dto.getDescription().trim() : null)
                .status(STATUS_PAUSED)
                .ruleConfig(dto.getRuleConfig())
                .lockedCount(0)
                .accuracy(null)
                .createdTime(LocalDateTime.now())
                .updatedTime(LocalDateTime.now())
                .build();
        entity = predictionModelRepository.save(entity);
        log.info("创建预测模型: modelId={}, name={}", modelId, entity.getName());
        return toDTO(entity);
    }

    @Transactional
    public PredictionModelDTO update(String modelId, PredictionModelDTO dto) {
        PredictionModel entity = predictionModelRepository.findById(modelId).orElse(null);
        if (entity == null) return null;
        if (dto.getName() != null) entity.setName(dto.getName().trim());
        if (dto.getDescription() != null) entity.setDescription(dto.getDescription().trim());
        if (dto.getRuleConfig() != null) entity.setRuleConfig(dto.getRuleConfig());
        entity.setUpdatedTime(LocalDateTime.now());
        entity = predictionModelRepository.save(entity);
        log.info("更新预测模型: modelId={}", modelId);
        return toDTO(entity);
    }

    @Transactional
    public boolean delete(String modelId) {
        if (!predictionModelRepository.existsById(modelId)) return false;
        lockedPersonRepository.deleteByModelId(modelId);
        predictionModelRepository.deleteById(modelId);
        log.info("删除预测模型: modelId={}", modelId);
        return true;
    }

    @Transactional
    public PredictionModelDTO start(String modelId) {
        PredictionModelDTO dto = setStatus(modelId, STATUS_RUNNING);
        if (dto != null) {
            semanticModelMatchService.runSemanticMatchAsync(modelId);
        }
        return dto;
    }

    @Transactional
    public PredictionModelDTO pause(String modelId) {
        return setStatus(modelId, STATUS_PAUSED);
    }

    private PredictionModelDTO setStatus(String modelId, String status) {
        PredictionModel entity = predictionModelRepository.findById(modelId).orElse(null);
        if (entity == null) return null;
        entity.setStatus(status);
        entity.setUpdatedTime(LocalDateTime.now());
        entity = predictionModelRepository.save(entity);
        log.info("模型状态变更: modelId={}, status={}", modelId, status);
        return toDTO(entity);
    }

    /**
     * 分页查询模型命中（锁定）的人员列表，仅返回当前用户可见的档案。
     */
    public PageResponse<PersonCardDTO> getLockedPersons(String modelId, int page, int size, String currentUser) {
        List<PredictionModelLockedPerson> locked = lockedPersonRepository.findByModelId(modelId);
        List<String> lockedIds = locked.stream()
                .map(PredictionModelLockedPerson::getPersonId)
                .collect(Collectors.toList());
        long total = lockedIds.size();
        if (total == 0) {
            return PageResponse.of(new ArrayList<>(), page, size > 0 ? size : 20, 0);
        }
        int from = page * size;
        int to = Math.min(from + size, (int) total);
        if (from >= total) {
            return PageResponse.of(new ArrayList<>(), page, size, total);
        }
        List<String> pageIds = lockedIds.subList(from, to);
        List<Person> persons = personRepository.findAllById(pageIds);
        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;
        List<Person> visible = persons.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsPublic())
                        || (user != null && user.equals(p.getCreatedBy())))
                .collect(Collectors.toList());
        Map<String, Person> byId = visible.stream().collect(Collectors.toMap(Person::getPersonId, p -> p, (a, b) -> a));
        List<Person> ordered = pageIds.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        List<PersonCardDTO> cards = ordered.stream()
                .map(personService::toCardDTO)
                .collect(Collectors.toList());
        return PageResponse.of(cards, page, size, total);
    }

    public String getRuleConfig(String modelId) {
        return predictionModelRepository.findById(modelId)
                .map(PredictionModel::getRuleConfig)
                .orElse(null);
    }

    @Transactional
    public PredictionModelDTO updateRuleConfig(String modelId, String ruleConfig) {
        PredictionModel entity = predictionModelRepository.findById(modelId).orElse(null);
        if (entity == null) return null;
        entity.setRuleConfig(ruleConfig);
        entity.setUpdatedTime(LocalDateTime.now());
        entity = predictionModelRepository.save(entity);
        log.info("更新模型规则配置: modelId={}", modelId);
        return toDTO(entity);
    }

    private static final int SEMANTIC_HIT_MAX_IDS = 10000;

    /**
     * 实时语义命中：根据模型语义规则 Text2Sql 查询 person 表，按可见性过滤后分页返回命中人数与列表。
     * 无规则或 Text2Sql 失败时返回 0 与空列表。
     */
    public PageResponse<PersonCardDTO> getSemanticHitPersons(String modelId, int page, int size, String currentUser) {
        PredictionModel model = predictionModelRepository.findById(modelId).orElse(null);
        if (model == null) {
            return PageResponse.of(new ArrayList<>(), page, size > 0 ? size : 20, 0);
        }
        String ruleConfig = model.getRuleConfig();
        if (ruleConfig == null || ruleConfig.isBlank()) {
            return PageResponse.of(new ArrayList<>(), page, size > 0 ? size : 20, 0);
        }
        String sql = semanticText2SqlService.generateSql(ruleConfig);
        if (sql == null) {
            return PageResponse.of(new ArrayList<>(), page, size > 0 ? size : 20, 0);
        }
        List<String> ids = personRepository.executeSelectPersonIds(sql, SEMANTIC_HIT_MAX_IDS);
        if (ids.isEmpty()) {
            return PageResponse.of(new ArrayList<>(), page, size > 0 ? size : 20, 0);
        }
        List<Person> persons = personRepository.findAllById(ids);
        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;
        List<Person> visible = persons.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsPublic())
                        || (user != null && user.equals(p.getCreatedBy())))
                .toList();
        long total = visible.size();
        int from = page * size;
        int to = Math.min(from + size, (int) total);
        if (from >= total) {
            return PageResponse.of(new ArrayList<>(), page, size, total);
        }
        List<Person> pageList = visible.subList(from, to);
        List<PersonCardDTO> cards = pageList.stream()
                .map(personService::toCardDTO)
                .collect(Collectors.toList());
        return PageResponse.of(cards, page, size, total);
    }

    private PredictionModelDTO toDTO(PredictionModel e) {
        PredictionModelDTO dto = new PredictionModelDTO();
        dto.setModelId(e.getModelId());
        dto.setName(e.getName());
        dto.setDescription(e.getDescription());
        dto.setStatus(e.getStatus());
        dto.setRuleConfig(e.getRuleConfig());
        dto.setLockedCount(e.getLockedCount() != null ? e.getLockedCount() : 0);
        dto.setAccuracy(e.getAccuracy());
        dto.setCreatedTime(e.getCreatedTime());
        dto.setUpdatedTime(e.getUpdatedTime());
        return dto;
    }
}
