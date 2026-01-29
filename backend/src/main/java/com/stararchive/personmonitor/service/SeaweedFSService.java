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
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * SeaweedFS Filer 上传/下载：档案融合文件先存 Filer，异步任务再按 path 拉取解析。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeaweedFSService {

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

    private static String sanitizeFileName(String name) {
        return name.replaceAll("[^a-zA-Z0-9._\\-\\u4e00-\\u9fa5]", "_");
    }
}
