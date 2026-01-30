package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * OnlyOffice 文档预览配置，供前端初始化 DocEditor 使用。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnlyOfficePreviewConfigDTO {

    /** OnlyOffice Document Server 地址，用于加载 api.js */
    private String documentServerUrl;

    /** 文档拉取 URL（OnlyOffice 服务端通过此 URL 获取文档，需为 OnlyOffice 可访问的绝对地址） */
    private String documentUrl;

    /** 文档唯一 key（同文档同 key 可复用缓存） */
    private String documentKey;

    /** 文件类型小写，如 docx、xlsx、pdf */
    private String fileType;

    /** 文档标题（文件名） */
    private String title;

    /** documentType: word / cell，用于 OnlyOffice 编辑器类型 */
    private String documentType;

    /** 是否启用 OnlyOffice（未配置或不可达时为 false，前端仅保留下载） */
    private boolean enabled;
}
