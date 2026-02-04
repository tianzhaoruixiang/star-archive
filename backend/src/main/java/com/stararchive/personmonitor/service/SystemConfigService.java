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
    private static final String KEY_NAV_MODEL_MANAGEMENT = "nav_model_management";
    private static final String KEY_NAV_SITUATION = "nav_situation";
    private static final String KEY_NAV_SYSTEM_CONFIG = "nav_system_config";
    private static final String KEY_SHOW_PERSON_DETAIL_EDIT = "show_person_detail_edit";
    private static final String KEY_LLM_BASE_URL = "llm_base_url";
    private static final String KEY_LLM_MODEL = "llm_model";
    private static final String KEY_LLM_API_KEY = "llm_api_key";
    private static final String KEY_LLM_EXTRACT_PROMPT = "llm_extract_prompt";
    /** 人物档案提取内置默认提示词（与 ArchiveExtractionAsyncExecutor 使用同一默认） */
    private static final String DEFAULT_LLM_EXTRACT_PROMPT =
            "你是一个人物档案抽取助手。从用户提供的文本中抽取**一个人物**的档案信息。"
                    + "按以下字段提取（与人物表 person 结构一致），无法确定的填空字符串或空数组："
                    + "chinese_name(中文姓名)、original_name(原始姓名)、alias_names(别名数组)、gender(性别)、id_number(证件号码)、birth_date(出生日期 yyyy-MM-dd)、nationality(国籍)、nationality_code(国籍三字码)、household_address(户籍地址)、highest_education(最高学历)、phone_numbers(手机号数组)、emails(邮箱数组)、passport_numbers(护照号数组)、passport_number(主护照号)、passport_type(护照类型：普通护照/外交护照/公务护照/旅行证等)、id_card_number(身份证号)、person_tags(标签数组)、work_experience(工作经历JSON字符串)、education_experience(教育经历JSON字符串)、remark(备注)。"
                    + "**重要：person_tags（人物标签）必须根据【上传文件的文件名】与【人物档案文本内容】综合推断，且只能从用户消息中提供的「参考标签表」里选择（可多选），标签名必须与参考表完全一致；若无法匹配则 person_tags 返回空数组 []。**"
                    + "请严格以 JSON 格式返回，**只返回一个 JSON 对象**，直接包含上述字段（不要包在 persons 数组里）。字符串用双引号，数组用 []，日期格式 yyyy-MM-dd。";
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
        map.put(KEY_NAV_MODEL_MANAGEMENT, Boolean.TRUE.equals(dto.getNavModelManagement()) ? "true" : "false");
        map.put(KEY_NAV_SITUATION, Boolean.TRUE.equals(dto.getNavSituation()) ? "true" : "false");
        map.put(KEY_NAV_SYSTEM_CONFIG, Boolean.TRUE.equals(dto.getNavSystemConfig()) ? "true" : "false");
        map.put(KEY_SHOW_PERSON_DETAIL_EDIT, Boolean.TRUE.equals(dto.getShowPersonDetailEdit()) ? "true" : "false");
        map.put(KEY_LLM_BASE_URL, dto.getLlmBaseUrl() != null ? dto.getLlmBaseUrl().trim() : "");
        map.put(KEY_LLM_MODEL, dto.getLlmModel() != null ? dto.getLlmModel().trim() : "");
        map.put(KEY_LLM_API_KEY, dto.getLlmApiKey() != null ? dto.getLlmApiKey() : "");
        map.put(KEY_LLM_EXTRACT_PROMPT, dto.getLlmExtractPrompt() != null ? dto.getLlmExtractPrompt().trim() : "");
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

    /** 返回人物档案提取内置默认提示词（供前端展示及档案融合服务留空时使用） */
    public static String getDefaultExtractPrompt() {
        return DEFAULT_LLM_EXTRACT_PROMPT;
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
        dto.setNavWorkspaceFusion("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_WORKSPACE_FUSION, "true")));
        dto.setNavWorkspaceTags("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_WORKSPACE_TAGS, "true")));
        dto.setNavModelManagement("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_MODEL_MANAGEMENT, "true")));
        dto.setNavSituation("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_SITUATION, "true")));
        dto.setNavSystemConfig("true".equalsIgnoreCase(map.getOrDefault(KEY_NAV_SYSTEM_CONFIG, "true")));
        dto.setShowPersonDetailEdit("true".equalsIgnoreCase(map.getOrDefault(KEY_SHOW_PERSON_DETAIL_EDIT, "true")));
        dto.setLlmBaseUrl(map.getOrDefault(KEY_LLM_BASE_URL, ""));
        dto.setLlmModel(map.getOrDefault(KEY_LLM_MODEL, ""));
        dto.setLlmApiKey(map.getOrDefault(KEY_LLM_API_KEY, ""));
        dto.setLlmExtractPrompt(map.getOrDefault(KEY_LLM_EXTRACT_PROMPT, ""));
        dto.setLlmExtractPromptDefault(DEFAULT_LLM_EXTRACT_PROMPT);
        dto.setOnlyofficeDocumentServerUrl(map.getOrDefault(KEY_ONLYOFFICE_DOCUMENT_SERVER_URL, ""));
        dto.setOnlyofficeDocumentDownloadBase(map.getOrDefault(KEY_ONLYOFFICE_DOCUMENT_DOWNLOAD_BASE, ""));
        return dto;
    }
}
