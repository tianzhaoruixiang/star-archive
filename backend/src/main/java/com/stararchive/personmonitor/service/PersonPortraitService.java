package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stararchive.personmonitor.config.BailianProperties;
import com.stararchive.personmonitor.dto.SystemConfigDTO;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.entity.SysUser;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.SysUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.persistence.EntityNotFoundException;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 智能画像服务：根据人物编号查询并组装人物基本信息，再将人物信息传入大模型上下文做人物画像分析。
 * 流程：① 根据人物编号查询并组装人物基本信息 ② 将人物信息作为 user 消息传入大模型，由大模型生成画像分析。
 * 大模型配置与档案融合一致（系统配置 llm_* / application.yml bailian）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PersonPortraitService {

    private static final String SYSTEM_PROMPT = "你是一位人物分析专家。根据以下人物档案基本信息，生成一段简洁的人物画像分析。"
            + "分析内容可包括：身份特征、可能关注领域、风险维度（如有）、建议关注点等。"
            + "要求客观、简洁、分条或分段呈现，总长度控制在 400 字以内。直接输出分析正文，不要输出「分析：」等前缀。";

    private static final int WORK_EXPERIENCE_PREVIEW = 600;
    private static final int EDUCATION_PREVIEW = 400;

    private final PersonRepository personRepository;
    private final SysUserRepository sysUserRepository;
    private final SystemConfigService systemConfigService;
    private final BailianProperties bailianProperties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 根据人物编号生成智能画像。仅当档案对当前用户可见时可调用；未配置大模型时返回提示文案。
     * 流程：① 根据人物编号查询并组装人物基本信息 ② 将人物信息传入大模型上下文做人物画像分析。
     *
     * @param personId    人物编号
     * @param currentUser 当前登录用户名（X-Username），为空时仅可分析公开且未删除的档案
     * @return 智能画像正文，或未配置/失败时的提示信息
     */
    public String generatePortraitAnalysis(String personId, String currentUser) {
        // ① 根据人物编号查询并组装人物基本信息
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new NoSuchElementException("人员不存在: " + personId));

        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;
        boolean visible = Boolean.TRUE.equals(person.getIsPublic())
                || (user != null && user.equals(person.getCreatedBy()));
        if (!visible) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        if (Boolean.TRUE.equals(person.getDeleted())) {
            boolean canView = false;
            if (user != null) {
                if (Boolean.TRUE.equals(person.getIsPublic())) {
                    Optional<SysUser> sysUser = sysUserRepository.findByUsername(user);
                    canView = sysUser.map(u -> "admin".equals(u.getRole())).orElse(false);
                } else {
                    canView = user.equals(person.getCreatedBy());
                }
            }
            if (!canView) {
                throw new EntityNotFoundException("人员不存在: " + personId);
            }
        }

        String basicInfoContext = assembleBasicInfoByPerson(personId, person);

        String apiKey = resolveLlmApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("【智能画像】未配置大模型 API Key，跳过: personId={}", personId);
            return "未配置大模型，无法生成智能画像。请在系统配置中填写大模型 API 信息。";
        }

        // ② 将人物信息传入大模型上下文做人物画像分析
        String baseUrl = resolveLlmBaseUrl();
        String model = resolveLlmModel();
        String url = baseUrl.replaceAll("/$", "") + "/chat/completions";

        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", List.of(
                Map.of("role", "system", "content", SYSTEM_PROMPT),
                Map.of("role", "user", "content", basicInfoContext)
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        log.info("【智能画像】调用大模型: personId={}, url={}", personId, url);
        long start = System.currentTimeMillis();
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            long elapsed = System.currentTimeMillis() - start;
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String content = extractContentFromChatResponse(response.getBody());
                if (content != null && !content.isBlank()) {
                    log.info("【智能画像】成功: personId={}, 耗时={}ms", personId, elapsed);
                    return content.trim();
                }
            }
            log.warn("【智能画像】响应异常: personId={}, status={}", personId, response.getStatusCode());
            return "大模型返回结果为空，请稍后重试。";
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            log.error("【智能画像】调用异常: personId={}, 耗时={}ms", personId, elapsed, e);
            return "智能画像请求失败：" + (e.getMessage() != null ? e.getMessage() : "网络或服务异常");
        }
    }

    /**
     * 根据已查询的 Person 组装人物基本信息文本，供传入大模型上下文。
     * 包含人物编号及档案各字段，便于大模型做人物画像分析。
     */
    private String assembleBasicInfoByPerson(String personId, Person person) {
        StringBuilder sb = new StringBuilder();
        sb.append("【人物档案基本信息】\n\n");
        sb.append("人物编号：").append(personId).append("\n");
        sb.append("姓名：").append(str(person.getChineseName())).append(" / ").append(str(person.getOriginalName())).append("\n");
        if (person.getAliasNames() != null && !person.getAliasNames().isEmpty()) {
            sb.append("别名：").append(String.join("、", person.getAliasNames())).append("\n");
        }
        sb.append("所属机构：").append(str(person.getOrganization())).append("\n");
        sb.append("所属群体：").append(str(person.getBelongingGroup())).append("\n");
        sb.append("性别：").append(str(person.getGender())).append("\n");
        sb.append("国籍：").append(str(person.getNationality())).append(" ").append(str(person.getNationalityCode())).append("\n");
        if (person.getBirthDate() != null) {
            sb.append("出生日期：").append(person.getBirthDate().format(DateTimeFormatter.ISO_LOCAL_DATE)).append("\n");
        }
        sb.append("户籍/现居：").append(str(person.getHouseholdAddress())).append("\n");
        sb.append("最高学历：").append(str(person.getHighestEducation())).append("\n");
        sb.append("证件号：").append(str(person.getIdNumber())).append(" / ").append(str(person.getIdCardNumber())).append("\n");
        sb.append("签证类型：").append(str(person.getVisaType())).append(" 签证号码：").append(str(person.getVisaNumber())).append("\n");
        sb.append("主护照号：").append(str(person.getPassportNumber())).append(" 护照类型：").append(str(person.getPassportType())).append("\n");
        if (person.getPersonTags() != null && !person.getPersonTags().isEmpty()) {
            sb.append("人物标签：").append(String.join("、", person.getPersonTags())).append("\n");
        }
        if (person.getWorkExperience() != null && !person.getWorkExperience().isBlank()) {
            String work = person.getWorkExperience().length() > WORK_EXPERIENCE_PREVIEW
                    ? person.getWorkExperience().substring(0, WORK_EXPERIENCE_PREVIEW) + "..."
                    : person.getWorkExperience();
            sb.append("工作经历摘要：").append(work).append("\n");
        }
        if (person.getEducationExperience() != null && !person.getEducationExperience().isBlank()) {
            String edu = person.getEducationExperience().length() > EDUCATION_PREVIEW
                    ? person.getEducationExperience().substring(0, EDUCATION_PREVIEW) + "..."
                    : person.getEducationExperience();
            sb.append("教育经历摘要：").append(edu).append("\n");
        }
        sb.append("备注：").append(str(person.getRemark())).append("\n");
        return sb.toString();
    }

    private static String str(Object o) {
        if (o == null) return "—";
        String s = o.toString().trim();
        return s.isEmpty() ? "—" : s;
    }

    private String extractContentFromChatResponse(String responseBody) {
        try {
            var root = objectMapper.readTree(responseBody);
            var choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                return choices.get(0).path("message").path("content").asText(null);
            }
        } catch (Exception e) {
            log.debug("解析画像分析响应失败", e);
        }
        return null;
    }

    private String resolveLlmApiKey() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmApiKey() != null && !cfg.getLlmApiKey().isBlank()) {
            return cfg.getLlmApiKey();
        }
        return bailianProperties.getApiKey() != null ? bailianProperties.getApiKey() : "";
    }

    private String resolveLlmBaseUrl() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmBaseUrl() != null && !cfg.getLlmBaseUrl().isBlank()) {
            return cfg.getLlmBaseUrl().trim();
        }
        return bailianProperties.getBaseUrl() != null ? bailianProperties.getBaseUrl() : "";
    }

    private String resolveLlmModel() {
        SystemConfigDTO cfg = systemConfigService.getConfig();
        if (cfg.getLlmModel() != null && !cfg.getLlmModel().isBlank()) {
            return cfg.getLlmModel().trim();
        }
        return bailianProperties.getModel() != null ? bailianProperties.getModel() : "qwen-plus";
    }
}
