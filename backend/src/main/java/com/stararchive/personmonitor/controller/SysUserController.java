package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.dto.SysUserCreateDTO;
import com.stararchive.personmonitor.dto.SysUserDTO;
import com.stararchive.personmonitor.service.SysUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 系统用户管理接口（建议仅管理员可访问，可与系统配置同权限）
 */
@Slf4j
@RestController
@RequestMapping("/sys/users")
@RequiredArgsConstructor
public class SysUserController {

    private final SysUserService sysUserService;

    /**
     * 用户列表（不含密码）
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SysUserDTO>>> listUsers() {
        List<SysUserDTO> list = sysUserService.listUsers();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    /**
     * 新增用户
     */
    @PostMapping
    public ResponseEntity<ApiResponse<SysUserDTO>> createUser(@RequestBody @Valid SysUserCreateDTO dto) {
        SysUserDTO created = sysUserService.createUser(dto);
        return ResponseEntity.ok(ApiResponse.success("新增成功", created));
    }

    /**
     * 删除用户（至少保留一名管理员）
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long userId) {
        sysUserService.deleteUser(userId);
        return ResponseEntity.ok(ApiResponse.success("删除成功", null));
    }
}
