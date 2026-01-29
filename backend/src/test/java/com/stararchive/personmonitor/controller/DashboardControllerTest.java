package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.dto.DashboardStatsDTO;
import com.stararchive.personmonitor.service.DashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * DashboardController 单元测试
 */
@WebMvcTest(DashboardController.class)
class DashboardControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private DashboardService dashboardService;
    
    @Test
    void testGetStatistics() throws Exception {
        DashboardStatsDTO stats = new DashboardStatsDTO(100L, 20L, 50L, 30L);
        when(dashboardService.getStatistics()).thenReturn(stats);
        
        mockMvc.perform(get("/dashboard/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("SUCCESS"))
                .andExpect(jsonPath("$.data.totalPersonCount").value(100))
                .andExpect(jsonPath("$.data.keyPersonCount").value(20));
    }
}
