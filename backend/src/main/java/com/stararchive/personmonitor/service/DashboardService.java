package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.dto.DashboardStatsDTO;
import com.stararchive.personmonitor.repository.NewsRepository;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.PersonSocialDynamicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 首页大屏服务
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {
    
    private final PersonRepository personRepository;
    private final NewsRepository newsRepository;
    private final PersonSocialDynamicRepository socialDynamicRepository;
    
    /**
     * 获取首页统计数据
     */
    public DashboardStatsDTO getStatistics() {
        log.info("获取首页统计数据");
        
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        LocalDateTime todayEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MAX);
        
        long totalPersonCount = personRepository.count();
        long keyPersonCount = personRepository.countByIsKeyPerson(true);
        long todayNewsCount = newsRepository.countByPublishTimeBetween(todayStart, todayEnd);
        long todaySocialCount = socialDynamicRepository.countByPublishTimeBetween(todayStart, todayEnd);
        
        return new DashboardStatsDTO(
                totalPersonCount,
                keyPersonCount,
                todayNewsCount,
                todaySocialCount
        );
    }
}
