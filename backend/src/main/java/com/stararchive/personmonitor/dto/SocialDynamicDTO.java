package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 社交动态DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SocialDynamicDTO {
    
    private String dynamicId;
    private String socialAccountType;
    private String socialAccount;
    private String title;
    private String content;
    private List<String> imageUrls;
    private LocalDateTime publishTime;
    private String publishLocation;
    private Long likeCount;
    private Long shareCount;
    private Long commentCount;
    private Long viewCount;
}
