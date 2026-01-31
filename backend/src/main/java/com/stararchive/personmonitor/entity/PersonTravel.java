package com.stararchive.personmonitor.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 人物行程实体类
 */
@Entity
@Table(name = "person_travel")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonTravel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "travel_id")
    private Long travelId;
    
    @Column(name = "person_id", nullable = false, length = 200)
    private String personId;
    
    @Column(name = "event_time", nullable = false)
    private LocalDateTime eventTime;
    
    @Column(name = "person_name", nullable = false, length = 200)
    private String personName;
    
    @Column(name = "departure", length = 500)
    private String departure;
    
    @Column(name = "destination", length = 500)
    private String destination;
    
    @Column(name = "travel_type", nullable = false, length = 20)
    private String travelType;
    
    @Column(name = "ticket_number", length = 100)
    private String ticketNumber;
    
    @Column(name = "visa_type", length = 50)
    private String visaType;
    
    @Column(name = "destination_province", length = 50)
    private String destinationProvince;
    
    @Column(name = "departure_province", length = 50)
    private String departureProvince;
    
    @Column(name = "destination_city", length = 50)
    private String destinationCity;
    
    @Column(name = "departure_city", length = 50)
    private String departureCity;
    
    @Column(name = "created_time")
    private LocalDateTime createdTime;
    
    @Column(name = "updated_time")
    private LocalDateTime updatedTime;
}
