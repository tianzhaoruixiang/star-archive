package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.entity.SysUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * 认证服务 - 基于 sys_user 表与 BCrypt 密码校验
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final SysUserService sysUserService;

    /**
     * 用户登录：校验用户名与密码（BCrypt）
     */
    public boolean login(String username, String password) {
        if (password == null || password.isEmpty()) {
            log.warn("用户 {} 登录失败：密码为空", username);
            return false;
        }
        SysUser user = sysUserService.findByUsername(username);
        if (user == null) {
            log.warn("用户 {} 登录失败：用户不存在", username);
            return false;
        }
        String hash = user.getPasswordHash();
        if (hash == null || hash.isEmpty()) {
            log.warn("用户 {} 登录失败：密码未设置", username);
            return false;
        }
        if (!sysUserService.checkPassword(password, hash)) {
            log.warn("用户 {} 登录失败：密码错误", username);
            return false;
        }
        log.info("用户 {} 登录成功", username);
        return true;
    }

    /**
     * 获取当前用户信息（不含密码）
     */
    public Map<String, Object> getCurrentUser(String username) {
        SysUser user = sysUserService.findByUsername(username);
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("username", username);
        userInfo.put("role", user != null ? user.getRole() : "user");
        userInfo.put("userId", user != null ? user.getUserId() : null);
        return userInfo;
    }
}
