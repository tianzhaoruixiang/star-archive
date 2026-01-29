package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 重点人员库目录实体
 */
@Entity
@Table(name = "directory")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Directory {

    @Id
    @Column(name = "directory_id", nullable = false)
    private Integer directoryId;

    @Column(name = "parent_directory_id")
    private Integer parentDirectoryId;

    @Column(name = "directory_name", nullable = false, length = 200)
    private String directoryName;

    @Column(name = "creator_username", length = 100)
    private String creatorUsername;

    @Column(name = "creator_user_id")
    private Integer creatorUserId;

    @Column(name = "created_time")
    private LocalDateTime createdTime;

    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
