package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.UserFavoritePerson;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 用户收藏人物
 */
public interface UserFavoritePersonRepository extends JpaRepository<UserFavoritePerson, UserFavoritePerson.UserFavoritePersonId> {

    Optional<UserFavoritePerson> findByIdUsernameAndIdPersonId(String username, String personId);

    Page<UserFavoritePerson> findByIdUsernameOrderByCreatedTimeDesc(String username, Pageable pageable);

    void deleteByIdUsernameAndIdPersonId(String username, String personId);
}
