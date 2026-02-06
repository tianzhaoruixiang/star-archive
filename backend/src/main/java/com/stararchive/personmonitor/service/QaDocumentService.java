package com.stararchive.personmonitor.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stararchive.personmonitor.entity.QaChunk;
import com.stararchive.personmonitor.entity.QaDocument;
import com.stararchive.personmonitor.repository.KnowledgeBaseRepository;
import com.stararchive.personmonitor.repository.QaChunkRepository;
import com.stararchive.personmonitor.repository.QaDocumentRepository;
import com.stararchive.personmonitor.dto.QaDocumentDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 智能问答 - 文档上传与处理（解析、分块、嵌入）
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QaDocumentService {

    private static final int CHUNK_MAX_CHARS = 500;
    private static final int CHUNK_OVERLAP = 50;
    private static final int RAG_TOP_K = 10;

    private final QaDocumentRepository qaDocumentRepository;
    private final QaChunkRepository qaChunkRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final SeaweedFSService seaweedFSService;
    private final ArchiveExtractionAsyncExecutor archiveExtractionAsyncExecutor;
    private final EmbeddingService embeddingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 上传文档：写入 SeaweedFS，创建 QaDocument 记录，异步执行解析+分块+嵌入。
     */
    @Transactional(noRollbackFor = Exception.class)
    public QaDocumentDTO upload(String kbId, String creatorUsername, MultipartFile file) throws Exception {
        if (knowledgeBaseRepository.findById(kbId).filter(kb -> creatorUsername.equals(kb.getCreatorUsername())).isEmpty()) {
            throw new IllegalArgumentException("知识库不存在或无权操作");
        }
        String docId = UUID.randomUUID().toString();
        String taskId = "qa-docs/" + kbId + "/" + docId;
        String path = seaweedFSService.upload(file, taskId);

        QaDocument doc = new QaDocument();
        doc.setId(docId);
        doc.setKbId(kbId);
        doc.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        doc.setFilePathId(path);
        doc.setStatus(QaDocument.STATUS_PENDING);
        doc.setChunkCount(0);
        doc.setCreatedTime(LocalDateTime.now());
        qaDocumentRepository.save(doc);

        processDocumentAsync(docId);
        return toDTO(qaDocumentRepository.findById(docId).orElse(doc));
    }

    /** 异步执行：解析 → 分块 → 嵌入 → 写入 qa_chunk，更新 doc 状态 */
    @Async
    public void processDocumentAsync(String docId) {
        QaDocument doc = qaDocumentRepository.findById(docId).orElse(null);
        if (doc == null) return;
        try {
            doc.setStatus(QaDocument.STATUS_PARSING);
            qaDocumentRepository.save(doc);

            byte[] bytes = seaweedFSService.download(doc.getFilePathId());
            if (bytes == null || bytes.length == 0) {
                doc.setStatus(QaDocument.STATUS_FAILED);
                doc.setErrorMessage("无法下载文件");
                qaDocumentRepository.save(doc);
                return;
            }
            String fullText = archiveExtractionAsyncExecutor.parseFileToTextFromBytes(bytes, doc.getFileName());
            if (fullText == null || fullText.isBlank()) {
                doc.setStatus(QaDocument.STATUS_READY);
                doc.setChunkCount(0);
                qaDocumentRepository.save(doc);
                return;
            }

            doc.setStatus(QaDocument.STATUS_EMBEDDING);
            qaDocumentRepository.save(doc);

            List<String> chunks = chunkText(fullText);
            qaChunkRepository.deleteByDocId(docId);
            int seq = 0;
            for (String content : chunks) {
                if (content.isBlank()) continue;
                String chunkId = UUID.randomUUID().toString();
                QaChunk chunk = new QaChunk();
                chunk.setId(chunkId);
                chunk.setDocId(docId);
                chunk.setKbId(doc.getKbId());
                chunk.setContent(content);
                chunk.setSeq(seq++);
                chunk.setCreatedTime(LocalDateTime.now());
                float[] emb = embeddingService.embed(content);
                if (emb != null) {
                    try {
                        chunk.setEmbedding(objectMapper.writeValueAsString(toList(emb)));
                    } catch (JsonProcessingException e) {
                        log.warn("chunk embedding serialize skip: {}", e.getMessage());
                    }
                }
                qaChunkRepository.save(chunk);
            }

            doc.setStatus(QaDocument.STATUS_READY);
            doc.setChunkCount(seq);
            doc.setErrorMessage(null);
            qaDocumentRepository.save(doc);
            log.info("智能问答-文档处理完成: docId={}, chunks={}", docId, seq);
        } catch (Exception e) {
            log.error("智能问答-文档处理失败: docId={}", docId, e);
            doc.setStatus(QaDocument.STATUS_FAILED);
            doc.setErrorMessage(e.getMessage());
            qaDocumentRepository.save(doc);
        }
    }

    private static List<Double> toList(float[] arr) {
        List<Double> list = new ArrayList<>(arr.length);
        for (float v : arr) {
            list.add((double) v);
        }
        return list;
    }

    private List<String> chunkText(String text) {
        List<String> list = new ArrayList<>();
        String normalized = text.replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) return list;
        for (int start = 0; start < normalized.length(); ) {
            int end = Math.min(start + CHUNK_MAX_CHARS, normalized.length());
            list.add(normalized.substring(start, end));
            start = end - (end < normalized.length() ? CHUNK_OVERLAP : 0);
        }
        return list;
    }

    public List<QaDocumentDTO> listByKb(String kbId, String creatorUsername) {
        if (knowledgeBaseRepository.findById(kbId).filter(kb -> creatorUsername.equals(kb.getCreatorUsername())).isEmpty()) {
            return List.of();
        }
        return qaDocumentRepository.findByKbIdOrderByCreatedTimeDesc(kbId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(noRollbackFor = Exception.class)
    public boolean delete(String docId, String creatorUsername) {
        QaDocument doc = qaDocumentRepository.findById(docId).orElse(null);
        if (doc == null) return false;
        if (knowledgeBaseRepository.findById(doc.getKbId()).filter(kb -> creatorUsername.equals(kb.getCreatorUsername())).isEmpty()) {
            return false;
        }
        qaChunkRepository.deleteByDocId(docId);
        qaDocumentRepository.deleteById(docId);
        return true;
    }

    private QaDocumentDTO toDTO(QaDocument e) {
        QaDocumentDTO dto = new QaDocumentDTO();
        dto.setId(e.getId());
        dto.setKbId(e.getKbId());
        dto.setFileName(e.getFileName());
        dto.setStatus(e.getStatus());
        dto.setErrorMessage(e.getErrorMessage());
        dto.setChunkCount(e.getChunkCount());
        dto.setCreatedTime(e.getCreatedTime());
        return dto;
    }
}
