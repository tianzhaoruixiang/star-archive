package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.Person;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 人物数据访问接口
 */
@Repository
public interface PersonRepository extends JpaRepository<Person, String> {
    
    /**
     * 根据姓名查询人物
     */
    Optional<Person> findByChineseName(String chineseName);
    
    /**
     * 查询重点人员
     */
    Page<Person> findByIsKeyPerson(Boolean isKeyPerson, Pageable pageable);
    
    /**
     * 统计总人数
     */
    long count();
    
    /**
     * 统计重点人员数量
     */
    long countByIsKeyPerson(Boolean isKeyPerson);
    
    /**
     * 根据标签查询人员
     */
    @Query(value = "SELECT * FROM person WHERE JSON_CONTAINS(person_tags, JSON_ARRAY(:tag)) = 1", nativeQuery = true)
    Page<Person> findByTag(@Param("tag") String tag, Pageable pageable);

    /**
     * 统计包含某标签的人员数量（Doris 可用 array_contains，MySQL 用 JSON_CONTAINS）
     */
    @Query(value = "SELECT COUNT(*) FROM person WHERE JSON_CONTAINS(person_tags, JSON_ARRAY(:tag)) = 1", nativeQuery = true)
    long countByPersonTagsContaining(@Param("tag") String tag);

    /**
     * 相似档案匹配：原始姓名+出生日期+性别+国籍
     */
    @Query(value = "SELECT * FROM person WHERE original_name = :originalName AND gender = :gender AND nationality = :nationality AND birth_date = :birthDate", nativeQuery = true)
    List<Person> findSimilarByOriginalNameAndBirthDateAndGenderAndNationality(
            @Param("originalName") String originalName,
            @Param("birthDate") LocalDate birthDate,
            @Param("gender") String gender,
            @Param("nationality") String nationality);

    /**
     * 按机构统计人数，返回 TOP15（机构名称、人数）
     */
    @Query(value = "SELECT organization, COUNT(*) FROM person WHERE organization IS NOT NULL AND organization != '' GROUP BY organization ORDER BY COUNT(*) DESC LIMIT 15", nativeQuery = true)
    List<Object[]> findOrganizationCountsTop15();

    /**
     * 按所属群体统计人数，用于首页群体类别卡片（按人数降序）
     */
    @Query(value = "SELECT belonging_group, COUNT(*) FROM person WHERE belonging_group IS NOT NULL AND belonging_group != '' GROUP BY belonging_group ORDER BY COUNT(*) DESC", nativeQuery = true)
    List<Object[]> findBelongingGroupCounts();
}
