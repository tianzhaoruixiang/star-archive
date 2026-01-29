package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 重点人员库-人员关联实体
 */
@Entity
@Table(name = "person_directory")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonDirectory implements Serializable {

    @EmbeddedId
    private PersonDirectoryId id;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Embeddable
    public static class PersonDirectoryId implements Serializable {
        @Column(name = "directory_id", nullable = false)
        private Integer directoryId;
        @Column(name = "person_id", nullable = false, length = 200)
        private String personId;
    }
}
