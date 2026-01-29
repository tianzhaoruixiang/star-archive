package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 人物行程DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonTravelDTO {
    
    private Long travelId;
    private String personId;
    private LocalDateTime eventTime;
    private String personName;
    private String departure;
    private String destination;
    private String travelType;
    private String ticketNumber;
}
