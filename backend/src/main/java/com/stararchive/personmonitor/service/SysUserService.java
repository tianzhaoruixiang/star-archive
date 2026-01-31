package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.dto.SysUserCreateDTO;
import com.stararchive.personmonitor.dto.SysUserDTO;
import com.stararchive.personmonitor.entity.SysUser;
import com.stararchive.personmonitor.repository.SysUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 系统用户服务：用户管理、密码加密、默认管理员初始化
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SysUserService {

    private final SysUserRepository sysUserRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEFAULT_ADMIN_PASSWORD = "admin123";

    /** 首次启动时若无用户则创建默认管理员；若 admin 已存在但密码不是 admin123 则重置（修复 SQL 预置错误哈希）。失败时仅打日志，不阻塞应用启动。 */
    @PostConstruct
    public void initDefaultAdmin() {
        try {
            if (sysUserRepository.count() == 0) {
                SysUser admin = new SysUser();
                admin.setUserId(1L);
                admin.setUsername("admin");
                admin.setPasswordHash(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD));
                admin.setRole("admin");
                admin.setCreatedTime(LocalDateTime.now());
                admin.setUpdatedTime(LocalDateTime.now());
                sysUserRepository.save(admin);
                log.info("已创建默认管理员账号: admin / admin123");
                return;
            }
            sysUserRepository.findByUsername("admin").ifPresent(admin -> {
                if (!passwordEncoder.matches(DEFAULT_ADMIN_PASSWORD, admin.getPasswordHash())) {
                    admin.setPasswordHash(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD));
                    admin.setUpdatedTime(LocalDateTime.now());
                    sysUserRepository.save(admin);
                    log.info("已重置管理员 admin 的密码为 admin123（修复预置哈希）");
                }
            });
        } catch (Exception e) {
            log.warn("初始化/修复默认管理员失败（请确认 sys_user 表已创建且数据库可访问）: {}", e.getMessage());
        }
    }

    public List<SysUserDTO> listUsers() {
        return sysUserRepository.findAll().stream()
                .map(SysUserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public SysUserDTO createUser(SysUserCreateDTO dto) {
        if (sysUserRepository.existsByUsername(dto.getUsername())) {
            throw new IllegalArgumentException("用户名已存在");
        }
        Long nextId = (sysUserRepository.findMaxUserId() == null ? 0L : sysUserRepository.findMaxUserId()) + 1;
        SysUser user = new SysUser();
        user.setUserId(nextId);
        user.setUsername(dto.getUsername().trim());
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setRole(dto.getRole() != null ? dto.getRole().trim() : "user");
        user.setCreatedTime(LocalDateTime.now());
        user.setUpdatedTime(LocalDateTime.now());
        sysUserRepository.save(user);
        log.info("新增用户: {}", user.getUsername());
        return SysUserDTO.fromEntity(user);
    }

    @Transactional
    public void deleteUser(Long userId) {
        SysUser user = sysUserRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在"));
        long adminCount = sysUserRepository.findAll().stream()
                .filter(u -> "admin".equals(u.getRole()))
                .count();
        if ("admin".equals(user.getRole()) && adminCount <= 1) {
            throw new IllegalArgumentException("至少保留一名管理员，无法删除");
        }
        sysUserRepository.delete(user);
        log.info("删除用户: {}", user.getUsername());
    }

    public SysUser findByUsername(String username) {
        return sysUserRepository.findByUsername(username).orElse(null);
    }

    public boolean checkPassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }
}
