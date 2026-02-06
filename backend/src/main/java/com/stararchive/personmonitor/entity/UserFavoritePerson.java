package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 用户收藏人物关联表（用户名 + 人物ID 唯一）
 */
@Entity
@Table(name = "user_favorite_person", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "username", "person_id" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserFavoritePerson {

    @EmbeddedId
    private UserFavoritePersonId id;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

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
