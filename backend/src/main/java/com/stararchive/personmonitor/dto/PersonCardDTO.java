package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 人员卡片DTO - 用于列表展示
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonCardDTO {
    
    private String personId;
    private String chineseName;
    private String originalName;
    private String avatarUrl;
    private String idCardNumber;
    private LocalDateTime birthDate;
    private List<String> personTags;
    private LocalDateTime updatedTime;
    private Boolean isKeyPerson;
}
