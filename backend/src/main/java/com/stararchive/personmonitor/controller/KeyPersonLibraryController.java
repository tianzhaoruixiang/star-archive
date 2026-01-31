package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.DirectoryDTO;
import com.stararchive.personmonitor.dto.KeyPersonCategoriesResponse;
import com.stararchive.personmonitor.dto.KeyPersonCategoryDTO;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.service.KeyPersonLibraryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 重点人员库控制器
 */
@Slf4j
@RestController
@RequestMapping("/key-person-library")
@RequiredArgsConstructor
public class KeyPersonLibraryController {

    private final KeyPersonLibraryService keyPersonLibraryService;

    /**
     * 获取重点人员库目录列表（左侧列表）
     */
    @GetMapping("/directories")
    public ResponseEntity<ApiResponse<List<DirectoryDTO>>> listDirectories() {
        List<DirectoryDTO> list = keyPersonLibraryService.listDirectories();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    /**
     * 获取重点人员类别数据：allCount + 各目录列表（不含「全部」项，由前端单独展示）
     */
    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<KeyPersonCategoriesResponse>> listCategories() {
        KeyPersonCategoriesResponse response = keyPersonLibraryService.listCategories();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 按类别分页查询人员：categoryId 为 all 时返回全部，否则为目录 ID；按可见性过滤（X-Username）
     */
    @GetMapping("/persons")
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonsByCategory(
            @RequestParam String categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestHeader(value = "X-Username", required = false) String currentUser
    ) {
        PageResponse<PersonCardDTO> result = keyPersonLibraryService.getPersonsByCategory(categoryId, page, size, currentUser);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 按目录分页查询人员（每页 16 条）；按可见性过滤
     */
    @GetMapping("/directories/{directoryId}/persons")
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonsByDirectory(
            @PathVariable Integer directoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "16") int size,
            @RequestHeader(value = "X-Username", required = false) String currentUser
    ) {
        PageResponse<PersonCardDTO> result = keyPersonLibraryService.getPersonsByDirectory(directoryId, page, size, currentUser);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 将人员从指定目录中移除
     */
    @DeleteMapping("/directories/{directoryId}/persons/{personId}")
    public ResponseEntity<ApiResponse<Void>> removePersonFromDirectory(
            @PathVariable Integer directoryId,
            @PathVariable String personId
    ) {
        keyPersonLibraryService.removePersonFromDirectory(directoryId, personId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
