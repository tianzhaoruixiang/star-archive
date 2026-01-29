package com.stararchive.personmonitor.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * 认证服务 - 简化版(内存用户)
 */
@Slf4j
@Service
public class AuthService {
    
    private static final Map<String, String> USERS = new HashMap<>();
    
    static {
        USERS.put("admin", "admin123");
    }
    
    /**
     * 用户登录
     */
    public boolean login(String username, String password) {
        String storedPassword = USERS.get(username);
        if (storedPassword != null && storedPassword.equals(password)) {
            log.info("用户 {} 登录成功", username);
            return true;
        }
        log.warn("用户 {} 登录失败", username);
        return false;
    }
    
    /**
     * 获取当前用户信息
     */
    public Map<String, Object> getCurrentUser(String username) {
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("username", username);
        userInfo.put("role", "admin");
        return userInfo;
    }
}
