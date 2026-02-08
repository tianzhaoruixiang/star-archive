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
    private static final String KEY_NAV_WORKSPACE_FUSION = "nav_workspace_fusion";
    private static final String KEY_NAV_WORKSPACE_TAGS = "nav_workspace_tags";
    private static final String KEY_NAV_WORKSPACE_FAVORITES = "nav_workspace_favorites";
    private static final String KEY_NAV_MODEL_MANAGEMENT = "nav_model_management";
    private static final String KEY_NAV_SITUATION = "nav_situation";
    private static final String KEY_NAV_SMART_QA = "nav_smart_qa";
    private static final String KEY_NAV_SYSTEM_CONFIG = "nav_system_config";
    private static final String KEY_SHOW_PERSON_DETAIL_EDIT = "show_person_detail_edit";
    private static final String KEY_LLM_BASE_URL = "llm_base_url";
    private static final String KEY_LLM_MODEL = "llm_model";
    private static final String KEY_LLM_API_KEY = "llm_api_key";
    private static final String KEY_LLM_EXTRACT_PROMPT_DEFAULT = "llm_extract_prompt_default";
    private static final String KEY_LLM_EMBEDDING_MODEL = "llm_embedding_model";
    /** 人物档案提取默认提示词（未在系统配置中自定义时使用的代码内置默认） */
    private static final String DEFAULT_LLM_EXTRACT_PROMPT =
            "你是一个人物档案抽取助手。从用户提供的文本中抽取**一个人物**的档案信息。"
                    + "系统会在提示词中提供一份完整的【人物档案 JSON Schema】，你必须严格按照该 JSON Schema 定义的字段名称、类型和结构返回结果；"
                    + "无法确定的字段可返回空字符串、null 或空数组，但**禁止随意增删字段名**。"
                    + "**重要：person_tags（人物标签）必须根据【上传文件的文件名】与【人物档案文本内容】综合推断，且只能从用户消息中提供的「参考标签表」里选择（可多选），标签名必须与参考表完全一致；若无法匹配则 person_tags 返回空数组 []。**"
                    + "请严格以 JSON 格式返回，**只返回一个 JSON 对象**，直接包含 JSON Schema 中定义的字段（不要包在 persons 数组里）。字符串用双引号，数组用 []。";
    private static final String KEY_ONLYOFFICE_DOCUMENT_SERVER_URL = "onlyoffice_document_server_url";
    private static final String KEY_ONLYOFFICE_DOCUMENT_DOWNLOAD_BASE = "onlyoffice_document_download_base";

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
        map.put(KEY_NAV_WORKSPACE_FUSION, Boolean.TRUE.equals(dto.getNavWorkspaceFusion()) ? "true" : "false");
        map.put(KEY_NAV_WORKSPACE_TAGS, Boolean.TRUE.equals(dto.getNavWorkspaceTags()) ? "true" : "false");
        map.put(KEY_NAV_WORKSPACE_FAVORITES, Boolean.TRUE.equals(dto.getNavWorkspaceFavorites()) ? "true" : "false");
        map.put(KEY_NAV_MODEL_MANAGEMENT, Boolean.TRUE.equals(dto.getNavModelManagement()) ? "true" : "false");
        map.put(KEY_NAV_SITUATION, Boolean.TRUE.equals(dto.getNavSituation()) ? "true" : "false");
        map.put(KEY_NAV_SMART_QA, Boolean.TRUE.equals(dto.getNavSmartQA()) ? "true" : "false");
        map.put(KEY_NAV_SYSTEM_CONFIG, Boolean.TRUE.equals(dto.getNavSystemConfig()) ? "true" : "false");
        map.put(KEY_SHOW_PERSON_DETAIL_EDIT, Boolean.TRUE.equals(dto.getShowPersonDetailEdit()) ? "true" : "false");
        map.put(KEY_LLM_BASE_URL, dto.getLlmBaseUrl() != null ? dto.getLlmBaseUrl().trim() : "");
        map.put(KEY_LLM_MODEL, dto.getLlmModel() != null ? dto.getLlmModel().trim() : "");
        map.put(KEY_LLM_API_KEY, dto.getLlmApiKey() != null ? dto.getLlmApiKey() : "");
        map.put(KEY_LLM_EXTRACT_PROMPT_DEFAULT, dto.getLlmExtractPromptDefault() != null ? dto.getLlmExtractPromptDefault().trim() : "");
        map.put(KEY_LLM_EMBEDDING_MODEL, dto.getLlmEmbeddingModel() != null ? dto.getLlmEmbeddingModel().trim() : "");
        map.put(KEY_ONLYOFFICE_DOCUMENT_SERVER_URL, dto.getOnlyofficeDocumentServerUrl() != null ? dto.getOnlyofficeDocumentServerUrl().trim() : "");
        map.put(KEY_ONLYOFFICE_DOCUMENT_DOWNLOAD_BASE, dto.getOnlyofficeDocumentDownloadBase() != null ? dto.getOnlyofficeDocumentDownloadBase().trim() : "");

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

    /** 返回人物档案提取代码内置默认提示词（系统配置中未设置默认提示词时使用） */
    public static String getDefaultExtractPrompt() {
        return DEFAULT_LLM_EXTRACT_PROMPT;
    }

    private SystemConfigDTO toDTO(Map<String, String> map) {
        SystemConfigDTO dto = new SystemConfigDTO();
        dto.setSystemName(map.getOrDefault(KEY_SYSTEM_NAME, "人员档案"));
        dto.setSystemLogoUrl(map.getOrDefault(KEY_SYSTEM_LOGO_URL, ""));
        dto.setFrontendBaseUrl(map.getOrDefault(KEY_FRONTEND_BASE_URL, "/"));
        dto.setNavDashboard("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_DASHBOARD, "true")));
        dto.setNavPersons("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_PERSONS, "true")));
        dto.setNavKeyPersonLibrary("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_KEY_PERSON_LIBRARY, "true")));
        dto.setNavWorkspace("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_WORKSPACE, "true")));
        dto.setNavWorkspaceFusion("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_WORKSPACE_FUSION, "true")));
        dto.setNavWorkspaceTags("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_WORKSPACE_TAGS, "true")));
        dto.setNavWorkspaceFavorites("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_WORKSPACE_FAVORITES, "true")));
        dto.setNavModelManagement("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_MODEL_MANAGEMENT, "true")));
        dto.setNavSituation("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_SITUATION, "true")));
        dto.setNavSmartQA("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_SMART_QA, "true")));
        dto.setNavSystemConfig("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_SYSTEM_CONFIG, "true")));
        dto.setShowPersonDetailEdit("true".equalsIgnoreCase(map.getOrDefault(KEY_SHOW_PERSON_DETAIL_EDIT, "true")));
        dto.setLlmBaseUrl(map.getOrDefault(KEY_LLM_BASE_URL, ""));
        dto.setLlmModel(map.getOrDefault(KEY_LLM_MODEL, ""));
        dto.setLlmApiKey(map.getOrDefault(KEY_LLM_API_KEY, ""));
        String storedDefault = map.get(KEY_LLM_EXTRACT_PROMPT_DEFAULT);
        dto.setLlmExtractPromptDefault((storedDefault != null && !storedDefault.isBlank()) ? storedDefault : DEFAULT_LLM_EXTRACT_PROMPT);
        dto.setLlmEmbeddingModel(map.getOrDefault(KEY_LLM_EMBEDDING_MODEL, ""));
        dto.setOnlyofficeDocumentServerUrl(map.getOrDefault(KEY_ONLYOFFICE_DOCUMENT_SERVER_URL, ""));
        dto.setOnlyofficeDocumentDownloadBase(map.getOrDefault(KEY_ONLYOFFICE_DOCUMENT_DOWNLOAD_BASE, ""));
        return dto;
    }
}
