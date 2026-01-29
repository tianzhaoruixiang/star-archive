package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 新闻DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NewsDTO {
    
    private String newsId;
    private String mediaName;
    private String title;
    private String content;
    private List<String> authors;
    private LocalDateTime publishTime;
    private List<String> tags;
    private String originalUrl;
    private String category;
}
