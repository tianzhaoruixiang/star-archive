package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能问答 - 发送消息请求
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmartQaChatRequest {

    /** 会话 ID */
    private String sessionId;
    /** 用户输入内容 */
    private String content;
}
