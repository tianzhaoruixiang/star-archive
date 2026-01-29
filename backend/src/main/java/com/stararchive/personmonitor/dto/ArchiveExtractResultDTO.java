package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * 档案提取结果 DTO（含相似匹配的库内人员）
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArchiveExtractResultDTO {

    private String resultId;
    private String taskId;
    private Integer extractIndex;
    private String originalName;
    private LocalDate birthDate;
    private String gender;
    private String nationality;
    /** 本条结果对应的原始文本（Excel 的一行、Word/PDF 全文等） */
    private String originalText;
    private String rawJson;
    /** 用户是否确认导入 */
    private Boolean confirmed;
    /** 是否已导入 person 表 */
    private Boolean imported;
    /** 导入后的人物编号 */
    private String importedPersonId;
    /** 库内相似档案（原始姓名+出生日期+性别+国籍 一致） */
    private List<PersonCardDTO> similarPersons;
}
