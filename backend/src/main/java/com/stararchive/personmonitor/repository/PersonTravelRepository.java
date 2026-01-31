package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.PersonTravel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 人物行程数据访问接口
 */
@Repository
public interface PersonTravelRepository extends JpaRepository<PersonTravel, Long> {
    
    /**
     * 查询指定人物的行程记录
     */
    Page<PersonTravel> findByPersonIdOrderByEventTimeDesc(String personId, Pageable pageable);
    
    /**
     * 查询指定人物的所有行程记录
     */
    List<PersonTravel> findByPersonIdOrderByEventTimeDesc(String personId);
    
    /**
     * 查询指定人物在指定时间范围内的行程
     */
    List<PersonTravel> findByPersonIdAndEventTimeBetween(
            String personId, 
            LocalDateTime startTime, 
            LocalDateTime endTime
    );
    
    /**
     * 统计指定时间范围内的行程数量
     */
    @Query("SELECT COUNT(pt) FROM PersonTravel pt WHERE pt.eventTime >= :startTime AND pt.eventTime <= :endTime")
    long countByEventTimeBetween(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

    /**
     * 按签证类型统计行程数，返回 TOP15（用于首页签证类型排名）
     */
    @Query(value = "SELECT visa_type, COUNT(*) AS cnt FROM person_travel WHERE visa_type IS NOT NULL AND visa_type != '' GROUP BY visa_type ORDER BY cnt DESC LIMIT 15", nativeQuery = true)
    List<Object[]> findVisaTypeCountsTop15();

    /**
     * 各地排名-全部：按目的地省份统计人员到达数量（destination_province），数量降序
     */
    @Query(value = "SELECT destination_province, COUNT(*) AS cnt FROM person_travel WHERE destination_province IS NOT NULL AND destination_province != '' GROUP BY destination_province ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findProvinceTotalCounts();

    /**
     * 昨日新增：昨日到达各省份的人员数量（event_time 在昨日，按 destination_province 分组）
     */
    @Query(value = "SELECT destination_province, COUNT(*) AS cnt FROM person_travel WHERE destination_province IS NOT NULL AND destination_province != '' AND event_time >= :start AND event_time < :end GROUP BY destination_province ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findProvinceYesterdayArrivalCounts(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 昨日流出：昨日离开各省份的人员数量（event_time 在昨日，按 departure_province 分组）
     */
    @Query(value = "SELECT departure_province, COUNT(*) AS cnt FROM person_travel WHERE departure_province IS NOT NULL AND departure_province != '' AND event_time >= :start AND event_time < :end GROUP BY departure_province ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findProvinceYesterdayDepartureCounts(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 按目的地省份统计累计到达人数（用于驻留计算）
     */
    @Query(value = "SELECT destination_province, COUNT(*) AS cnt FROM person_travel WHERE destination_province IS NOT NULL AND destination_province != '' GROUP BY destination_province", nativeQuery = true)
    List<Object[]> findProvinceArrivalCounts();

    /**
     * 按出发地省份统计累计离开人数（用于驻留计算）
     */
    @Query(value = "SELECT departure_province, COUNT(*) AS cnt FROM person_travel WHERE departure_province IS NOT NULL AND departure_province != '' GROUP BY departure_province", nativeQuery = true)
    List<Object[]> findProvinceDepartureCounts();

    /**
     * 按日、行程类型统计行程数（用于人物行程趋势图）
     * 返回: [0]=日期(yyyy-MM-dd), [1]=travel_type, [2]=count
     */
    @Query(value = "SELECT DATE_FORMAT(event_time, '%Y-%m-%d') AS dt, travel_type, COUNT(*) AS cnt FROM person_travel WHERE event_time >= :start AND event_time < :end GROUP BY dt, travel_type ORDER BY dt", nativeQuery = true)
    List<Object[]> findDailyTravelCountsByType(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 指定省份下去重人员数（有目的地为该省行程的人员数）
     */
    @Query(value = "SELECT COUNT(DISTINCT person_id) FROM person_travel WHERE destination_province = :province", nativeQuery = true)
    long countDistinctPersonIdByDestinationProvince(@Param("province") String province);

    /**
     * 指定省份行程记录总数（目的地为该省）
     */
    @Query(value = "SELECT COUNT(*) FROM person_travel WHERE destination_province = :province", nativeQuery = true)
    long countByDestinationProvince(@Param("province") String province);

    /**
     * 指定省份按签证类型统计行程数，返回 [visa_type, count]
     */
    @Query(value = "SELECT visa_type, COUNT(*) AS cnt FROM person_travel WHERE destination_province = :province AND visa_type IS NOT NULL AND visa_type != '' GROUP BY visa_type ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findVisaTypeCountsByDestinationProvince(@Param("province") String province);

    /**
     * 指定省份涉及人员按机构统计，返回 [organization, count]，需联表 person
     */
    @Query(value = "SELECT p.organization, COUNT(DISTINCT pt.person_id) AS cnt FROM person_travel pt INNER JOIN person p ON pt.person_id = p.person_id WHERE pt.destination_province = :province AND (p.organization IS NOT NULL AND p.organization != '') GROUP BY p.organization ORDER BY cnt DESC LIMIT 15", nativeQuery = true)
    List<Object[]> findOrganizationCountsByDestinationProvince(@Param("province") String province);

    /**
     * 指定省份涉及人员按所属群体统计，返回 [belonging_group, count]，需联表 person
     */
    @Query(value = "SELECT p.belonging_group, COUNT(DISTINCT pt.person_id) AS cnt FROM person_travel pt INNER JOIN person p ON pt.person_id = p.person_id WHERE pt.destination_province = :province AND (p.belonging_group IS NOT NULL AND p.belonging_group != '') GROUP BY p.belonging_group ORDER BY cnt DESC LIMIT 15", nativeQuery = true)
    List<Object[]> findBelongingGroupCountsByDestinationProvince(@Param("province") String province);

    /**
     * 指定省份按到达城市统计行程数，返回 [destination_city, count]，用于省份页城市分布
     */
    @Query(value = "SELECT destination_city, COUNT(*) AS cnt FROM person_travel WHERE destination_province = :province AND destination_city IS NOT NULL AND destination_city != '' GROUP BY destination_city ORDER BY cnt DESC LIMIT 15", nativeQuery = true)
    List<Object[]> findDestinationCityCountsByDestinationProvince(@Param("province") String province);
}
