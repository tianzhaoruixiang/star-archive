package com.stararchive.personmonitor.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 阿里云百炼（Qwen）API 配置，API Key 通过配置文件或环境变量注入，禁止硬编码
 */
@Data
@Component
@ConfigurationProperties(prefix = "bailian")
public class BailianProperties {

    /** API Key，建议使用环境变量 BAILIAN_API_KEY */
    private String apiKey = "";

    /** 兼容 OpenAI 的 base URL */
    private String baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";

    /** 模型名称，如 qwen-plus、qwen-turbo */
    private String model = "qwen-plus";
}
