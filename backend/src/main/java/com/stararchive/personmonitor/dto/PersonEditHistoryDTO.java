package com.stararchive.personmonitor.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 人物档案编辑历史 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PersonEditHistoryDTO {

    private String historyId;
    private String personId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime editTime;

    private String editor;
    /** 变更项列表，每项含 field/label/old/new */
    private List<ChangeItem> changes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChangeItem {
        private String field;
        private String label;
        private String oldVal;
        private String newVal;
    }
}
