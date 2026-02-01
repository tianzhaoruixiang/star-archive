package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.dto.PersonDetailDTO;
import com.stararchive.personmonitor.dto.PersonEditHistoryDTO;
import com.stararchive.personmonitor.dto.PersonUpdateDTO;
import com.stararchive.personmonitor.dto.TagCreateDTO;
import com.stararchive.personmonitor.dto.TagDTO;
import com.stararchive.personmonitor.service.PersonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
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
     * 分页查询人员列表，支持按重点人员/机构/签证类型/所属群体筛选；按可见性过滤（公开档案或 X-Username 为创建人）
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean isKeyPerson,
            @RequestParam(required = false) String organization,
            @RequestParam(required = false) String visaType,
            @RequestParam(required = false) String belongingGroup,
            @RequestParam(required = false) String destinationProvince,
            @RequestParam(required = false) String destinationCity,
            @RequestHeader(value = "X-Username", required = false) String currentUser
    ) {
        PageResponse<PersonCardDTO> result = personService.getPersonListFiltered(
                page, size, isKeyPerson, organization, visaType, belongingGroup, destinationProvince, destinationCity, currentUser);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * 根据标签查询人员（单个标签，兼容旧接口）
     */
    @GetMapping("/by-tag")
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonListByTag(
            @RequestParam String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-Username", required = false) String currentUser
    ) {
        PageResponse<PersonCardDTO> result = personService.getPersonListByTags(List.of(tag), page, size, currentUser);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 根据多个标签查询人员（AND 逻辑：须同时拥有所有标签）
     * tags 支持逗号分隔：tags=tag1,tag2 或重复参数：tags=tag1&tags=tag2
     */
    @GetMapping("/by-tags")
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonListByTags(
            @RequestParam(required = false) List<String> tags,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-Username", required = false) String currentUser
    ) {
        List<String> tagList = tags != null ? tags : List.of();
        if (tagList.size() == 1 && tagList.get(0).contains(",")) {
            tagList = java.util.Arrays.stream(tagList.get(0).split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
        PageResponse<PersonCardDTO> result = personService.getPersonListByTags(tagList, page, size, currentUser);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
    
    /**
     * 获取人员详情（仅当档案公开或 X-Username 为创建人时可查看）
     */
    @GetMapping("/{personId}")
    public ResponseEntity<ApiResponse<PersonDetailDTO>> getPersonDetail(
            @PathVariable String personId,
            @RequestHeader(value = "X-Username", required = false) String currentUser) {
        PersonDetailDTO detail = personService.getPersonDetail(personId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    /**
     * 更新人员档案（部分字段可选），自动记录编辑历史；仅当档案公开或 X-Editor 为创建人时可更新
     *
     * @param editor 可选，编辑人（请求头 X-Editor），用于可见性校验与记录；若档案无创建人则设为创建人
     */
    @PutMapping("/{personId}")
    public ResponseEntity<ApiResponse<PersonDetailDTO>> updatePerson(
            @PathVariable String personId,
            @RequestBody PersonUpdateDTO dto,
            @RequestHeader(value = "X-Editor", required = false) String editor) {
        PersonDetailDTO detail = personService.updatePerson(personId, dto, editor);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    /**
     * 获取人员档案编辑历史（仅当档案对当前用户可见时返回）
     */
    @GetMapping("/{personId}/edit-history")
    public ResponseEntity<ApiResponse<List<PersonEditHistoryDTO>>> getEditHistory(
            @PathVariable String personId,
            @RequestHeader(value = "X-Username", required = false) String currentUser) {
        List<PersonEditHistoryDTO> list = personService.getEditHistory(personId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
    
    /**
     * 获取标签树（明确 UTF-8 避免中文乱码）
     */
    @GetMapping(value = "/tags", produces = MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8")
    public ResponseEntity<ApiResponse<List<TagDTO>>> getTagTree() {
        List<TagDTO> tags = personService.getTagTree();
        return ResponseEntity.ok(ApiResponse.success(tags));
    }

    /**
     * 新增人物标签（复用 tag 表，用于人员档案筛选与 person_tags）
     */
    @PostMapping("/tags")
    public ResponseEntity<ApiResponse<TagDTO>> createTag(@RequestBody @Valid TagCreateDTO dto) {
        TagDTO created = personService.createTag(dto);
        return ResponseEntity.ok(ApiResponse.success("新增成功", created));
    }

    /**
     * 删除人物标签（仅删除 tag 表记录，筛选树中不再展示）
     */
    @DeleteMapping("/tags/{tagId}")
    public ResponseEntity<ApiResponse<Void>> deleteTag(@PathVariable Long tagId) {
        if (!personService.deleteTag(tagId)) {
            return ResponseEntity.ok(ApiResponse.error("标签不存在或已删除"));
        }
        return ResponseEntity.ok(ApiResponse.success("删除成功", null));
    }
}
