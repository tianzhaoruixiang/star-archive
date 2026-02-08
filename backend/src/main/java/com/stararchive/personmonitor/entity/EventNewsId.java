package com.stararchive.personmonitor.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 事件-新闻关联表复合主键
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventNewsId implements Serializable {

    private String eventId;
    private String newsId;
}
