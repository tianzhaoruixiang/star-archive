package com.stararchive.personmonitor.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

/**
 * Web配置类 - 跨域、UTF-8 响应编码
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final ObjectMapper objectMapper;

    public WebConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(
                        "http://localhost",
                        "http://localhost:*",
                        "http://127.0.0.1",
                        "http://127.0.0.1:*"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    /**
     * 统一 JSON 响应使用 UTF-8，并沿用 Spring Boot 配置的 ObjectMapper（日期序列化为字符串，避免数组格式）
     */
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setObjectMapper(objectMapper);
        converter.setDefaultCharset(StandardCharsets.UTF_8);
        converter.setSupportedMediaTypes(Collections.singletonList(
                new MediaType(MediaType.APPLICATION_JSON, StandardCharsets.UTF_8)));
        converters.add(0, converter);
    }
}
