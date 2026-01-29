package com.stararchive.personmonitor.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 重点人员库目录 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DirectoryDTO {

    private Integer directoryId;
    private String directoryName;
    private Long personCount;
}
