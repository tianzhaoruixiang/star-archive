package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.SysUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

/**
 * 系统用户数据访问
 */
public interface SysUserRepository extends JpaRepository<SysUser, Long> {

    Optional<SysUser> findByUsername(String username);

    boolean existsByUsername(String username);

    /** 查询最大 user_id，用于新增时生成 ID（Doris 无自增） */
    @Query(value = "SELECT COALESCE(MAX(user_id), 0) FROM sys_user", nativeQuery = true)
    Long findMaxUserId();
}
