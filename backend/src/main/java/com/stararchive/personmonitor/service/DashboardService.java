package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.dto.DashboardMapDTO;
import com.stararchive.personmonitor.dto.DashboardStatsDTO;
import com.stararchive.personmonitor.dto.ProvinceRanksDTO;
import com.stararchive.personmonitor.dto.ProvinceStatsDTO;
import com.stararchive.personmonitor.dto.TravelTrendDTO;
import com.stararchive.personmonitor.repository.NewsRepository;
import com.stararchive.personmonitor.repository.PersonRepository;
import com.stararchive.personmonitor.repository.PersonSocialDynamicRepository;
import com.stararchive.personmonitor.repository.PersonTravelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import com.stararchive.personmonitor.dto.DashboardMapDTO.MapItem;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final PersonTravelRepository personTravelRepository;

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

    /**
     * 按人员所属机构统计，返回 TOP15（机构名称、人数）
     */
    public List<MapItem> getOrganizationTop15() {
        log.info("获取机构分布 TOP15");
        List<Object[]> rows = personRepository.findOrganizationCountsTop15();
        return rows.stream()
                .map(row -> new MapItem(
                        row[0] != null ? row[0].toString() : "",
                        row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L
                ))
                .collect(Collectors.toList());
    }

    /**
     * 按人物所属群体统计人数，用于首页群体类别卡片（按人数降序）
     */
    public List<MapItem> getGroupCategoryStats() {
        log.info("获取群体类别统计");
        List<Object[]> rows = personRepository.findBelongingGroupCounts();
        return rows.stream()
                .map(row -> new MapItem(
                        row[0] != null ? row[0].toString().trim() : "",
                        row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L
                ))
                .filter(item -> !item.getName().isEmpty())
                .collect(Collectors.toList());
    }

    /**
     * 按人员档案签证类型统计，返回 TOP15（用于首页签证类型排名，统计 person 表 visa_type）
     */
    public List<MapItem> getVisaTypeTop15() {
        log.info("获取签证类型排名 TOP15（人员表）");
        List<Object[]> rows = personRepository.findVisaTypeCountsTop15();
        return rows.stream()
                .map(row -> new MapItem(
                        row[0] != null ? row[0].toString() : "",
                        row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L
                ))
                .collect(Collectors.toList());
    }

    /**
     * 各地排名：全部 / 昨日新增 / 昨日流出 / 驻留（基于 person_travel 统计）
     */
    public ProvinceRanksDTO getProvinceRanks() {
        log.info("获取各地排名数据");
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDateTime yesterdayStart = LocalDateTime.of(yesterday, LocalTime.MIN);
        LocalDateTime yesterdayEnd = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);

        List<MapItem> all = toMapItemList(personTravelRepository.findProvinceTotalCounts());
        List<MapItem> yesterdayArrival = toMapItemList(personTravelRepository.findProvinceYesterdayArrivalCounts(yesterdayStart, yesterdayEnd));
        List<MapItem> yesterdayDeparture = toMapItemList(personTravelRepository.findProvinceYesterdayDepartureCounts(yesterdayStart, yesterdayEnd));

        Map<String, Long> arrivalMap = toProvinceCountMap(personTravelRepository.findProvinceArrivalCounts());
        Map<String, Long> departureMap = toProvinceCountMap(personTravelRepository.findProvinceDepartureCounts());
        List<String> allProvinces = new ArrayList<>(arrivalMap.keySet());
        departureMap.keySet().forEach(p -> { if (!allProvinces.contains(p)) allProvinces.add(p); });
        List<MapItem> stay = allProvinces.stream()
                .map(p -> new MapItem(p, Math.max(0L, arrivalMap.getOrDefault(p, 0L) - departureMap.getOrDefault(p, 0L))))
                .filter(item -> item.getValue() != null && item.getValue() > 0)
                .sorted(Comparator.comparing(MapItem::getValue, Comparator.reverseOrder()))
                .collect(Collectors.toList());

        return new ProvinceRanksDTO(all, yesterdayArrival, yesterdayDeparture, stay);
    }

    private static List<MapItem> toMapItemList(List<Object[]> rows) {
        return rows.stream()
                .map(row -> new MapItem(
                        row[0] != null ? row[0].toString().trim() : "",
                        row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L
                ))
                .filter(item -> !item.getName().isEmpty())
                .collect(Collectors.toList());
    }

    private static Map<String, Long> toProvinceCountMap(List<Object[]> rows) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String name = row[0] != null ? row[0].toString().trim() : "";
            if (name.isEmpty()) continue;
            long cnt = row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L;
            map.put(name, cnt);
        }
        return map;
    }

    /**
     * 人物行程趋势（近 N 天按日、按类型统计 person_travel）
     */
    public TravelTrendDTO getTravelTrend(int days) {
        log.info("获取人物行程趋势，最近{}天", days);
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(Math.max(1, days - 1));
        LocalDateTime start = LocalDateTime.of(startDate, LocalTime.MIN);
        LocalDateTime end = LocalDateTime.of(endDate.plusDays(1), LocalTime.MIN);

        List<Object[]> rows = personTravelRepository.findDailyTravelCountsByType(start, end);
        List<String> dates = new ArrayList<>();
        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            dates.add(d.format(DateTimeFormatter.ISO_LOCAL_DATE));
        }

        // (date, type) -> count
        Map<String, Map<String, Long>> map = new LinkedHashMap<>();
        for (String dt : dates) {
            map.put(dt, new LinkedHashMap<>());
        }
        for (Object[] row : rows) {
            String dt = row[0] != null ? row[0].toString().trim() : "";
            String type = row[1] != null ? row[1].toString().trim() : "";
            long cnt = row[2] instanceof Number ? ((Number) row[2]).longValue() : 0L;
            if (!dt.isEmpty()) {
                map.computeIfAbsent(dt, k -> new LinkedHashMap<>()).merge(type, cnt, Long::sum);
            }
        }

        String[] typeOrder = { "FLIGHT", "TRAIN", "CAR" };
        String[] typeNames = { "航班", "火车", "汽车" };
        List<TravelTrendDTO.SeriesItem> series = new ArrayList<>();
        for (int i = 0; i < typeOrder.length; i++) {
            final String typeKey = typeOrder[i];
            final String typeName = typeNames[i];
            List<Long> data = dates.stream()
                    .map(dt -> map.getOrDefault(dt, Map.of()).getOrDefault(typeKey, 0L))
                    .collect(Collectors.toList());
            series.add(new TravelTrendDTO.SeriesItem(typeName, data));
        }
        List<Long> totalData = dates.stream()
                .map(dt -> map.getOrDefault(dt, Map.of()).values().stream().mapToLong(Long::longValue).sum())
                .collect(Collectors.toList());
        series.add(new TravelTrendDTO.SeriesItem("合计", totalData));

        return new TravelTrendDTO(dates, series);
    }

    /**
     * 省份下钻统计：该省人物分布（去重人员数、行程数、签证类型/机构/群体排名）
     */
    public ProvinceStatsDTO getProvinceStats(String provinceName) {
        if (provinceName == null || provinceName.isBlank()) {
            return new ProvinceStatsDTO(0L, 0L, List.of(), List.of(), List.of(), List.of());
        }
        String province = provinceName.trim();
        long totalPersonCount = personTravelRepository.countDistinctPersonIdByDestinationProvince(province);
        long travelRecordCount = personTravelRepository.countByDestinationProvince(province);
        List<ProvinceStatsDTO.RankItem> visaTypeRank = toRankItemList(
                personTravelRepository.findVisaTypeCountsByDestinationProvince(province));
        List<ProvinceStatsDTO.RankItem> organizationRank = toRankItemList(
                personTravelRepository.findOrganizationCountsByDestinationProvince(province));
        List<ProvinceStatsDTO.RankItem> belongingGroupRank = toRankItemList(
                personTravelRepository.findBelongingGroupCountsByDestinationProvince(province));
        List<ProvinceStatsDTO.RankItem> cityRank = toRankItemList(
                personTravelRepository.findDestinationCityCountsByDestinationProvince(province));
        return new ProvinceStatsDTO(
                totalPersonCount,
                travelRecordCount,
                visaTypeRank,
                organizationRank,
                belongingGroupRank,
                cityRank
        );
    }

    private static List<ProvinceStatsDTO.RankItem> toRankItemList(List<Object[]> rows) {
        if (rows == null) return List.of();
        return rows.stream()
                .map(row -> new ProvinceStatsDTO.RankItem(
                        row[0] != null ? row[0].toString().trim() : "",
                        row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L
                ))
                .filter(item -> !item.getName().isEmpty())
                .collect(Collectors.toList());
    }

    /**
     * 获取首页地图与四角卡片数据（机构分布、活跃省份、签证类型、人员类别）
     * 当前返回占位结构，后续可从 person/person_travel 等表聚合
     */
    public DashboardMapDTO getMapStats() {
        log.info("获取首页地图与四角卡片数据");
        List<DashboardMapDTO.MapItem> provinceCounts = new ArrayList<>();
        List<DashboardMapDTO.MapItem> orgTop5 = new ArrayList<>();
        List<DashboardMapDTO.MapItem> activeProvinceRank = new ArrayList<>();
        List<DashboardMapDTO.MapItem> visaTypeStats = new ArrayList<>();
        List<DashboardMapDTO.MapItem> personCategoryStats = new ArrayList<>();
        return new DashboardMapDTO(
                provinceCounts,
                orgTop5,
                activeProvinceRank,
                visaTypeStats,
                personCategoryStats
        );
    }
}
