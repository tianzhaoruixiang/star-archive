package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 系统配置 DTO（前端展示与提交）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfigDTO {

    /** 系统名称 */
    private String systemName;
    /** 系统 Logo 地址（URL 或相对路径） */
    private String systemLogoUrl;
    /** 前端统一 base URL 路径（如 / 或 /app/） */
    private String frontendBaseUrl;
    /** 导航-首页 是否显示 */
    private Boolean navDashboard;
    /** 导航-人员档案 是否显示 */
    private Boolean navPersons;
    /** 导航-重点人员库 是否显示 */
    private Boolean navKeyPersonLibrary;
    /** 导航-工作区 是否显示 */
    private Boolean navWorkspace;
    /** 二级导航-档案融合 是否显示 */
    private Boolean navWorkspaceFusion;
    /** 二级导航-标签管理 是否显示 */
    private Boolean navWorkspaceTags;
    /** 二级导航-模型管理 是否显示 */
    private Boolean navModelManagement;
    /** 导航-态势感知 是否显示 */
    private Boolean navSituation;
    /** 导航-系统配置 是否显示 */
    private Boolean navSystemConfig;
    /** 人物详情页 是否展示编辑功能 */
    private Boolean showPersonDetailEdit;

    /** 人物档案融合 · 大模型调用基础 URL（兼容 OpenAI 的接口地址） */
    private String llmBaseUrl;
    /** 人物档案融合 · 大模型名称（如 qwen-plus、gpt-4） */
    private String llmModel;
    /** 人物档案融合 · 大模型 API Key */
    private String llmApiKey;
    /** 人物档案融合 · 大模型提取人物档案的系统提示词（为空则使用内置默认） */
    private String llmExtractPrompt;
    /** 人物档案融合 · 内置默认提示词（只读，供前端展示） */
    private String llmExtractPromptDefault;

    /** OnlyOffice · 前端加载脚本的地址（document-server-url） */
    private String onlyofficeDocumentServerUrl;
    /** OnlyOffice · 服务端拉取文档的基地址（document-download-base） */
    private String onlyofficeDocumentDownloadBase;
}
