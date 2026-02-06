package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.PersonCardDTO;
import com.stararchive.personmonitor.entity.Person;
import com.stararchive.personmonitor.entity.UserFavoritePerson;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.UserFavoritePersonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 用户收藏人物服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserFavoriteService {

    private final UserFavoritePersonRepository userFavoritePersonRepository;
    private final PersonRepository personRepository;
    private final PersonService personService;

    /**
     * 添加收藏（已收藏则忽略）。
     * noRollbackFor 避免在 Doris 等对 JDBC 回滚支持有限的环境下出现 "Unable to rollback against JDBC Connection"。
     */
    @Transactional(noRollbackFor = Exception.class)
    public void add(String username, String personId) {
        if (username == null || username.isBlank() || personId == null || personId.isBlank()) {
            return;
        }
        String u = username.trim();
        String p = personId.trim();
        if (userFavoritePersonRepository.findByIdUsernameAndIdPersonId(u, p).isPresent()) {
            return;
        }
        try {
            UserFavoritePerson fav = new UserFavoritePerson();
            fav.setId(new UserFavoritePerson.UserFavoritePersonId(u, p));
            fav.setCreatedTime(null);
            userFavoritePersonRepository.save(fav);
            log.debug("用户 {} 收藏人物 {}", u, p);
        } catch (DataIntegrityViolationException e) {
            // 并发下可能重复插入，视为已收藏
            log.debug("用户 {} 收藏人物 {} 已存在，忽略: {}", u, p, e.getMessage());
        }
    }

    /**
     * 取消收藏。
     * noRollbackFor 避免 Doris 下回滚报错。
     */
    @Transactional(noRollbackFor = Exception.class)
    public void remove(String username, String personId) {
        if (username == null || username.isBlank() || personId == null || personId.isBlank()) {
            return;
        }
        userFavoritePersonRepository.deleteByIdUsernameAndIdPersonId(username.trim(), personId.trim());
        log.debug("用户 {} 取消收藏人物 {}", username.trim(), personId.trim());
    }

    /**
     * 是否已收藏
     */
    public boolean isFavorited(String username, String personId) {
        if (username == null || username.isBlank() || personId == null || personId.isBlank()) {
            return false;
        }
        return userFavoritePersonRepository.findByIdUsernameAndIdPersonId(username.trim(), personId.trim()).isPresent();
    }

    /**
     * 分页查询当前用户收藏的人物卡片（仅返回当前用户有权限查看的档案）
     */
    public PageResponse<PersonCardDTO> listFavorites(String username, int page, int size) {
        if (username == null || username.isBlank()) {
            return PageResponse.of(new ArrayList<>(), page, size, 0);
        }
        String u = username.trim();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdTime"));
        Page<UserFavoritePerson> favPage = userFavoritePersonRepository.findByIdUsernameOrderByCreatedTimeDesc(u, pageable);
        List<UserFavoritePerson> favList = favPage.getContent();
        if (favList.isEmpty()) {
            return PageResponse.of(new ArrayList<>(), page, size, favPage.getTotalElements());
        }
        List<String> personIds = favList.stream()
                .map(f -> f.getId().getPersonId())
                .collect(Collectors.toList());
        List<Person> persons = personRepository.findAllById(personIds);
        Map<String, UserFavoritePerson> favMap = favList.stream()
                .collect(Collectors.toMap(f -> f.getId().getPersonId(), f -> f, (a, b) -> a, LinkedHashMap::new));
        List<PersonCardDTO> cards = persons.stream()
                .filter(person -> isVisible(person, u))
                .sorted((a, b) -> {
                    UserFavoritePerson fa = favMap.get(a.getPersonId());
                    UserFavoritePerson fb = favMap.get(b.getPersonId());
                    if (fa == null || fb == null) return 0;
                    return (fb.getCreatedTime() == null ? java.time.LocalDateTime.MIN : fb.getCreatedTime())
                            .compareTo(fa.getCreatedTime() == null ? java.time.LocalDateTime.MIN : fa.getCreatedTime());
                })
                .map(personService::toCardDTO)
                .collect(Collectors.toList());
        return PageResponse.of(cards, page, size, favPage.getTotalElements());
    }

    private static boolean isVisible(Person person, String currentUser) {
        if (person.getDeleted() != null && person.getDeleted()) {
            return false;
        }
        if (Boolean.TRUE.equals(person.getIsPublic())) {
            return true;
        }
        return currentUser != null && currentUser.equals(person.getCreatedBy());
    }
}
