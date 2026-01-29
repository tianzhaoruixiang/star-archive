package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.Person;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
}
