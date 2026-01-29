package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.common.PageResponse;
import com.stararchive.personmonitor.dto.SocialDynamicDTO;
import com.stararchive.personmonitor.entity.PersonSocialDynamic;
import com.stararchive.personmonitor.repository.PersonSocialDynamicRepository;
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
 * 社交动态服务（态势感知-社交动态）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SocialDynamicService {

    private final PersonSocialDynamicRepository socialDynamicRepository;

    public PageResponse<SocialDynamicDTO> getSocialList(int page, int size, String platform) {
        log.info("查询社交动态列表: page={}, size={}, platform={}", page, size, platform);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "publishTime"));
        Page<PersonSocialDynamic> dynamicPage = platform != null && !platform.isBlank()
                ? socialDynamicRepository.findBySocialAccountTypeOrderByPublishTimeDesc(platform, pageable)
                : socialDynamicRepository.findAllByOrderByPublishTimeDesc(pageable);
        List<SocialDynamicDTO> list = dynamicPage.getContent().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return PageResponse.of(list, page, size, dynamicPage.getTotalElements());
    }

    private SocialDynamicDTO toDTO(PersonSocialDynamic s) {
        SocialDynamicDTO dto = new SocialDynamicDTO();
        dto.setDynamicId(s.getDynamicId());
        dto.setSocialAccountType(s.getSocialAccountType());
        dto.setSocialAccount(s.getSocialAccount());
        dto.setTitle(s.getTitle());
        dto.setContent(s.getContent());
        dto.setImageUrls(s.getImageFiles());
        dto.setPublishTime(s.getPublishTime());
        dto.setPublishLocation(s.getPublishLocation());
        dto.setLikeCount(s.getLikeCount());
        dto.setShareCount(s.getShareCount());
        dto.setCommentCount(s.getCommentCount());
        dto.setViewCount(s.getViewCount());
        return dto;
    }
}
