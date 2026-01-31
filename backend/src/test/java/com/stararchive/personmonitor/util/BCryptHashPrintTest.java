package com.stararchive.personmonitor.util;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 运行此测试可打印 admin123 的 BCrypt 哈希，用于 07-sys-user.sql 初始管理员插入
 * 运行: mvn test -Dtest=BCryptHashPrintTest#printAdmin123Hash
 */
class BCryptHashPrintTest {

    @Test
    void printAdmin123Hash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
        String hash = encoder.encode("admin123");
        System.out.println("BCrypt hash for 'admin123' (rounds=10):");
        System.out.println(hash);
        // 校验
        assert encoder.matches("admin123", hash);
    }
}
