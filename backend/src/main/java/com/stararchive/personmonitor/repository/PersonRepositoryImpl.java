package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.Person;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 人物数据访问扩展实现：按选定属性组合动态查询相似档案。
 */
@Repository
public class PersonRepositoryImpl implements PersonRepositoryCustom {

    private static final Set<String> ALLOWED_FIELDS = Set.of("originalName", "birthDate", "gender", "nationality");

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @SuppressWarnings("unchecked")
    public List<Person> findSimilarByFields(
            Set<String> matchFields,
            String originalName,
            LocalDate birthDate,
            String gender,
            String nationality) {
        if (matchFields == null || matchFields.isEmpty()) {
            return List.of();
        }
        Set<String> safe = matchFields.stream()
                .filter(f -> f != null && ALLOWED_FIELDS.contains(f))
                .collect(Collectors.toSet());
        if (safe.isEmpty()) {
            return List.of();
        }
        List<String> conditions = new ArrayList<>();
        if (safe.contains("originalName")) conditions.add("original_name = :originalName");
        if (safe.contains("birthDate")) conditions.add("birth_date = :birthDate");
        if (safe.contains("gender")) conditions.add("gender = :gender");
        if (safe.contains("nationality")) conditions.add("nationality = :nationality");
        if (conditions.isEmpty()) {
            return List.of();
        }
        String sql = "SELECT * FROM person WHERE " + String.join(" AND ", conditions);
        Query query = entityManager.createNativeQuery(sql, Person.class);
        if (safe.contains("originalName")) query.setParameter("originalName", originalName);
        if (safe.contains("birthDate")) query.setParameter("birthDate", birthDate);
        if (safe.contains("gender")) query.setParameter("gender", gender);
        if (safe.contains("nationality")) query.setParameter("nationality", nationality);
        return query.getResultList();
    }
}
