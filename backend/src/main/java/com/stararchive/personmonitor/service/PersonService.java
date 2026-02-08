package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.*;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.entity.PersonEditHistory;
import com.stararchive.personmonitor.entity.Tag;
import com.stararchive.personmonitor.entity.PersonSocialDynamic;
import com.stararchive.personmonitor.entity.PersonTravel;
import com.stararchive.personmonitor.entity.SysUser;
import com.stararchive.personmonitor.repository.PersonEditHistoryRepository;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.PersonSocialDynamicRepository;
import com.stararchive.personmonitor.repository.PersonTravelRepository;
import com.stararchive.personmonitor.repository.SysUserRepository;
import com.stararchive.personmonitor.repository.TagRepository;
import com.stararchive.personmonitor.service.SeaweedFSService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * 人员档案服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PersonService {
    
    private final PersonRepository personRepository;
    private final EntityManager entityManager;
    private final PersonTravelRepository travelRepository;
    private final PersonSocialDynamicRepository socialDynamicRepository;
    private final PersonEditHistoryRepository editHistoryRepository;
    private final TagRepository tagRepository;
    private final SysUserRepository sysUserRepository;
    private final SeaweedFSService seaweedFSService;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    
    /**
     * 分页查询人员列表（无可见性过滤，供内部/统计使用）
     */
    public PageResponse<PersonCardDTO> getPersonList(int page, int size) {
        return getPersonListFiltered(page, size, null, null, null, null, null, null, null, null, null, false, null);
    }

    /**
     * 分页查询人员列表（支持按重点人员/机构/签证类型/所属群体/目的地省份筛选；支持标签 + 姓名/证件号检索；按可见性过滤：公开档案或当前用户为创建人）
     *
     * @param currentUser 当前登录用户名，为空时仅返回公开档案
     */
    public PageResponse<PersonCardDTO> getPersonListFiltered(
            int page, int size,
            Boolean isKeyPerson, String organization, String visaType, String belongingGroup,
            String departureProvince, String destinationProvince, String destinationCity,
            List<String> tags, String keyword, boolean matchAny,
            String currentUser) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedTime"));
        // 原生 SQL 已在 @Query 中含 ORDER BY，若再传 Sort 会导致重复 ORDER BY（Doris 报错）
        Pageable pageableNativeNoSort = PageRequest.of(page, size);
        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;

        if (tags != null && !tags.isEmpty()) {
            return getPersonListByTags(tags, page, size, matchAny, keyword, user);
        }
        boolean noOtherFilters = isKeyPerson == null && (organization == null || organization.isBlank())
                && (visaType == null || visaType.isBlank()) && (belongingGroup == null || belongingGroup.isBlank())
                && departureProvince == null && (destinationProvince == null || destinationProvince.isBlank())
                && (destinationCity == null || destinationCity.isBlank());
        if ((keyword != null && !keyword.isBlank()) && noOtherFilters) {
            log.info("按姓名/证件号检索人员列表: keyword={}, page={}, size={}", keyword, page, size);
            Page<Person> personPage = personRepository.findVisibleByKeyword(keyword.trim(), pageable, user);
            List<PersonCardDTO> cards = personPage.getContent().stream().map(this::convertToCardDTO).collect(Collectors.toList());
            return PageResponse.of(cards, page, size, personPage.getTotalElements());
        }

        if (destinationProvince != null && !destinationProvince.isBlank()) {
            String province = destinationProvince.trim();
            Page<Object[]> idPage;
            boolean visibilityInQuery;
            if (departureProvince != null && !departureProvince.isBlank()
                    && (destinationCity == null || destinationCity.isBlank())
                    && (visaType == null || visaType.isBlank())
                    && (organization == null || organization.isBlank())
                    && (belongingGroup == null || belongingGroup.isBlank())) {
                log.info("按流动线查询（出发省→目的省）: from='{}', to='{}', user='{}', page={}, size={}", departureProvince, province, user, page, size);
                idPage = travelRepository.findPersonIdsByDepartureAndDestinationProvinceVisible(departureProvince.trim(), province, user, pageableNativeNoSort);
                log.info("流动线查询结果: totalElements={}, numberOfElements={}", idPage.getTotalElements(), idPage.getNumberOfElements());
                visibilityInQuery = true;
            } else if (destinationCity != null && !destinationCity.isBlank()) {
                log.info("按目的地省份+城市查询（可见性）: province={}, city={}, page={}, size={}", province, destinationCity, page, size);
                idPage = travelRepository.findPersonIdsByDestinationProvinceAndCityVisible(province, destinationCity.trim(), user, pageableNativeNoSort);
                visibilityInQuery = true;
            } else if (visaType != null && !visaType.isBlank()) {
                log.info("按目的地省份+签证类型查询（可见性）: province={}, visaType={}, page={}, size={}", province, visaType, page, size);
                idPage = travelRepository.findPersonIdsByDestinationProvinceAndVisaTypeVisible(province, visaType.trim(), user, pageableNativeNoSort);
                visibilityInQuery = true;
            } else if (organization != null && !organization.isBlank()) {
                log.info("按目的地省份+机构查询（可见性）: province={}, organization={}, page={}, size={}", province, organization, page, size);
                idPage = travelRepository.findPersonIdsByDestinationProvinceAndOrganizationVisible(province, organization.trim(), user, pageableNativeNoSort);
                visibilityInQuery = true;
            } else if (belongingGroup != null && !belongingGroup.isBlank()) {
                log.info("按目的地省份+所属群体查询（可见性）: province={}, belongingGroup={}, page={}, size={}", province, belongingGroup, page, size);
                idPage = travelRepository.findPersonIdsByDestinationProvinceAndBelongingGroupVisible(province, belongingGroup.trim(), user, pageableNativeNoSort);
                visibilityInQuery = true;
            } else {
                log.info("按目的地省份查询人员列表（可见性分页）: destinationProvince={}, page={}, size={}", province, page, size);
                Pageable pageableNoSort = PageRequest.of(page, size);
                idPage = travelRepository.findPersonIdsByDestinationProvinceVisible(province, user, pageableNoSort);
                visibilityInQuery = true;
            }
            List<String> personIds = idPage.getContent().stream()
                    .map(row -> row[0] != null ? row[0].toString() : null)
                    .filter(id -> id != null)
                    .toList();
            if (personIds.isEmpty()) {
                return PageResponse.of(Collections.emptyList(), page, size, idPage.getTotalElements());
            }
            List<Person> persons = personRepository.findAllById(personIds);
            List<Person> visible = visibilityInQuery
                    ? persons
                    : persons.stream()
                            .filter(p -> Boolean.TRUE.equals(p.getIsPublic()) || (user != null && user.equals(p.getCreatedBy())))
                            .toList();
            visible = visible.stream()
                    .filter(p -> !Boolean.TRUE.equals(p.getDeleted()))
                    .toList();
            List<PersonCardDTO> cards = visible.stream().map(this::convertToCardDTO).collect(Collectors.toList());
            return PageResponse.of(cards, page, size, idPage.getTotalElements());
        }

        Page<Person> personPage;
        if (Boolean.TRUE.equals(isKeyPerson)) {
            log.info("查询重点人员列表: page={}, size={}", page, size);
            personPage = personRepository.findByIsKeyPersonAndVisible(true, pageable, user);
        } else if (organization != null && !organization.isBlank()) {
            log.info("按机构查询人员列表: organization={}, page={}, size={}", organization, page, size);
            personPage = personRepository.findByOrganizationAndVisible(organization.trim(), pageable, user);
        } else if (visaType != null && !visaType.isBlank()) {
            log.info("按签证类型查询人员列表: visaType={}, page={}, size={}", visaType, page, size);
            personPage = personRepository.findByVisaTypeAndVisible(visaType.trim(), pageable, user);
        } else if (belongingGroup != null && !belongingGroup.isBlank()) {
            log.info("按所属群体查询人员列表: belongingGroup={}, page={}, size={}", belongingGroup, page, size);
            personPage = personRepository.findByBelongingGroupAndVisible(belongingGroup.trim(), pageable, user);
        } else {
            log.info("查询人员列表: page={}, size={}", page, size);
            personPage = personRepository.findAllVisible(pageable, user);
        }

        List<PersonCardDTO> cards = personPage.getContent().stream()
                .map(this::convertToCardDTO)
                .collect(Collectors.toList());
        return PageResponse.of(cards, page, size, personPage.getTotalElements());
    }
    
    /**
     * 根据单个标签查询人员（按可见性过滤）
     */
    public PageResponse<PersonCardDTO> getPersonListByTag(String tag, int page, int size, String currentUser) {
        return getPersonListByTags(List.of(tag), page, size, false, null, currentUser);
    }

    /**
     * 根据多个标签查询人员。
     * matchAny=true：OR 逻辑，命中任一标签即可（用于重点人员页）。
     * matchAny=false：同一二级分类下 OR，不同二级分类间 AND，按可见性过滤。
     *
     * @param currentUser 当前登录用户名，为空时仅返回公开档案
     */
    public PageResponse<PersonCardDTO> getPersonListByTags(List<String> tags, int page, int size, boolean matchAny, String keyword, String currentUser) {
        log.info("根据标签查询人员: tags={}, page={}, size={}, matchAny={}, keyword={}", tags, page, size, matchAny, keyword);
        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;

        if (tags == null || tags.isEmpty()) {
            return getPersonListFiltered(page, size, null, null, null, null, null, null, null, null, keyword, false, user);
        }

        TagFilterSpec spec = matchAny ? buildTagFilterSpecOr(tags) : buildTagFilterSpec(tags);
        String visibilityCondition = " (is_public = 1 OR (created_by = :currentUser AND :currentUser IS NOT NULL)) ";
        String notDeletedCondition = " AND (deleted = 0 OR deleted IS NULL) ";
        String keywordCondition = (keyword != null && !keyword.isBlank())
                ? " AND (chinese_name LIKE :keywordPattern OR original_name LIKE :keywordPattern OR id_number LIKE :keywordPattern OR id_card_number LIKE :keywordPattern) "
                : "";
        String whereClause = "(" + spec.tagCondition + ") AND " + visibilityCondition + notDeletedCondition + keywordCondition;
        String orderBy = " ORDER BY updated_time DESC";
        long total = countByTagSpec(spec, user, keyword);
        int offset = page * size;

        Query dataQuery = entityManager.createNativeQuery(
                "SELECT * FROM person WHERE " + whereClause + orderBy,
                Person.class
        );
        for (int i = 0; i < spec.orderedTagNames.size(); i++) {
            dataQuery.setParameter("tag" + i, spec.orderedTagNames.get(i));
        }
        dataQuery.setParameter("currentUser", user);
        if (keyword != null && !keyword.isBlank()) {
            dataQuery.setParameter("keywordPattern", "%" + keyword.trim() + "%");
        }
        dataQuery.setFirstResult(offset);
        dataQuery.setMaxResults(size);

        @SuppressWarnings("unchecked")
        List<Person> persons = dataQuery.getResultList();
        List<PersonCardDTO> cards = persons.stream()
                .map(this::convertToCardDTO)
                .collect(Collectors.toList());
        return PageResponse.of(cards, page, size, total);
    }

    /**
     * OR 逻辑：命中任一标签即可（用于重点人员页按重点标签筛选）。
     */
    private TagFilterSpec buildTagFilterSpecOr(List<String> tagNames) {
        if (tagNames == null || tagNames.isEmpty()) {
            return new TagFilterSpec("1=0", List.of());
        }
        List<String> orParts = new ArrayList<>();
        List<String> orderedTagNames = new ArrayList<>();
        for (int i = 0; i < tagNames.size(); i++) {
            orParts.add("JSON_CONTAINS(person_tags, JSON_ARRAY(:tag" + i + ")) = 1");
            orderedTagNames.add(tagNames.get(i));
        }
        String tagCondition = "(" + String.join(" OR ", orParts) + ")";
        return new TagFilterSpec(tagCondition, orderedTagNames);
    }

    /**
     * 按二级分类分组：同一二级分类下标签 OR，不同二级分类间 AND。
     * 未在 tag 表中的标签名视为单独一组（与其它条件 AND）。
     */
    private TagFilterSpec buildTagFilterSpec(List<String> tagNames) {
        List<Tag> allTags = tagRepository.findAllOrderByHierarchy();
        Map<String, String> tagNameToSecond = new LinkedHashMap<>();
        for (Tag t : allTags) {
            tagNameToSecond.put(t.getTagName(), t.getSecondLevelName() != null ? t.getSecondLevelName() : "");
        }
        Map<String, List<String>> groupBySecond = new LinkedHashMap<>();
        for (String name : tagNames) {
            String second = tagNameToSecond.getOrDefault(name, name);
            groupBySecond.computeIfAbsent(second, k -> new ArrayList<>()).add(name);
        }
        List<String> orFragments = new ArrayList<>();
        List<String> orderedTagNames = new ArrayList<>();
        int paramIndex = 0;
        for (List<String> group : groupBySecond.values()) {
            List<String> orParts = new ArrayList<>();
            for (String tagName : group) {
                orParts.add("JSON_CONTAINS(person_tags, JSON_ARRAY(:tag" + paramIndex + ")) = 1");
                paramIndex++;
            }
            orFragments.add("(" + String.join(" OR ", orParts) + ")");
            orderedTagNames.addAll(group);
        }
        String tagCondition = String.join(" AND ", orFragments);
        return new TagFilterSpec(tagCondition, orderedTagNames);
    }

    private long countByTagSpec(TagFilterSpec spec, String currentUser, String keyword) {
        String visibilityCondition = " (is_public = 1 OR (created_by = :currentUser AND :currentUser IS NOT NULL)) ";
        String notDeletedCondition = " AND (deleted = 0 OR deleted IS NULL) ";
        String keywordCondition = (keyword != null && !keyword.isBlank())
                ? " AND (chinese_name LIKE :keywordPattern OR original_name LIKE :keywordPattern OR id_number LIKE :keywordPattern OR id_card_number LIKE :keywordPattern) "
                : "";
        Query countQuery = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM person WHERE (" + spec.tagCondition + ") AND " + visibilityCondition + notDeletedCondition + keywordCondition
        );
        for (int i = 0; i < spec.orderedTagNames.size(); i++) {
            countQuery.setParameter("tag" + i, spec.orderedTagNames.get(i));
        }
        countQuery.setParameter("currentUser", currentUser);
        if (keyword != null && !keyword.isBlank()) {
            countQuery.setParameter("keywordPattern", "%" + keyword.trim() + "%");
        }
        return ((Number) countQuery.getSingleResult()).longValue();
    }

    private static class TagFilterSpec {
        final String tagCondition;
        final List<String> orderedTagNames;

        TagFilterSpec(String tagCondition, List<String> orderedTagNames) {
            this.tagCondition = tagCondition;
            this.orderedTagNames = orderedTagNames;
        }
    }
    
    /**
     * 获取人员详情（仅当档案公开或当前用户为创建人时可查看；已删除档案仅管理员可查看公开档案、创建人可查看个人档案）
     *
     * @param currentUser 当前登录用户名，为空时仅可查看公开且未删除的档案
     */
    public PersonDetailDTO getPersonDetail(String personId, String currentUser) {
        log.info("查询人员详情: personId={}", personId);
        
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("人员不存在: " + personId));

        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;
        boolean visible = Boolean.TRUE.equals(person.getIsPublic())
                || (user != null && user.equals(person.getCreatedBy()));
        if (!visible) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        if (Boolean.TRUE.equals(person.getDeleted())) {
            boolean canViewDeleted = false;
            if (user != null) {
                if (Boolean.TRUE.equals(person.getIsPublic())) {
                    java.util.Optional<SysUser> sysUser = sysUserRepository.findByUsername(user);
                    canViewDeleted = sysUser.map(u -> "admin".equals(u.getRole())).orElse(false);
                } else {
                    canViewDeleted = user.equals(person.getCreatedBy());
                }
            }
            if (!canViewDeleted) {
                throw new EntityNotFoundException("人员不存在: " + personId);
            }
        }
        
        PersonDetailDTO detail = convertToDetailDTO(person);
        
        Pageable travelPageable = PageRequest.of(0, 10);
        Page<PersonTravel> travels = travelRepository.findByPersonIdOrderByEventTimeDesc(personId, travelPageable);
        detail.setRecentTravels(travels.getContent().stream()
                .map(this::convertToTravelDTO)
                .collect(Collectors.toList()));
        
        List<PersonSocialDynamic> socials = socialDynamicRepository.findByPersonId(personId)
                .stream()
                .limit(10)
                .toList();
        detail.setRecentSocialDynamics(socials.stream()
                .map(this::convertToSocialDTO)
                .collect(Collectors.toList()));
        
        return detail;
    }

    /**
     * 更新人员档案（仅更新 DTO 中非 null 字段），并记录编辑历史。仅当档案公开或当前用户为创建人时可更新。
     *
     * @param editor 编辑人，可为 null（默认"系统"）；若档案无创建人则设为创建人
     */
    @Transactional
    public PersonDetailDTO updatePerson(String personId, PersonUpdateDTO dto, String editor) {
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("人员不存在: " + personId));
        if (Boolean.TRUE.equals(person.getDeleted())) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        String user = (editor != null && !editor.isBlank()) ? editor.trim() : null;
        boolean visible = Boolean.TRUE.equals(person.getIsPublic())
                || (user != null && user.equals(person.getCreatedBy()));
        if (!visible) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        Person before = clonePersonForHistory(person);
        if (dto.getChineseName() != null) person.setChineseName(dto.getChineseName());
        if (dto.getOriginalName() != null) person.setOriginalName(dto.getOriginalName());
        if (dto.getAliasNames() != null) person.setAliasNames(dto.getAliasNames());
        if (dto.getOrganization() != null) person.setOrganization(dto.getOrganization());
        if (dto.getBelongingGroup() != null) person.setBelongingGroup(dto.getBelongingGroup());
        if (dto.getGender() != null) person.setGender(dto.getGender());
        if (dto.getMaritalStatus() != null) person.setMaritalStatus(dto.getMaritalStatus());
        if (dto.getIdNumber() != null) person.setIdNumber(dto.getIdNumber());
        if (dto.getBirthDate() != null) person.setBirthDate(dto.getBirthDate().atStartOfDay());
        if (dto.getNationality() != null) person.setNationality(dto.getNationality());
        if (dto.getNationalityCode() != null) person.setNationalityCode(dto.getNationalityCode());
        if (dto.getHouseholdAddress() != null) person.setHouseholdAddress(dto.getHouseholdAddress());
        if (dto.getHighestEducation() != null) person.setHighestEducation(dto.getHighestEducation());
        if (dto.getPhoneNumbers() != null) person.setPhoneNumbers(dto.getPhoneNumbers());
        if (dto.getEmails() != null) person.setEmails(dto.getEmails());
        if (dto.getPassportNumbers() != null) person.setPassportNumbers(dto.getPassportNumbers());
        if (dto.getPassportNumber() != null) person.setPassportNumber(dto.getPassportNumber());
        if (dto.getPassportType() != null) person.setPassportType(dto.getPassportType());
        if (dto.getIdCardNumber() != null) person.setIdCardNumber(dto.getIdCardNumber());
        if (dto.getVisaType() != null) person.setVisaType(dto.getVisaType());
        if (dto.getVisaNumber() != null) person.setVisaNumber(dto.getVisaNumber());
        if (dto.getPersonTags() != null) person.setPersonTags(dto.getPersonTags());
        if (dto.getWorkExperience() != null) person.setWorkExperience(dto.getWorkExperience());
        if (dto.getEducationExperience() != null) person.setEducationExperience(dto.getEducationExperience());
        if (dto.getRelatedPersons() != null) person.setRelatedPersons(dto.getRelatedPersons());
        if (dto.getRemark() != null) person.setRemark(dto.getRemark());
        if (dto.getIsKeyPerson() != null) person.setIsKeyPerson(dto.getIsKeyPerson());
        if (dto.getIsPublic() != null) person.setIsPublic(dto.getIsPublic());
        if (person.getCreatedBy() == null && user != null) person.setCreatedBy(user);
        person.setUpdatedTime(LocalDateTime.now());
        personRepository.save(person);
        saveEditHistory(personId, before, person, editor != null ? editor : "系统");
        return getPersonDetail(personId, user);
    }

    private Person clonePersonForHistory(Person p) {
        Person clone = new Person();
        clone.setPersonId(p.getPersonId());
        clone.setChineseName(p.getChineseName());
        clone.setOriginalName(p.getOriginalName());
        clone.setAliasNames(p.getAliasNames() != null ? new ArrayList<>(p.getAliasNames()) : null);
        clone.setOrganization(p.getOrganization());
        clone.setBelongingGroup(p.getBelongingGroup());
        clone.setGender(p.getGender());
        clone.setMaritalStatus(p.getMaritalStatus());
        clone.setIdNumber(p.getIdNumber());
        clone.setBirthDate(p.getBirthDate());
        clone.setNationality(p.getNationality());
        clone.setNationalityCode(p.getNationalityCode());
        clone.setHouseholdAddress(p.getHouseholdAddress());
        clone.setHighestEducation(p.getHighestEducation());
        clone.setPhoneNumbers(p.getPhoneNumbers() != null ? new ArrayList<>(p.getPhoneNumbers()) : null);
        clone.setEmails(p.getEmails() != null ? new ArrayList<>(p.getEmails()) : null);
        clone.setPassportNumbers(p.getPassportNumbers() != null ? new ArrayList<>(p.getPassportNumbers()) : null);
        clone.setPassportNumber(p.getPassportNumber());
        clone.setPassportType(p.getPassportType());
        clone.setIdCardNumber(p.getIdCardNumber());
        clone.setVisaType(p.getVisaType());
        clone.setVisaNumber(p.getVisaNumber());
        clone.setPersonTags(p.getPersonTags() != null ? new ArrayList<>(p.getPersonTags()) : null);
        clone.setWorkExperience(p.getWorkExperience());
        clone.setEducationExperience(p.getEducationExperience());
        clone.setRelatedPersons(p.getRelatedPersons());
        clone.setRemark(p.getRemark());
        clone.setIsKeyPerson(p.getIsKeyPerson());
        clone.setIsPublic(p.getIsPublic());
        clone.setCreatedBy(p.getCreatedBy());
        return clone;
    }

    private void saveEditHistory(String personId, Person before, Person after, String editor) {
        List<PersonEditHistoryDTO.ChangeItem> changes = buildChangeList(before, after);
        if (changes.isEmpty()) return;
        try {
            String historyId = personId + "_" + System.currentTimeMillis();
            PersonEditHistory history = new PersonEditHistory();
            history.setHistoryId(historyId);
            history.setPersonId(personId);
            history.setEditTime(LocalDateTime.now());
            history.setEditor(editor);
            history.setChangeSummary(OBJECT_MAPPER.writeValueAsString(changes));
            editHistoryRepository.save(history);
        } catch (JsonProcessingException e) {
            log.warn("保存编辑历史失败: personId={}", personId, e);
        }
    }

    private static final java.util.Map<String, String> FIELD_LABELS = java.util.Map.ofEntries(
            java.util.Map.entry("chineseName", "中文姓名"),
            java.util.Map.entry("originalName", "外文姓名"),
            java.util.Map.entry("aliasNames", "别名"),
            java.util.Map.entry("organization", "所属机构"),
            java.util.Map.entry("belongingGroup", "所属群体"),
            java.util.Map.entry("gender", "性别"),
            java.util.Map.entry("maritalStatus", "婚姻现状"),
            java.util.Map.entry("idNumber", "证件号码"),
            java.util.Map.entry("birthDate", "出生日期"),
            java.util.Map.entry("nationality", "国籍"),
            java.util.Map.entry("nationalityCode", "国籍代码"),
            java.util.Map.entry("householdAddress", "户籍地址"),
            java.util.Map.entry("highestEducation", "最高学历"),
            java.util.Map.entry("phoneNumbers", "联系电话"),
            java.util.Map.entry("emails", "电子邮箱"),
            java.util.Map.entry("passportNumbers", "护照号"),
            java.util.Map.entry("passportNumber", "主护照号"),
            java.util.Map.entry("passportType", "护照类型"),
            java.util.Map.entry("idCardNumber", "身份证号"),
            java.util.Map.entry("visaType", "签证类型"),
            java.util.Map.entry("visaNumber", "签证号码"),
            java.util.Map.entry("personTags", "人物标签"),
            java.util.Map.entry("workExperience", "工作经历"),
            java.util.Map.entry("educationExperience", "教育背景"),
            java.util.Map.entry("relatedPersons", "关系人"),
            java.util.Map.entry("remark", "备注"),
            java.util.Map.entry("isKeyPerson", "重点人员"),
            java.util.Map.entry("isPublic", "是否公开档案")
    );

    private List<PersonEditHistoryDTO.ChangeItem> buildChangeList(Person before, Person after) {
        List<PersonEditHistoryDTO.ChangeItem> list = new ArrayList<>();
        addChange(list, "chineseName", str(before.getChineseName()), str(after.getChineseName()));
        addChange(list, "originalName", str(before.getOriginalName()), str(after.getOriginalName()));
        addChange(list, "aliasNames", json(before.getAliasNames()), json(after.getAliasNames()));
        addChange(list, "organization", str(before.getOrganization()), str(after.getOrganization()));
        addChange(list, "belongingGroup", str(before.getBelongingGroup()), str(after.getBelongingGroup()));
        addChange(list, "gender", str(before.getGender()), str(after.getGender()));
        addChange(list, "maritalStatus", str(before.getMaritalStatus()), str(after.getMaritalStatus()));
        addChange(list, "idNumber", str(before.getIdNumber()), str(after.getIdNumber()));
        addChange(list, "birthDate", formatDate(before.getBirthDate()), formatDate(after.getBirthDate()));
        addChange(list, "nationality", str(before.getNationality()), str(after.getNationality()));
        addChange(list, "nationalityCode", str(before.getNationalityCode()), str(after.getNationalityCode()));
        addChange(list, "householdAddress", str(before.getHouseholdAddress()), str(after.getHouseholdAddress()));
        addChange(list, "highestEducation", str(before.getHighestEducation()), str(after.getHighestEducation()));
        addChange(list, "phoneNumbers", json(before.getPhoneNumbers()), json(after.getPhoneNumbers()));
        addChange(list, "emails", json(before.getEmails()), json(after.getEmails()));
        addChange(list, "passportNumbers", json(before.getPassportNumbers()), json(after.getPassportNumbers()));
        addChange(list, "passportNumber", str(before.getPassportNumber()), str(after.getPassportNumber()));
        addChange(list, "passportType", str(before.getPassportType()), str(after.getPassportType()));
        addChange(list, "idCardNumber", str(before.getIdCardNumber()), str(after.getIdCardNumber()));
        addChange(list, "visaType", str(before.getVisaType()), str(after.getVisaType()));
        addChange(list, "visaNumber", str(before.getVisaNumber()), str(after.getVisaNumber()));
        addChange(list, "personTags", json(before.getPersonTags()), json(after.getPersonTags()));
        addChange(list, "workExperience", str(before.getWorkExperience()), str(after.getWorkExperience()));
        addChange(list, "educationExperience", str(before.getEducationExperience()), str(after.getEducationExperience()));
        addChange(list, "relatedPersons", str(before.getRelatedPersons()), str(after.getRelatedPersons()));
        addChange(list, "remark", str(before.getRemark()), str(after.getRemark()));
        addChange(list, "isKeyPerson", str(before.getIsKeyPerson()), str(after.getIsKeyPerson()));
        addChange(list, "isPublic", str(before.getIsPublic()), str(after.getIsPublic()));
        return list;
    }

    private void addChange(List<PersonEditHistoryDTO.ChangeItem> list, String field, String oldVal, String newVal) {
        if (oldVal == null && newVal == null) return;
        if (oldVal != null && oldVal.equals(newVal)) return;
        String label = FIELD_LABELS.getOrDefault(field, field);
        list.add(new PersonEditHistoryDTO.ChangeItem(field, label, oldVal != null ? oldVal : "—", newVal != null ? newVal : "—"));
    }

    private String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private String formatDate(LocalDateTime dt) {
        if (dt == null) return null;
        return dt.toLocalDate().toString();
    }

    private String json(Object o) {
        if (o == null) return null;
        try {
            return OBJECT_MAPPER.writeValueAsString(o);
        } catch (JsonProcessingException e) {
            return String.valueOf(o);
        }
    }

    /**
     * 获取人物档案编辑历史（最近 50 条）；仅当档案对当前用户可见时返回
     */
    public List<PersonEditHistoryDTO> getEditHistory(String personId, String currentUser) {
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("人员不存在: " + personId));
        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;
        boolean visible = Boolean.TRUE.equals(person.getIsPublic())
                || (user != null && user.equals(person.getCreatedBy()));
        if (!visible) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        if (Boolean.TRUE.equals(person.getDeleted())) {
            boolean canViewDeleted = false;
            if (user != null) {
                if (Boolean.TRUE.equals(person.getIsPublic())) {
                    java.util.Optional<SysUser> sysUser = sysUserRepository.findByUsername(user);
                    canViewDeleted = sysUser.map(u -> "admin".equals(u.getRole())).orElse(false);
                } else {
                    canViewDeleted = user.equals(person.getCreatedBy());
                }
            }
            if (!canViewDeleted) {
                throw new EntityNotFoundException("人员不存在: " + personId);
            }
        }
        return editHistoryRepository
                .findByPersonIdOrderByEditTimeDesc(personId, org.springframework.data.domain.PageRequest.of(0, 50))
                .stream()
                .map(this::toEditHistoryDTO)
                .collect(Collectors.toList());
    }

    private PersonEditHistoryDTO toEditHistoryDTO(PersonEditHistory h) {
        List<PersonEditHistoryDTO.ChangeItem> changes = Collections.emptyList();
        if (h.getChangeSummary() != null && !h.getChangeSummary().isBlank()) {
            try {
                changes = OBJECT_MAPPER.readValue(h.getChangeSummary(), new TypeReference<>() {});
            } catch (JsonProcessingException e) {
                log.warn("解析编辑历史 JSON 失败: historyId={}", h.getHistoryId());
            }
        }
        PersonEditHistoryDTO dto = new PersonEditHistoryDTO();
        dto.setHistoryId(h.getHistoryId());
        dto.setPersonId(h.getPersonId());
        dto.setEditTime(h.getEditTime());
        dto.setEditor(h.getEditor());
        dto.setChanges(changes);
        return dto;
    }
    
    /**
     * 获取标签树（含每个标签对应人员数量）。
     * keyTagOnly=true 时仅返回重点标签（用于重点人员页左侧）。
     * 先一次性加载标签，再并行统计各标签人员数，避免 N+1 串行查询导致响应过慢。
     */
    public List<TagDTO> getTagTree(boolean keyTagOnly) {
        log.info("查询标签树: keyTagOnly={}", keyTagOnly);
        List<Tag> tags = keyTagOnly
                ? tagRepository.findByKeyTagTrueOrderByHierarchy()
                : tagRepository.findAllOrderByHierarchy();
        Map<String, Long> countByTagName = tags.parallelStream()
                .collect(Collectors.toConcurrentMap(
                        Tag::getTagName,
                        tag -> {
                            try {
                                return personRepository.countByPersonTagsContaining(tag.getTagName());
                            } catch (Exception e) {
                                return 0L;
                            }
                        },
                        (a, b) -> a
                ));
        return tags.stream()
                .map(tag -> {
                    TagDTO dto = new TagDTO();
                    dto.setTagId(tag.getTagId());
                    dto.setFirstLevelName(tag.getFirstLevelName());
                    dto.setSecondLevelName(tag.getSecondLevelName());
                    dto.setTagName(tag.getTagName());
                    dto.setTagDescription(tag.getTagDescription());
                    dto.setParentTagId(tag.getParentTagId());
                    dto.setFirstLevelSortOrder(tag.getFirstLevelSortOrder());
                    dto.setSecondLevelSortOrder(tag.getSecondLevelSortOrder());
                    dto.setTagSortOrder(tag.getTagSortOrder());
                    dto.setKeyTag(tag.getKeyTag());
                    dto.setPersonCount(countByTagName.getOrDefault(tag.getTagName(), 0L));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * 新增人物标签（复用 tag 表，用于人员档案筛选与 person_tags）
     */
    @Transactional
    public TagDTO createTag(TagCreateDTO dto) {
        String tagName = dto.getTagName() != null ? dto.getTagName().trim() : "";
        if (tagName.isEmpty()) {
            throw new IllegalArgumentException("标签名称不能为空");
        }
        if (tagRepository.existsByTagName(tagName)) {
            throw new IllegalArgumentException("标签名称已存在：" + tagName);
        }
        long newId = tagRepository.findMaxTagId() + 1;
        LocalDateTime now = LocalDateTime.now();
        Tag tag = new Tag();
        tag.setTagId(newId);
        tag.setFirstLevelName(dto.getFirstLevelName() != null ? dto.getFirstLevelName().trim() : null);
        tag.setSecondLevelName(dto.getSecondLevelName() != null ? dto.getSecondLevelName().trim() : null);
        tag.setTagName(tagName);
        tag.setTagDescription(dto.getTagDescription() != null ? dto.getTagDescription().trim() : null);
        tag.setParentTagId(null);
        tag.setFirstLevelSortOrder(dto.getFirstLevelSortOrder() != null ? dto.getFirstLevelSortOrder() : 999);
        tag.setSecondLevelSortOrder(dto.getSecondLevelSortOrder() != null ? dto.getSecondLevelSortOrder() : 999);
        tag.setTagSortOrder(dto.getTagSortOrder() != null ? dto.getTagSortOrder() : 999);
        tag.setKeyTag(Boolean.TRUE.equals(dto.getKeyTag()));
        tag.setCreatedTime(now);
        tag.setUpdatedTime(now);
        tagRepository.save(tag);
        log.info("新增标签: tagId={}, tagName={}, keyTag={}", newId, tagName, tag.getKeyTag());
        TagDTO result = new TagDTO();
        result.setTagId(tag.getTagId());
        result.setFirstLevelName(tag.getFirstLevelName());
        result.setSecondLevelName(tag.getSecondLevelName());
        result.setTagName(tag.getTagName());
        result.setTagDescription(tag.getTagDescription());
        result.setParentTagId(tag.getParentTagId());
        result.setFirstLevelSortOrder(tag.getFirstLevelSortOrder());
        result.setSecondLevelSortOrder(tag.getSecondLevelSortOrder());
        result.setTagSortOrder(tag.getTagSortOrder());
        result.setKeyTag(tag.getKeyTag());
        result.setPersonCount(0L);
        return result;
    }

    /**
     * 更新人物标签
     */
    @Transactional
    public TagDTO updateTag(Long tagId, TagCreateDTO dto) {
        Tag tag = tagRepository.findById(tagId)
            .orElseThrow(() -> new EntityNotFoundException("标签不存在：tagId=" + tagId));
        
        String tagName = dto.getTagName() != null ? dto.getTagName().trim() : "";
        if (tagName.isEmpty()) {
            throw new IllegalArgumentException("标签名称不能为空");
        }
        
        // 如果修改了标签名，检查新名称是否已存在（排除自己）
        if (!tagName.equals(tag.getTagName()) && tagRepository.existsByTagName(tagName)) {
            throw new IllegalArgumentException("标签名称已存在：" + tagName);
        }
        
        tag.setFirstLevelName(dto.getFirstLevelName() != null ? dto.getFirstLevelName().trim() : null);
        tag.setSecondLevelName(dto.getSecondLevelName() != null ? dto.getSecondLevelName().trim() : null);
        tag.setTagName(tagName);
        tag.setTagDescription(dto.getTagDescription() != null ? dto.getTagDescription().trim() : null);
        tag.setFirstLevelSortOrder(dto.getFirstLevelSortOrder() != null ? dto.getFirstLevelSortOrder() : 999);
        tag.setSecondLevelSortOrder(dto.getSecondLevelSortOrder() != null ? dto.getSecondLevelSortOrder() : 999);
        tag.setTagSortOrder(dto.getTagSortOrder() != null ? dto.getTagSortOrder() : 999);
        tag.setKeyTag(Boolean.TRUE.equals(dto.getKeyTag()));
        tag.setUpdatedTime(LocalDateTime.now());
        
        tagRepository.save(tag);
        log.info("更新标签: tagId={}, tagName={}, keyTag={}", tagId, tagName, tag.getKeyTag());
        
        TagDTO result = new TagDTO();
        result.setTagId(tag.getTagId());
        result.setFirstLevelName(tag.getFirstLevelName());
        result.setSecondLevelName(tag.getSecondLevelName());
        result.setTagName(tag.getTagName());
        result.setTagDescription(tag.getTagDescription());
        result.setParentTagId(tag.getParentTagId());
        result.setFirstLevelSortOrder(tag.getFirstLevelSortOrder());
        result.setSecondLevelSortOrder(tag.getSecondLevelSortOrder());
        result.setTagSortOrder(tag.getTagSortOrder());
        result.setKeyTag(tag.getKeyTag());
        try {
            result.setPersonCount(personRepository.countByPersonTagsContaining(tagName));
        } catch (Exception e) {
            result.setPersonCount(0L);
        }
        return result;
    }

    /**
     * 删除人物标签（仅删除 tag 表记录，人员档案上的 person_tags 中同名仍保留，筛选树中不再展示）
     */
    @Transactional
    public boolean deleteTag(Long tagId) {
        if (tagId == null || !tagRepository.existsById(tagId)) {
            return false;
        }
        tagRepository.deleteById(tagId);
        log.info("删除标签: tagId={}", tagId);
        return true;
    }
    
    /**
     * 转为人员卡片 DTO（供其他服务复用）
     */
    public PersonCardDTO toCardDTO(Person person) {
        return convertToCardDTO(person);
    }

    private PersonCardDTO convertToCardDTO(Person person) {
        PersonCardDTO dto = new PersonCardDTO();
        dto.setPersonId(person.getPersonId());
        dto.setChineseName(person.getChineseName());
        dto.setOriginalName(person.getOriginalName());
        dto.setAvatarUrl(person.getAvatarFiles() != null && !person.getAvatarFiles().isEmpty()
                ? seaweedFSService.getAvatarProxyPath(person.getAvatarFiles().get(0)) : null);
        dto.setOrganization(person.getOrganization());
        dto.setBelongingGroup(person.getBelongingGroup());
        dto.setGender(person.getGender());
        dto.setNationality(person.getNationality());
        dto.setIdNumber(person.getIdNumber());
        dto.setPassportNumber(person.getPassportNumber());
        dto.setPassportType(person.getPassportType());
        dto.setIdCardNumber(person.getIdCardNumber());
        dto.setMaritalStatus(person.getMaritalStatus());
        dto.setVisaType(person.getVisaType());
        dto.setBirthDate(person.getBirthDate());
        dto.setPersonTags(person.getPersonTags());
        dto.setUpdatedTime(person.getUpdatedTime());
        dto.setIsKeyPerson(person.getIsKeyPerson());
        dto.setHouseholdAddress(person.getHouseholdAddress());
        dto.setPhoneSummary(person.getPhoneNumbers() != null && !person.getPhoneNumbers().isEmpty()
                ? person.getPhoneNumbers().get(0) : null);
        dto.setRemark(person.getRemark());
        dto.setBelongingGroup(person.getBelongingGroup());
        dto.setIsPublic(person.getIsPublic());
        return dto;
    }

    private PersonDetailDTO convertToDetailDTO(Person person) {
        PersonDetailDTO dto = new PersonDetailDTO();
        dto.setPersonId(person.getPersonId());
        dto.setChineseName(person.getChineseName());
        dto.setOriginalName(person.getOriginalName());
        dto.setAliasNames(person.getAliasNames());
        List<String> avatarPaths = person.getAvatarFiles();
        if (avatarPaths != null && !avatarPaths.isEmpty()) {
            dto.setAvatarUrl(seaweedFSService.getAvatarProxyPath(avatarPaths.get(0)));
            dto.setAvatarUrls(avatarPaths.stream()
                    .map(seaweedFSService::getAvatarProxyPath)
                    .collect(Collectors.toList()));
        } else {
            dto.setAvatarUrl(null);
            dto.setAvatarUrls(null);
        }
        dto.setGender(person.getGender());
        dto.setMaritalStatus(person.getMaritalStatus());
        dto.setIdNumber(person.getIdNumber());
        dto.setBirthDate(person.getBirthDate());
        dto.setNationality(person.getNationality());
        dto.setNationalityCode(person.getNationalityCode());
        dto.setHouseholdAddress(person.getHouseholdAddress());
        dto.setOrganization(person.getOrganization());
        dto.setBelongingGroup(person.getBelongingGroup());
        dto.setHighestEducation(person.getHighestEducation());
        dto.setPhoneNumbers(person.getPhoneNumbers());
        dto.setEmails(person.getEmails());
        dto.setPassportNumbers(person.getPassportNumbers());
        dto.setPassportNumber(person.getPassportNumber());
        dto.setPassportType(person.getPassportType());
        dto.setIdCardNumber(person.getIdCardNumber());
        dto.setVisaType(person.getVisaType());
        dto.setVisaNumber(person.getVisaNumber());
        dto.setTwitterAccounts(person.getTwitterAccounts());
        dto.setLinkedinAccounts(person.getLinkedinAccounts());
        dto.setFacebookAccounts(person.getFacebookAccounts());
        dto.setPersonTags(person.getPersonTags());
        dto.setWorkExperience(person.getWorkExperience());
        dto.setEducationExperience(person.getEducationExperience());
        dto.setRelatedPersons(person.getRelatedPersons());
        dto.setRemark(person.getRemark());
        dto.setIsKeyPerson(person.getIsKeyPerson());
        dto.setIsPublic(person.getIsPublic());
        dto.setCreatedBy(person.getCreatedBy());
        dto.setDeleted(person.getDeleted());
        dto.setDeletedTime(person.getDeletedTime());
        dto.setDeletedBy(person.getDeletedBy());
        dto.setCreatedTime(person.getCreatedTime());
        dto.setUpdatedTime(person.getUpdatedTime());
        return dto;
    }

    /**
     * 软删除人员档案。公开档案仅系统管理员可删，个人档案仅创建人可删。
     *
     * @param currentUser 当前登录用户名
     */
    @Transactional
    public void deletePerson(String personId, String currentUser) {
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("人员不存在: " + personId));
        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;
        if (user == null) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        boolean canDelete = false;
        if (Boolean.TRUE.equals(person.getIsPublic())) {
            java.util.Optional<SysUser> sysUser = sysUserRepository.findByUsername(user);
            canDelete = sysUser.map(u -> "admin".equals(u.getRole())).orElse(false);
        } else {
            canDelete = user.equals(person.getCreatedBy());
        }
        if (!canDelete) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        if (Boolean.TRUE.equals(person.getDeleted())) {
            return;
        }
        person.setDeleted(true);
        person.setDeletedTime(LocalDateTime.now());
        person.setDeletedBy(user);
        person.setUpdatedTime(LocalDateTime.now());
        personRepository.save(person);
        log.info("人员档案已软删除: personId={}, deletedBy={}", personId, user);
    }

    /**
     * 上传人物头像并追加到 avatarFiles。仅当档案对当前用户可见且未删除时可上传。
     *
     * @param editor 编辑人（请求头 X-Editor），用于可见性校验
     */
    @Transactional
    public PersonDetailDTO uploadAvatar(String personId, MultipartFile file, String editor) throws IOException {
        Person person = personRepository.findById(personId)
                .orElseThrow(() -> new EntityNotFoundException("人员不存在: " + personId));
        if (Boolean.TRUE.equals(person.getDeleted())) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        String user = (editor != null && !editor.isBlank()) ? editor.trim() : null;
        boolean visible = Boolean.TRUE.equals(person.getIsPublic())
                || (user != null && user.equals(person.getCreatedBy()));
        if (!visible) {
            throw new EntityNotFoundException("人员不存在: " + personId);
        }
        String path = seaweedFSService.uploadPersonAvatar(file, personId);
        List<String> avatarFiles = person.getAvatarFiles() != null ? new ArrayList<>(person.getAvatarFiles()) : new ArrayList<>();
        avatarFiles.add(path);
        person.setAvatarFiles(avatarFiles);
        person.setUpdatedTime(LocalDateTime.now());
        personRepository.save(person);
        log.info("人物头像已上传: personId={}, path={}", personId, path);
        return getPersonDetail(personId, user);
    }
    
    private PersonTravelDTO convertToTravelDTO(PersonTravel travel) {
        PersonTravelDTO dto = new PersonTravelDTO();
        dto.setTravelId(travel.getTravelId());
        dto.setPersonId(travel.getPersonId());
        dto.setEventTime(travel.getEventTime());
        dto.setPersonName(travel.getPersonName());
        dto.setDeparture(travel.getDeparture());
        dto.setDestination(travel.getDestination());
        dto.setTravelType(travel.getTravelType());
        dto.setTicketNumber(travel.getTicketNumber());
        dto.setVisaType(travel.getVisaType());
        dto.setDepartureCity(travel.getDepartureCity());
        dto.setDestinationCity(travel.getDestinationCity());
        return dto;
    }
    
    private SocialDynamicDTO convertToSocialDTO(PersonSocialDynamic social) {
        SocialDynamicDTO dto = new SocialDynamicDTO();
        dto.setDynamicId(social.getDynamicId());
        dto.setSocialAccountType(social.getSocialAccountType());
        dto.setSocialAccount(social.getSocialAccount());
        dto.setTitle(social.getTitle());
        dto.setContent(social.getContent());
        dto.setImageUrls(social.getImageFiles());
        dto.setPublishTime(social.getPublishTime());
        dto.setPublishLocation(social.getPublishLocation());
        dto.setLikeCount(social.getLikeCount());
        dto.setShareCount(social.getShareCount());
        dto.setCommentCount(social.getCommentCount());
        dto.setViewCount(social.getViewCount());
        return dto;
    }
}
