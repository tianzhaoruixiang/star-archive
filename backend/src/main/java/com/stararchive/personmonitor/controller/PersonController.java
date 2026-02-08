package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.dto.PersonDetailDTO;
import com.stararchive.personmonitor.dto.PersonEditHistoryDTO;
import com.stararchive.personmonitor.dto.PersonUpdateDTO;
import com.stararchive.personmonitor.dto.TagCreateDTO;
import com.stararchive.personmonitor.dto.TagDTO;
import com.stararchive.personmonitor.service.PersonPortraitService;
import com.stararchive.personmonitor.service.PersonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.persistence.EntityNotFoundException;
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
    private final PersonPortraitService personPortraitService;
    
    /**
     * 分页查询人员列表，支持按重点人员/机构/签证类型/所属群体筛选；支持标签 + 姓名/证件号检索（可同时使用）；按可见性过滤（公开档案或 X-Username 为创建人）
     */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean isKeyPerson,
            @RequestParam(required = false) String organization,
            @RequestParam(required = false) String visaType,
            @RequestParam(required = false) String belongingGroup,
            @RequestParam(required = false) String departureProvince,
            @RequestParam(required = false) String destinationProvince,
            @RequestParam(required = false) String destinationCity,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean matchAny,
            @RequestHeader(value = "X-Username", required = false) String currentUser
    ) {
        List<String> tagList = tags != null ? tags : List.of();
        if (tagList.size() == 1 && tagList.get(0) != null && tagList.get(0).contains(",")) {
            tagList = java.util.Arrays.stream(tagList.get(0).split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
        PageResponse<PersonCardDTO> result = personService.getPersonListFiltered(
                page, size, isKeyPerson, organization, visaType, belongingGroup, departureProvince, destinationProvince, destinationCity, tagList, keyword, Boolean.TRUE.equals(matchAny), currentUser);
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
        PageResponse<PersonCardDTO> result = personService.getPersonListByTags(List.of(tag), page, size, false, null, currentUser);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /**
     * 根据多个标签查询人员。
     * matchAny=false（默认）：AND 逻辑，须同时拥有所有标签。
     * matchAny=true：OR 逻辑，命中任一标签即可（用于重点人员页按重点标签筛选）。
     * tags 支持逗号分隔：tags=tag1,tag2 或重复参数：tags=tag1&tags=tag2
     */
    @GetMapping("/by-tags")
    public ResponseEntity<ApiResponse<PageResponse<PersonCardDTO>>> getPersonListByTags(
            @RequestParam(required = false) List<String> tags,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean matchAny,
            @RequestHeader(value = "X-Username", required = false) String currentUser
    ) {
        List<String> tagList = tags != null ? tags : List.of();
        if (tagList.size() == 1 && tagList.get(0).contains(",")) {
            tagList = java.util.Arrays.stream(tagList.get(0).split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
        PageResponse<PersonCardDTO> result = personService.getPersonListByTags(tagList, page, size, Boolean.TRUE.equals(matchAny), null, currentUser);
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
     * 更新人员档案（部分字段可选），自动记录编辑历史；仅当档案公开或 X-Editor 为创建人时可更新；已删除档案不可更新
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
     * 软删除人员档案。公开档案仅系统管理员可删，个人档案仅创建人可删。
     */
    @DeleteMapping("/{personId}")
    public ResponseEntity<ApiResponse<Void>> deletePerson(
            @PathVariable String personId,
            @RequestHeader(value = "X-Username", required = false) String currentUser) {
        personService.deletePerson(personId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("删除成功", null));
    }

    /**
     * 上传人物头像（追加到 avatarFiles）。仅当档案对当前用户可见且未删除时可上传。
     */
    @PostMapping(value = "/{personId}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PersonDetailDTO>> uploadAvatar(
            @PathVariable String personId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader(value = "X-Editor", required = false) String editor) {
        try {
            PersonDetailDTO detail = personService.uploadAvatar(personId, file, editor);
            return ResponseEntity.ok(ApiResponse.success(detail));
        } catch (java.io.IOException e) {
            log.warn("人物头像上传失败: personId={}", personId, e);
            return ResponseEntity.badRequest().body(ApiResponse.error("上传失败: " + e.getMessage()));
        }
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
     * 获取智能画像（根据档案基本信息实时调用大模型生成，与档案融合使用同一大模型配置）。仅当档案对当前用户可见时可调用。
     */
    @GetMapping("/{personId}/portrait-analysis")
    public ResponseEntity<ApiResponse<String>> getPortraitAnalysis(
            @PathVariable String personId,
            @RequestHeader(value = "X-Username", required = false) String currentUser) {
        String analysis = personPortraitService.generatePortraitAnalysis(personId, currentUser);
        return ResponseEntity.ok(ApiResponse.success(analysis));
    }

    /**
     * 流式获取智能画像（SSE）。首 chunk 到达后即可逐字展示，避免长时间 loading。
     */
    @GetMapping(value = "/{personId}/portrait-analysis/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter getPortraitAnalysisStream(
            @PathVariable String personId,
            @RequestHeader(value = "X-Username", required = false) String currentUser) {
        return personPortraitService.generatePortraitAnalysisStream(personId, currentUser);
    }
    
    /**
     * 获取标签树（明确 UTF-8 避免中文乱码）。
     * keyTag=true 时仅返回重点标签（用于重点人员页左侧）。
     */
    @GetMapping(value = "/tags", produces = MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8")
    public ResponseEntity<ApiResponse<List<TagDTO>>> getTagTree(
            @RequestParam(required = false) Boolean keyTag) {
        List<TagDTO> tags = personService.getTagTree(Boolean.TRUE.equals(keyTag));
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
     * 更新人物标签
     */
    @PutMapping("/tags/{tagId}")
    public ResponseEntity<ApiResponse<TagDTO>> updateTag(@PathVariable Long tagId, @RequestBody @Valid TagCreateDTO dto) {
        try {
            TagDTO updated = personService.updateTag(tagId, dto);
            return ResponseEntity.ok(ApiResponse.success("更新成功", updated));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
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
