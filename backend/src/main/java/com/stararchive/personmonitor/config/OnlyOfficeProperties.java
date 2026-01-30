package com.stararchive.personmonitor.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * OnlyOffice Document Server 配置，用于档案融合文件预览。
 * document-server-url：前端加载 OnlyOffice 脚本的地址；
 * document-download-base：OnlyOffice 服务端拉取文档时的后端基地址（需能被 OnlyOffice 容器访问，如 Docker 内用 host.docker.internal）。
 */
@Data
@Component
@ConfigurationProperties(prefix = "onlyoffice")
public class OnlyOfficeProperties {

    /** OnlyOffice Document Server 地址，如 http://localhost:8081，前端用其加载 api.js */
    private String documentServerUrl = "http://localhost:8081";

    /**
     * 文档下载基地址：OnlyOffice 服务端通过该基地址 + 路径拉取文档。
     * 必须为 OnlyOffice 可访问的绝对 URL，如 http://host.docker.internal:8000/api 或 http://backend:8000/api。
     */
    private String documentDownloadBase = "http://localhost:8000/api";

    /** 是否启用 OnlyOffice 预览（未配置或基地址不可达时可设为 false 仅保留下载） */
    private boolean enabled = true;
}
