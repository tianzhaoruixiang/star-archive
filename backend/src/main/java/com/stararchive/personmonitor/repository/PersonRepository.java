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
public interface PersonRepository extends JpaRepository<Person, String>, PersonRepositoryCustom {
    
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
     * 统计重点人员数量（按 is_key_person 字段，保留用于兼容）
     */
    long countByIsKeyPerson(Boolean isKeyPerson);

    /**
     * 统计命中重点标签的人物总数（经过去重）：person_tags 与任意 key_tag=1 的 tag 名称匹配即计入
     */
    @Query(value = "SELECT COUNT(DISTINCT p.person_id) FROM person p INNER JOIN tag t ON t.key_tag = 1 AND JSON_CONTAINS(p.person_tags, JSON_ARRAY(t.tag_name)) = 1", nativeQuery = true)
    long countDistinctByKeyTagMatch();

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

    /**
     * 按签证类型统计人数，返回 TOP15（用于首页签证类型排名，统计人员表 visa_type）
     */
    @Query(value = "SELECT visa_type, COUNT(*) FROM person WHERE visa_type IS NOT NULL AND visa_type != '' GROUP BY visa_type ORDER BY COUNT(*) DESC LIMIT 15", nativeQuery = true)
    List<Object[]> findVisaTypeCountsTop15();

    /**
     * 按机构分页查询人员
     */
    Page<Person> findByOrganization(String organization, Pageable pageable);

    /**
     * 按签证类型分页查询人员
     */
    Page<Person> findByVisaType(String visaType, Pageable pageable);

    /**
     * 按所属群体分页查询人员
     */
    Page<Person> findByBelongingGroup(String belongingGroup, Pageable pageable);

    /** 可见性条件：公开档案 或 当前用户为创建人（username 为空时仅公开） */
    String VISIBILITY_JPQL = "(p.isPublic = true OR (:currentUser IS NOT NULL AND p.createdBy = :currentUser))";
    /** 未删除条件（软删后仍可被有权限者查看详情，列表不展示） */
    String NOT_DELETED_JPQL = "AND (p.deleted = false OR p.deleted IS NULL)";

    @Query("SELECT p FROM Person p WHERE " + VISIBILITY_JPQL + " " + NOT_DELETED_JPQL)
    Page<Person> findAllVisible(Pageable pageable, @Param("currentUser") String currentUser);

    @Query("SELECT p FROM Person p WHERE " + VISIBILITY_JPQL + " AND p.isKeyPerson = :isKeyPerson " + NOT_DELETED_JPQL)
    Page<Person> findByIsKeyPersonAndVisible(@Param("isKeyPerson") Boolean isKeyPerson, Pageable pageable, @Param("currentUser") String currentUser);

    @Query("SELECT p FROM Person p WHERE " + VISIBILITY_JPQL + " AND p.organization = :organization " + NOT_DELETED_JPQL)
    Page<Person> findByOrganizationAndVisible(@Param("organization") String organization, Pageable pageable, @Param("currentUser") String currentUser);

    @Query("SELECT p FROM Person p WHERE " + VISIBILITY_JPQL + " AND p.visaType = :visaType " + NOT_DELETED_JPQL)
    Page<Person> findByVisaTypeAndVisible(@Param("visaType") String visaType, Pageable pageable, @Param("currentUser") String currentUser);

    @Query("SELECT p FROM Person p WHERE " + VISIBILITY_JPQL + " AND p.belongingGroup = :belongingGroup " + NOT_DELETED_JPQL)
    Page<Person> findByBelongingGroupAndVisible(@Param("belongingGroup") String belongingGroup, Pageable pageable, @Param("currentUser") String currentUser);
}
