package com.stararchive.personmonitor.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OnlyOffice 预览用一次性 token：文档服务拉取文件时不带 X-Username，通过 previewToken 放行。
 * Token 有效期内可多次使用（便于 OnlyOffice 重试），过期自动失效。
 */
@Slf4j
@Service
public class OnlyOfficePreviewTokenService {

    private static final long VALIDITY_MS = 5 * 60 * 1000L; // 5 分钟

    private final Map<String, TokenEntry> store = new ConcurrentHashMap<>();

    /**
     * 签发预览 token，用于 documentUrl 的 query 参数。仅在有权限获取 preview-config 后调用。
     *
     * @param taskId 任务 ID
     * @return token 字符串，需拼接到 /file?previewToken=xxx
     */
    public String createToken(String taskId) {
        if (taskId == null || taskId.isBlank()) {
            throw new IllegalArgumentException("taskId 不能为空");
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        long expiry = System.currentTimeMillis() + VALIDITY_MS;
        store.put(token, new TokenEntry(taskId.trim(), expiry));
        log.debug("OnlyOffice 预览 token 已签发 taskId={}, 有效期至 {} ms", taskId, expiry);
        return token;
    }

    /**
     * 校验 token 是否对该 taskId 有效。有效则返回 true（不消费 token，允许多次拉取）。
     * 无效或过期会移除并返回 false。
     */
    public boolean validateToken(String token, String taskId) {
        if (token == null || token.isBlank() || taskId == null || taskId.isBlank()) {
            return false;
        }
        TokenEntry entry = store.get(token.trim());
        if (entry == null) {
            return false;
        }
        if (System.currentTimeMillis() > entry.expiryMillis) {
            store.remove(token.trim());
            return false;
        }
        if (!entry.taskId.equals(taskId.trim())) {
            return false;
        }
        return true;
    }

    private static final class TokenEntry {
        final String taskId;
        final long expiryMillis;

        TokenEntry(String taskId, long expiryMillis) {
            this.taskId = taskId;
            this.expiryMillis = expiryMillis;
        }
    }
}
