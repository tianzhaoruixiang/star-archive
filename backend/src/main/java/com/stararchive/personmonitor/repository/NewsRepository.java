package com.stararchive.personmonitor.repository;

import com.stararchive.personmonitor.entity.News;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

/**
 * 新闻数据访问接口
 */
@Repository
public interface NewsRepository extends JpaRepository<News, String> {
    
    /**
     * 分页查询新闻(按发布时间倒序)
     */
    Page<News> findAllByOrderByPublishTimeDesc(Pageable pageable);
    
    /**
     * 按类别查询新闻
     */
    Page<News> findByCategoryOrderByPublishTimeDesc(String category, Pageable pageable);
    
    /**
     * 统计指定时间范围内的新闻数量
     */
    @Query("SELECT COUNT(n) FROM News n WHERE n.publishTime >= :startTime AND n.publishTime <= :endTime")
    long countByPublishTimeBetween(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);
    
    /**
     * 关键词搜索新闻
     */
    @Query("SELECT n FROM News n WHERE n.title LIKE CONCAT('%', :keyword, '%') OR n.content LIKE CONCAT('%', :keyword, '%') ORDER BY n.publishTime DESC")
    Page<News> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /**
     * 按分类 + 关键词筛选新闻（分类与关键词同时生效）
     */
    @Query("SELECT n FROM News n WHERE n.category = :category AND (n.title LIKE CONCAT('%', :keyword, '%') OR n.content LIKE CONCAT('%', :keyword, '%')) ORDER BY n.publishTime DESC")
    Page<News> findByCategoryAndKeyword(@Param("category") String category, @Param("keyword") String keyword, Pageable pageable);
}
