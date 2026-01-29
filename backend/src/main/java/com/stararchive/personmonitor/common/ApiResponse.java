package com.stararchive.personmonitor.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 统一API响应封装类
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    
    private String result;
    private String message;
    private T data;
    
    /**
     * 成功响应(带数据)
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("SUCCESS", "操作成功", data);
    }
    
    /**
     * 成功响应(不带数据)
     */
    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>("SUCCESS", "操作成功", null);
    }
    
    /**
     * 成功响应(自定义消息)
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>("SUCCESS", message, data);
    }
    
    /**
     * 失败响应
     */
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>("ERROR", message, null);
    }
    
    /**
     * 失败响应(带错误码)
     */
    public static <T> ApiResponse<T> error(String message, T data) {
        return new ApiResponse<>("ERROR", message, data);
    }
}
