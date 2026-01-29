package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.dto.PersonDetailDTO;
import com.stararchive.personmonitor.dto.TagDTO;
import com.stararchive.personmonitor.service.PersonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 人员档案控制器
 */
@Slf4j
@RestController
@RequestMapping("/persons")
@RequiredArgsConstructor
public class PersonController {
    
    private final PersonService personService;
    
    /**
     * 分页查询人员列表
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<PersonCardDTO> result = personService.getPersonList(page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * 根据标签查询人员
     */
    @GetMapping("/by-tag")
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonListByTag(
            @RequestParam String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageResponse<PersonCardDTO> result = personService.getPersonListByTag(tag, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * 获取人员详情
     */
    @GetMapping("/{personId}")
    public ResponseEntity<ApiResponse<PersonDetailDTO>> getPersonDetail(@PathVariable String personId) {
        PersonDetailDTO detail = personService.getPersonDetail(personId);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }
    
    /**
     * 获取标签树（明确 UTF-8 避免中文乱码）
     */
    @GetMapping(value = "/tags", produces = MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8")
    public ResponseEntity<ApiResponse<List<TagDTO>>> getTagTree() {
        List<TagDTO> tags = personService.getTagTree();
        return ResponseEntity.ok(ApiResponse.success(tags));
    }
}
