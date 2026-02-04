package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.Person;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * 人物数据访问扩展：支持按选定属性组合查询相似档案；支持执行 Text2Sql 生成的 SELECT person_id 语句。
 */
public interface PersonRepositoryCustom {

    /**
     * 按选定的属性组合查询相似人物（所有选中属性值相等即视为相似）。
     *
     * @param matchFields 参与比对的属性名集合，仅支持：originalName, birthDate, gender, nationality
     * @param originalName 人物原文姓名
     * @param birthDate 出生日期
     * @param gender 性别
     * @param nationality 国籍
     * @return 匹配的人物列表
     */
    List<Person> findSimilarByFields(
            Set<String> matchFields,
            String originalName,
            LocalDate birthDate,
            String gender,
            String nationality);

    /**
     * 执行仅查询 person_id 的 SELECT 语句（由 Text2Sql 生成并校验），返回 person_id 列表，最多 limit 条。
     *
     * @param sql   已校验的 SELECT person_id FROM person WHERE ... 语句
     * @param limit 最大返回条数
     * @return person_id 列表
     */
    List<String> executeSelectPersonIds(String sql, int limit);
}
