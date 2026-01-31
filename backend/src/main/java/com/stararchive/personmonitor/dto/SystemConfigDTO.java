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
    /** 导航-模型管理 是否显示 */
    private Boolean navModelManagement;
    /** 导航-态势感知 是否显示 */
    private Boolean navSituation;
    /** 导航-系统配置 是否显示 */
    private Boolean navSystemConfig;
    /** 人物详情页 是否展示编辑功能 */
    private Boolean showPersonDetailEdit;
}
