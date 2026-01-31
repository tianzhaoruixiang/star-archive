package com.stararchive.personmonitor.service;

import com.stararchive.personmonitor.config.SeaweedFSProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;

/**
 * SeaweedFS Filer 上传/下载：档案融合文件先存 Filer，异步任务再按 path 拉取解析。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeaweedFSService {

    @Value("${server.servlet.context-path:/littlesmall/api}")
    private String contextPath;

    private final SeaweedFSProperties properties;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 上传文件到 Filer，路径为 {pathPrefix}/{taskId}/{safeFileName}，返回 Filer 内相对路径（供下载用）。
     */
    public String upload(MultipartFile file, String taskId) throws IOException {
        String originalName = file.getOriginalFilename();
        String safeName = originalName != null && !originalName.isBlank()
                ? sanitizeFileName(originalName)
                : "file-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String path = properties.getPathPrefix() + "/" + taskId + "/" + safeName;
        String base = properties.getFilerUrl().replaceAll("/$", "");
        URI uri = URI.create(base + "/" + path);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new org.springframework.core.io.ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return safeName;
            }
        });
        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(
                uri,
                HttpMethod.POST,
                entity,
                String.class
        );
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IOException("SeaweedFS upload failed: " + response.getStatusCode() + " " + response.getBody());
        }
        log.info("SeaweedFS uploaded: {}", path);
        return path;
    }

    /**
     * 上传字节数组到 Filer，路径为 {pathPrefix}/{taskId}/avatars/{safeFileName}，返回 Filer 内相对路径。
     * 用于档案融合中提取的人物头像上传。
     */
    public String uploadBytes(byte[] data, String suggestedFileName, String taskId) throws IOException {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("上传数据不能为空");
        }
        String safeName = suggestedFileName != null && !suggestedFileName.isBlank()
                ? sanitizeFileName(suggestedFileName)
                : "avatar-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) + ".jpg";
        if (!safeName.contains(".")) {
            safeName = safeName + ".jpg";
        }
        final String filename = safeName;
        String path = properties.getPathPrefix() + "/" + taskId + "/avatars/" + filename;
        String base = properties.getFilerUrl().replaceAll("/$", "");
        URI uri = URI.create(base + "/" + path);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new org.springframework.core.io.ByteArrayResource(data) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(
                uri,
                HttpMethod.POST,
                entity,
                String.class
        );
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IOException("SeaweedFS upload failed: " + response.getStatusCode() + " " + response.getBody());
        }
        log.info("SeaweedFS uploaded avatar: {}", path);
        return path;
    }

    /**
     * 根据 Filer 相对路径下载文件，返回字节数组；失败返回 null。
     */
    public byte[] download(String path) {
        if (path == null || path.isBlank()) return null;
        String base = properties.getFilerUrl().replaceAll("/$", "");
        String url = base + "/" + path.replaceAll("^/+", "");
        try {
            ResponseEntity<byte[]> response = restTemplate.getForEntity(url, byte[].class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.warn("SeaweedFS download failed: path={}, error={}", path, e.getMessage());
        }
        return null;
    }

    /**
     * 返回用于前端展示头像的代理 URL 路径（相对路径，如 /littlesmall/api/avatar?path=xxx）。
     * 前端 img src 使用该路径即可通过后端代理从 SeaweedFS 获取图片。
     */
    public String getAvatarProxyPath(String filerRelativePath) {
        if (filerRelativePath == null || filerRelativePath.isBlank()) {
            return null;
        }
        String base = (contextPath != null && !contextPath.isBlank()) ? contextPath.replaceAll("/$", "") : "/littlesmall/api";
        return base + "/avatar?path=" + URLEncoder.encode(filerRelativePath, StandardCharsets.UTF_8);
    }

    private static String sanitizeFileName(String name) {
        return name.replaceAll("[^a-zA-Z0-9._\\-\\u4e00-\\u9fa5]", "_");
    }
}
