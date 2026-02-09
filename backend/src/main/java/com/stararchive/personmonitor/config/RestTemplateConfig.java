package com.stararchive.personmonitor.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * 提供 RestTemplate Bean，供 EventService、PersonPortraitService 等调用大模型时使用。
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
