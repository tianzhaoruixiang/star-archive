package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 标签数据访问接口
 */
@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {
    
    /**
     * 查询一级标签
     */
    List<Tag> findByParentTagIdIsNull();
    
    /**
     * 查询指定父标签下的子标签
     */
    List<Tag> findByParentTagId(Long parentTagId);
    
    /**
     * 按一级标签名称查询
     */
    List<Tag> findByFirstLevelName(String firstLevelName);
    
    /**
     * 按二级标签名称查询
     */
    List<Tag> findBySecondLevelName(String secondLevelName);
    
    /**
     * 查询所有标签(按层级排序)
     */
    @Query("SELECT t FROM Tag t ORDER BY COALESCE(t.firstLevelSortOrder, 999), t.firstLevelName, t.secondLevelName, t.tagName")
    List<Tag> findAllOrderByHierarchy();

    /**
     * 获取当前最大 tag_id，用于新增时生成主键
     */
    @Query("SELECT COALESCE(MAX(t.tagId), 0) FROM Tag t")
    long findMaxTagId();

    /**
     * 按标签名称查询（用于校验重名）
     */
    boolean existsByTagName(String tagName);

    /**
     * 按标签名称查询（用于按二级分类分组筛选）
     */
    Optional<Tag> findByTagName(String tagName);
}
