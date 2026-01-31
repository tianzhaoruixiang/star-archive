package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 系统用户 DTO（列表/详情，不含密码）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SysUserDTO {

    private Long userId;
    private String username;
    private String role;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;

    public static SysUserDTO fromEntity(com.stararchive.personmonitor.entity.SysUser u) {
        if (u == null) return null;
        SysUserDTO dto = new SysUserDTO();
        dto.setUserId(u.getUserId());
        dto.setUsername(u.getUsername());
        dto.setRole(u.getRole());
        dto.setCreatedTime(u.getCreatedTime());
        dto.setUpdatedTime(u.getUpdatedTime());
        return dto;
    }
}
