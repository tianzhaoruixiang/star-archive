package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.DirectoryDTO;
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
     * 按目录分页查询人员（每页 16 条）
     */
    @GetMapping("/directories/{directoryId}/persons")
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonsByDirectory(
            @PathVariable Integer directoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "16") int size
    ) {
        PageResponse<PersonCardDTO> result = keyPersonLibraryService.getPersonsByDirectory(directoryId, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
