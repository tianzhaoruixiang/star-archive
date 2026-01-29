package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.NewsDTO;
import com.stararchive.personmonitor.entity.News;
import com.stararchive.personmonitor.repository.NewsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 新闻服务（态势感知-新闻动态）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsRepository newsRepository;

    public PageResponse<NewsDTO> getNewsList(int page, int size, String keyword) {
        log.info("查询新闻列表: page={}, size={}, keyword={}", page, size, keyword);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "publishTime"));
        Page<News> newsPage = keyword != null && !keyword.isBlank()
                ? newsRepository.searchByKeyword(keyword.trim(), pageable)
                : newsRepository.findAllByOrderByPublishTimeDesc(pageable);
        List<NewsDTO> list = newsPage.getContent().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return PageResponse.of(list, page, size, newsPage.getTotalElements());
    }

    public NewsDTO getNewsDetail(String newsId) {
        return newsRepository.findById(newsId).map(this::toDTO).orElse(null);
    }

    private NewsDTO toDTO(News n) {
        return new NewsDTO(
                n.getNewsId(),
                n.getMediaName(),
                n.getTitle(),
                n.getContent(),
                n.getAuthors(),
                n.getPublishTime(),
                n.getTags(),
                n.getOriginalUrl(),
                n.getCategory()
        );
    }
}
