package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 认证控制器
 */
@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    
    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest != null ? loginRequest.get("username") : null;
        String password = loginRequest != null ? loginRequest.get("password") : null;
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.ok(ApiResponse.error("请输入用户名和密码"));
        }
        boolean success = authService.login(username.trim(), password);
        if (success) {
            Map<String, Object> userInfo = authService.getCurrentUser(username.trim());
            return ResponseEntity.ok(ApiResponse.success("登录成功", userInfo));
        }
        return ResponseEntity.ok(ApiResponse.error("用户名或密码错误"));
    }
    
    /**
     * 用户登出
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.success("登出成功", null));
    }
    
    /**
     * 获取当前用户信息
     */
    @GetMapping("/current")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentUser(@RequestParam String username) {
        Map<String, Object> userInfo = authService.getCurrentUser(username);
        return ResponseEntity.ok(ApiResponse.success(userInfo));
    }
}
