package com.stararchive.personmonitor.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * SeaweedFS Filer 配置，用于档案融合文件上传与异步拉取
 */
@Data
@Component
@ConfigurationProperties(prefix = "seaweedfs")
public class SeaweedFSProperties {

    /** Filer 服务地址，如 http://localhost:8888 */
    private String filerUrl = "http://localhost:8888";

    /** 档案融合上传路径前缀，如 archive-fusion */
    private String pathPrefix = "archive-fusion";
}
