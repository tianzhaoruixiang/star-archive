package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.entity.SystemConfig;
import com.stararchive.personmonitor.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 系统配置服务（key-value 读写，组装 DTO）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private static final String KEY_SYSTEM_NAME = "system_name";
    private static final String KEY_SYSTEM_LOGO_URL = "system_logo_url";
    private static final String KEY_FRONTEND_BASE_URL = "frontend_base_url";
    private static final String KEY_NAV_DASHBOARD = "nav_dashboard";
    private static final String KEY_NAV_PERSONS = "nav_persons";
    private static final String KEY_NAV_KEY_PERSON_LIBRARY = "nav_key_person_library";
    private static final String KEY_NAV_WORKSPACE = "nav_workspace";
    private static final String KEY_NAV_MODEL_MANAGEMENT = "nav_model_management";
    private static final String KEY_NAV_SITUATION = "nav_situation";
    private static final String KEY_NAV_SYSTEM_CONFIG = "nav_system_config";
    private static final String KEY_SHOW_PERSON_DETAIL_EDIT = "show_person_detail_edit";
    private static final String KEY_LLM_BASE_URL = "llm_base_url";
    private static final String KEY_LLM_MODEL = "llm_model";
    private static final String KEY_LLM_API_KEY = "llm_api_key";

    private final SystemConfigRepository systemConfigRepository;

    /**
     * 获取完整配置（供管理端编辑）
     */
    public SystemConfigDTO getConfig() {
        Map<String, String> map = getAllAsMap();
        return toDTO(map);
    }

    /**
     * 获取公开配置（供前端 Layout 使用：系统名、Logo、base URL、导航显示隐藏）
     */
    public SystemConfigDTO getPublicConfig() {
        return getConfig();
    }

    /**
     * 更新系统配置
     */
    @Transactional
    public SystemConfigDTO updateConfig(SystemConfigDTO dto) {
        Map<String, String> map = new HashMap<>();
        map.put(KEY_SYSTEM_NAME, dto.getSystemName() != null ? dto.getSystemName() : "");
        map.put(KEY_SYSTEM_LOGO_URL, dto.getSystemLogoUrl() != null ? dto.getSystemLogoUrl() : "");
        map.put(KEY_FRONTEND_BASE_URL, dto.getFrontendBaseUrl() != null ? dto.getFrontendBaseUrl() : "/");
        map.put(KEY_NAV_DASHBOARD, Boolean.TRUE.equals(dto.getNavDashboard()) ? "true" : "false");
        map.put(KEY_NAV_PERSONS, Boolean.TRUE.equals(dto.getNavPersons()) ? "true" : "false");
        map.put(KEY_NAV_KEY_PERSON_LIBRARY, Boolean.TRUE.equals(dto.getNavKeyPersonLibrary()) ? "true" : "false");
        map.put(KEY_NAV_WORKSPACE, Boolean.TRUE.equals(dto.getNavWorkspace()) ? "true" : "false");
        map.put(KEY_NAV_MODEL_MANAGEMENT, Boolean.TRUE.equals(dto.getNavModelManagement()) ? "true" : "false");
        map.put(KEY_NAV_SITUATION, Boolean.TRUE.equals(dto.getNavSituation()) ? "true" : "false");
        map.put(KEY_NAV_SYSTEM_CONFIG, Boolean.TRUE.equals(dto.getNavSystemConfig()) ? "true" : "false");
        map.put(KEY_SHOW_PERSON_DETAIL_EDIT, Boolean.TRUE.equals(dto.getShowPersonDetailEdit()) ? "true" : "false");
        map.put(KEY_LLM_BASE_URL, dto.getLlmBaseUrl() != null ? dto.getLlmBaseUrl().trim() : "");
        map.put(KEY_LLM_MODEL, dto.getLlmModel() != null ? dto.getLlmModel().trim() : "");
        map.put(KEY_LLM_API_KEY, dto.getLlmApiKey() != null ? dto.getLlmApiKey() : "");

        LocalDateTime now = LocalDateTime.now();
        for (Map.Entry<String, String> e : map.entrySet()) {
            SystemConfig entity = systemConfigRepository.findById(e.getKey())
                    .orElseGet(() -> new SystemConfig(e.getKey(), null, now));
            entity.setConfigValue(e.getValue());
            entity.setUpdatedTime(now);
            systemConfigRepository.save(entity);
        }
        log.info("系统配置已更新");
        return getConfig();
    }

    private Map<String, String> getAllAsMap() {
        List<SystemConfig> list = systemConfigRepository.findAllByOrderByConfigKeyAsc();
        Map<String, String> map = new HashMap<>();
        for (SystemConfig c : list) {
            if (c.getConfigKey() != null && c.getConfigValue() != null) {
                map.put(c.getConfigKey(), c.getConfigValue());
            }
        }
        return map;
    }

    private SystemConfigDTO toDTO(Map<String, String> map) {
        SystemConfigDTO dto = new SystemConfigDTO();
        dto.setSystemName(map.getOrDefault(KEY_SYSTEM_NAME, "重点人员档案监测系统"));
        dto.setSystemLogoUrl(map.getOrDefault(KEY_SYSTEM_LOGO_URL, ""));
        dto.setFrontendBaseUrl(map.getOrDefault(KEY_FRONTEND_BASE_URL, "/"));
        dto.setNavDashboard("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_DASHBOARD, "true")));
        dto.setNavPersons("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_PERSONS, "true")));
        dto.setNavKeyPersonLibrary("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_KEY_PERSON_LIBRARY, "true")));
        dto.setNavWorkspace("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_WORKSPACE, "true")));
        dto.setNavModelManagement("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_MODEL_MANAGEMENT, "true")));
        dto.setNavSituation("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_SITUATION, "true")));
        dto.setNavSystemConfig("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_SYSTEM_CONFIG, "true")));
        dto.setShowPersonDetailEdit("true".equalsIgnoreCase(map.getOrDefault(KEY_SHOW_PERSON_DETAIL_EDIT, "true")));
        dto.setLlmBaseUrl(map.getOrDefault(KEY_LLM_BASE_URL, ""));
        dto.setLlmModel(map.getOrDefault(KEY_LLM_MODEL, ""));
        dto.setLlmApiKey(map.getOrDefault(KEY_LLM_API_KEY, ""));
        return dto;
    }
}
