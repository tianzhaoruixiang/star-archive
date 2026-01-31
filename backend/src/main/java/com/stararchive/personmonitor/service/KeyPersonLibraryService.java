package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.DirectoryDTO;
import com.stararchive.personmonitor.dto.KeyPersonCategoriesResponse;
import com.stararchive.personmonitor.dto.KeyPersonCategoryDTO;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.entity.Directory;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.entity.PersonDirectory;
import com.stararchive.personmonitor.repository.DirectoryRepository;
import com.stararchive.personmonitor.repository.PersonDirectoryRepository;
import com.stararchive.personmonitor.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 重点人员库服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KeyPersonLibraryService {

    private final DirectoryRepository directoryRepository;
    private final PersonDirectoryRepository personDirectoryRepository;
    private final PersonRepository personRepository;
    private final PersonService personService;

    /**
     * 获取所有重点人员库目录（左侧列表，含人员数量）
     */
    public List<DirectoryDTO> listDirectories() {
        log.info("查询重点人员库目录列表");
        List<Directory> dirs = directoryRepository.findByParentDirectoryIdIsNullOrderByDirectoryId();
        return dirs.stream()
                .map(d -> {
                    long count = personDirectoryRepository.countById_DirectoryId(d.getDirectoryId());
                    return new DirectoryDTO(d.getDirectoryId(), d.getDirectoryName(), count);
                })
                .collect(Collectors.toList());
    }

    /**
     * 获取重点人员类别数据：全部人数 + 各目录列表（不含「全部」项，由前端单独展示，避免重复）。
     * 若 person_directory 无数据，则 allCount 使用 person 表中 is_key_person=true 的人数。
     */
    public KeyPersonCategoriesResponse listCategories() {
        log.info("查询重点人员类别列表");
        long allCount = personDirectoryRepository.countDistinctPersonIds();
        if (allCount == 0) {
            allCount = personRepository.countByIsKeyPerson(true);
        }
        List<KeyPersonCategoryDTO> categories = new ArrayList<>();
        List<Directory> dirs = directoryRepository.findByParentDirectoryIdIsNullOrderByDirectoryId();
        for (Directory d : dirs) {
            long count = personDirectoryRepository.countById_DirectoryId(d.getDirectoryId());
            categories.add(new KeyPersonCategoryDTO(String.valueOf(d.getDirectoryId()), d.getDirectoryName(), count));
        }
        return new KeyPersonCategoriesResponse(allCount, categories);
    }

    /**
     * 按目录分页查询人员卡片（按可见性过滤：公开或当前用户为创建人）
     */
    public PageResponse<PersonCardDTO> getPersonsByDirectory(Integer directoryId, int page, int size, String currentUser) {
        log.info("按目录查询人员: directoryId={}, page={}, size={}", directoryId, page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<PersonDirectory> pdPage = personDirectoryRepository.findById_DirectoryId(directoryId, pageable);
        List<String> personIds = pdPage.getContent().stream()
                .map(pd -> pd.getId().getPersonId())
                .collect(Collectors.toList());
        List<PersonCardDTO> cards = toCardList(personIds, currentUser);
        return PageResponse.of(cards, page, size, pdPage.getTotalElements());
    }

    /**
     * 按类别分页查询人员：categoryId 为 "all" 时返回全部重点人员，否则按目录 ID 查询；按可见性过滤。
     *
     * @param currentUser 当前登录用户名，为空时仅返回公开档案
     */
    public PageResponse<PersonCardDTO> getPersonsByCategory(String categoryId, int page, int size, String currentUser) {
        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;
        if ("all".equalsIgnoreCase(categoryId)) {
            Pageable pageable = PageRequest.of(page, size);
            Page<String> idPage = personDirectoryRepository.findDistinctPersonIds(pageable);
            long total = idPage.getTotalElements();
            List<PersonCardDTO> cards;
            if (total == 0) {
                Page<Person> personPage = personRepository.findByIsKeyPersonAndVisible(true, pageable, user);
                cards = personPage.getContent().stream()
                        .map(personService::toCardDTO)
                        .collect(Collectors.toList());
                total = personPage.getTotalElements();
            } else {
                cards = toCardList(idPage.getContent(), user);
            }
            return PageResponse.of(cards, page, size, total);
        }
        try {
            int directoryId = Integer.parseInt(categoryId);
            return getPersonsByDirectory(directoryId, page, size, currentUser);
        } catch (NumberFormatException e) {
            log.warn("无效的类别 ID: {}", categoryId);
            return PageResponse.of(List.of(), page, size, 0L);
        }
    }

    private List<PersonCardDTO> toCardList(List<String> personIds, String currentUser) {
        if (personIds.isEmpty()) {
            return List.of();
        }
        List<Person> persons = personRepository.findAllById(personIds);
        String user = (currentUser != null && !currentUser.isBlank()) ? currentUser.trim() : null;
        return persons.stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsPublic()) || (user != null && user.equals(p.getCreatedBy())))
                .map(personService::toCardDTO)
                .collect(Collectors.toList());
    }

    /**
     * 将人员从指定目录中移除
     */
    @Transactional
    public void removePersonFromDirectory(Integer directoryId, String personId) {
        PersonDirectory.PersonDirectoryId id = new PersonDirectory.PersonDirectoryId(directoryId, personId);
        personDirectoryRepository.deleteById(id);
        log.info("已从目录 {} 移除人员 {}", directoryId, personId);
    }
}
