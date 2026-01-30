package com.stararchive.personmonitor.controller;

import com.stararchive.personmonitor.service.SeaweedFSService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 头像代理：根据 SeaweedFS 存储路径从 Filer 拉取图片并返回，供前端 img 展示。
 */
@Slf4j
@RestController
@RequestMapping("/avatar")
@RequiredArgsConstructor
public class AvatarController {

    private final SeaweedFSService seaweedFSService;

    /**
     * 根据 path（SeaweedFS Filer 相对路径）返回图片字节流。
     * 前端使用：&lt;img src="/api/avatar?path=archive-fusion/xxx/avatars/yyy.jpg" /&gt;
     */
    @GetMapping(produces = { MediaType.IMAGE_JPEG_VALUE, MediaType.IMAGE_PNG_VALUE, MediaType.IMAGE_GIF_VALUE })
    public ResponseEntity<byte[]> getAvatar(@RequestParam("path") String path) {
        if (path == null || path.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        byte[] data = seaweedFSService.download(path);
        if (data == null || data.length == 0) {
            return ResponseEntity.notFound().build();
        }
        MediaType contentType = contentTypeFromPath(path);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(contentType);
        headers.setCacheControl("private, max-age=3600");
        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    private static MediaType contentTypeFromPath(String path) {
        if (path == null) return MediaType.IMAGE_JPEG;
        String lower = path.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.IMAGE_JPEG;
    }
}
