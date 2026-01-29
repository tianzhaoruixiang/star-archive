package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.dto.DashboardStatsDTO;
import com.stararchive.personmonitor.repository.NewsRepository;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.PersonSocialDynamicRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * DashboardService 单元测试
 */
class DashboardServiceTest {
    
    @Mock
    private PersonRepository personRepository;
    
    @Mock
    private NewsRepository newsRepository;
    
    @Mock
    private PersonSocialDynamicRepository socialDynamicRepository;
    
    @InjectMocks
    private DashboardService dashboardService;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }
    
    @Test
    void testGetStatistics() {
        when(personRepository.count()).thenReturn(100L);
        when(personRepository.countByIsKeyPerson(true)).thenReturn(20L);
        when(newsRepository.countByPublishTimeBetween(any(), any())).thenReturn(50L);
        when(socialDynamicRepository.countByPublishTimeBetween(any(), any())).thenReturn(30L);
        
        DashboardStatsDTO stats = dashboardService.getStatistics();
        
        assertNotNull(stats);
        assertEquals(100L, stats.getTotalPersonCount());
        assertEquals(20L, stats.getKeyPersonCount());
        assertEquals(50L, stats.getTodayNewsCount());
        assertEquals(30L, stats.getTodaySocialDynamicCount());
    }
}
