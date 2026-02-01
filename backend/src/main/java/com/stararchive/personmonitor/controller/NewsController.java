package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.common.ApiResponse;
import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.NewsDTO;
import com.stararchive.personmonitor.service.NewsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 新闻控制器（态势感知-新闻动态）
 */
@Slf4j
@RestController
@RequestMapping("/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NewsDTO>>> getNewsList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category
    ) {
        PageResponse<NewsDTO> result = newsService.getNewsList(page, size, keyword, category);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{newsId}")
    public ResponseEntity<ApiResponse<NewsDTO>> getNewsDetail(@PathVariable String newsId) {
        NewsDTO dto = newsService.getNewsDetail(newsId);
        return dto != null
                ? ResponseEntity.ok(ApiResponse.success(dto))
                : ResponseEntity.status(404).body(ApiResponse.error("新闻不存在"));
    }
}
