package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 智能问答 - 助手回复
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmartQaChatResponse {

    private String messageId;
    private String content;
}
