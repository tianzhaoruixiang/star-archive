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
     * 各地排名-全部：按目的地省份统计档案人数（去重 person_id），数量降序
     */
    @Query(value = "SELECT destination_province, COUNT(DISTINCT person_id) AS cnt FROM person_travel WHERE destination_province IS NOT NULL AND destination_province != '' GROUP BY destination_province ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findProvinceTotalCounts();

    /**
     * 昨日新增：昨日到达各省份的档案人数（去重 person_id）
     */
    @Query(value = "SELECT destination_province, COUNT(DISTINCT person_id) AS cnt FROM person_travel WHERE destination_province IS NOT NULL AND destination_province != '' AND event_time >= :start AND event_time < :end GROUP BY destination_province ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findProvinceYesterdayArrivalCounts(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 昨日流出：昨日离开各省份的档案人数（去重 person_id）
     */
    @Query(value = "SELECT departure_province, COUNT(DISTINCT person_id) AS cnt FROM person_travel WHERE departure_province IS NOT NULL AND departure_province != '' AND event_time >= :start AND event_time < :end GROUP BY departure_province ORDER BY cnt DESC", nativeQuery = true)
    List<Object[]> findProvinceYesterdayDepartureCounts(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    /**
     * 按目的地省份统计累计到达人数（用于驻留计算，去重 person_id）
     */
    @Query(value = "SELECT destination_province, COUNT(DISTINCT person_id) AS cnt FROM person_travel WHERE destination_province IS NOT NULL AND destination_province != '' GROUP BY destination_province", nativeQuery = true)
    List<Object[]> findProvinceArrivalCounts();

    /**
     * 按出发地省份统计累计离开人数（用于驻留计算，去重 person_id）
     */
    @Query(value = "SELECT departure_province, COUNT(DISTINCT person_id) AS cnt FROM person_travel WHERE departure_province IS NOT NULL AND departure_province != '' GROUP BY departure_province", nativeQuery = true)
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
     * 指定省份涉及人员 ID 分页（有目的地为该省行程的人员，按人员更新时间降序）。
     * 不按可见性过滤，供统计等场景使用。
     */
    @Query(
            value = "SELECT p.person_id FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province GROUP BY p.person_id ORDER BY MAX(p.updated_time) DESC",
            countQuery = "SELECT COUNT(DISTINCT p.person_id) FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province",
            nativeQuery = true
    )
    Page<Object[]> findPersonIdsByDestinationProvince(@Param("province") String province, Pageable pageable);

    /**
     * 指定省份涉及人员 ID 分页（仅返回当前用户可见的档案：公开或 created_by = :user）。
     * 用于首页/省份页点击“档案人数”时列表与分页一致。
     * 使用两列返回避免单列时驱动返回 String 导致 ClassCastException。
     */
    @Query(
            value = "SELECT p.person_id, 1 FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND (p.is_public = 1 OR (LENGTH(COALESCE(:user, '')) > 0 AND p.created_by = :user)) GROUP BY p.person_id ORDER BY MAX(p.updated_time) DESC",
            countQuery = "SELECT COUNT(DISTINCT p.person_id) FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND (p.is_public = 1 OR (LENGTH(COALESCE(:user, '')) > 0 AND p.created_by = :user))",
            nativeQuery = true
    )
    Page<Object[]> findPersonIdsByDestinationProvinceVisible(@Param("province") String province, @Param("user") String user, Pageable pageable);

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

    /**
     * 指定省份+城市涉及人员 ID 分页（目的地为该省该城市）
     */
    @Query(
            value = "SELECT p.person_id FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND pt.destination_city = :city GROUP BY p.person_id ORDER BY MAX(p.updated_time) DESC",
            countQuery = "SELECT COUNT(DISTINCT p.person_id) FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND pt.destination_city = :city",
            nativeQuery = true
    )
    Page<Object[]> findPersonIdsByDestinationProvinceAndCity(@Param("province") String province, @Param("city") String city, Pageable pageable);

    /**
     * 指定省份+签证类型涉及人员 ID 分页（联表 person 的 visa_type，行程表为省份维度）
     */
    @Query(
            value = "SELECT p.person_id FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND p.visa_type = :visaType GROUP BY p.person_id ORDER BY MAX(p.updated_time) DESC",
            countQuery = "SELECT COUNT(DISTINCT p.person_id) FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND p.visa_type = :visaType",
            nativeQuery = true
    )
    Page<Object[]> findPersonIdsByDestinationProvinceAndVisaType(@Param("province") String province, @Param("visaType") String visaType, Pageable pageable);

    /**
     * 指定省份+机构涉及人员 ID 分页
     */
    @Query(
            value = "SELECT p.person_id FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND p.organization = :organization GROUP BY p.person_id ORDER BY MAX(p.updated_time) DESC",
            countQuery = "SELECT COUNT(DISTINCT p.person_id) FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND p.organization = :organization",
            nativeQuery = true
    )
    Page<Object[]> findPersonIdsByDestinationProvinceAndOrganization(@Param("province") String province, @Param("organization") String organization, Pageable pageable);

    /**
     * 指定省份+所属群体涉及人员 ID 分页
     */
    @Query(
            value = "SELECT p.person_id FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND p.belonging_group = :belongingGroup GROUP BY p.person_id ORDER BY MAX(p.updated_time) DESC",
            countQuery = "SELECT COUNT(DISTINCT p.person_id) FROM person p INNER JOIN person_travel pt ON p.person_id = pt.person_id WHERE pt.destination_province = :province AND p.belonging_group = :belongingGroup",
            nativeQuery = true
    )
    Page<Object[]> findPersonIdsByDestinationProvinceAndBelongingGroup(@Param("province") String province, @Param("belongingGroup") String belongingGroup, Pageable pageable);
}
