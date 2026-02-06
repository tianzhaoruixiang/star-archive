package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.service.UserFavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

/**
 * 用户收藏人物（我的收藏）
 */
@RestController
@RequestMapping("/user-favorites")
@RequiredArgsConstructor
public class UserFavoriteController {

    private final UserFavoriteService userFavoriteService;

    @PostMapping("/{personId}")
    public ResponseEntity<ApiResponse<Void>> add(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String personId) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        userFavoriteService.add(username, personId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{personId}")
    public ResponseEntity<ApiResponse<Void>> remove(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String personId) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请先登录"));
        }
        userFavoriteService.remove(username, personId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/check/{personId}")
    public ResponseEntity<ApiResponse<Boolean>> check(
            @RequestHeader(value = "X-Username", required = false) String username,
            @PathVariable String personId) {
        boolean favorited = userFavoriteService.isFavorited(username != null ? username : "", personId);
        return ResponseEntity.ok(ApiResponse.success(favorited));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> list(
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "16") int size) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.ok(ApiResponse.success(PageResponse.of(Collections.emptyList(), page, size, 0)));
        }
        PageResponse<PersonCardDTO> result = userFavoriteService.listFavorites(username, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
