package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 用户收藏人物关联表（用户名 + 人物ID 唯一）。
 * 实现 Persistable，使新增时走 persist 而非 merge，避免数据库执行 (col1,col2) IN ((?,?)) 的不兼容 SQL。
 */
@Entity
@Table(name = "user_favorite_person", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "username", "person_id" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserFavoritePerson implements Persistable<UserFavoritePerson.UserFavoritePersonId> {

    @EmbeddedId
    private UserFavoritePersonId id;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Override
    public UserFavoritePersonId getId() {
        return id;
    }

    /** 新建未持久化时 createdTime 为 null，走 persist；否则走 merge。 */
    @Override
    public boolean isNew() {
        return createdTime == null;
    }

    @PrePersist
    public void prePersist() {
        if (createdTime == null) {
            createdTime = LocalDateTime.now();
        }
    }

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserFavoritePersonId implements Serializable {
        @Column(name = "username", nullable = false, length = 200)
        private String username;
        @Column(name = "person_id", nullable = false, length = 200)
        private String personId;
    }
}
