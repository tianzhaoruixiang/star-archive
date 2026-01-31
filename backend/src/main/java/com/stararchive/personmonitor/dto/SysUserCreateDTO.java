package com.stararchive.personmonitor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 新增用户请求 DTO
 */
@Data
public class SysUserCreateDTO {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 64)
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 32, message = "密码长度 6-32 位")
    private String password;

    @NotBlank(message = "角色不能为空")
    @Size(max = 20)
    private String role;
}
