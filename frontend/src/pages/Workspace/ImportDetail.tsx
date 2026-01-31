import { Card, Row, Col, Button, Tag, Spin, Checkbox, Collapse, Empty, message, Table, Modal, Select, Radio, Tooltip } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleOutlined, FileTextOutlined, DownloadOutlined, LockOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { archiveFusionAPI, BASE_PATH } from '@/services/api';
import type {
  ArchiveFusionTaskDetailDTO,
  ArchiveExtractResultDTO,
  PersonCardDTO,
  OnlyOfficePreviewConfigDTO,
} from '@/types/archiveFusion';
import ArchiveResumeView from '@/components/ArchiveResumeView';
import OnlyOfficeViewer from '@/components/OnlyOfficeViewer';
import './index.css';

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待提取' },
  EXTRACTING: { color: 'processing', text: '提取中' },
  MATCHING: { color: 'processing', text: '匹配中' },
  SUCCESS: { color: 'success', text: '成功' },
  FAILED: { color: 'error', text: '失败' },
};

/** 表格类型：CSV/Excel 时从 originalText 解析出的表头与行数据 */
interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/**
 * 根据任务文件类型与 originalText 解析为表格数据（与后端拼接规则一致）。
 * Excel: 行分隔 "\n\n------\n\n"，每行单列「行内容」；
 * CSV: 行分隔 "\n\n--- 下一行 ---\n\n"，每行按逗号拆成多列。
 */
function parseOriginalTextAsTable(originalText: string | undefined, fileType: string): ParsedTable | null {
  if (!originalText?.trim()) return null;
  const upper = (fileType || '').toUpperCase();
  if (upper === 'XLSX' || upper === 'XLS') {
    const rowSep = '\n\n------\n\n';
    const rows = originalText.split(rowSep).map((s) => s.trim()).filter(Boolean);
    if (rows.length === 0) return null;
    return {
      headers: ['行内容'],
      rows: rows.map((r) => [r]),
    };
  }
  if (upper === 'CSV') {
    const rowSep = '\n\n--- 下一行 ---\n\n';
    const lines = originalText.split(rowSep).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const parsed = lines.map((line) =>
      line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    );
    const colCount = Math.max(...parsed.map((r) => r.length), 1);
    const headers = parsed.length > 0 ? parsed[0].slice(0, colCount) : Array.from({ length: colCount }, (_, i) => `列${i + 1}`);
    const rows = parsed.length > 1 ? parsed.slice(1) : (parsed.length === 1 ? [] : parsed);
    return { headers, rows };
  }
  return null;
}

const ImportDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ArchiveFusionTaskDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [batchTags, setBatchTags] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<OnlyOfficePreviewConfigDTO | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  /** 导入档案可见性：公开=所有人可见，私有=仅创建人可见；仅系统管理员可选公开 */
  const [importAsPublic, setImportAsPublic] = useState<boolean>(false);
  /** 原始文档区 OnlyOffice 配置（页面加载时拉取，用于左侧对比阅读） */
  const [documentPreviewConfig, setDocumentPreviewConfig] = useState<OnlyOfficePreviewConfigDTO | null>(null);
  const user = useAppSelector((state) => state.auth?.user);
  const isAdmin = user?.role === 'admin';

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setDocumentPreviewConfig(null);
    try {
      const res = await archiveFusionAPI.getTaskDetail(id) as { data?: ArchiveFusionTaskDetailDTO };
      const data = res?.data ?? res;
      if (data) {
        setDetail(data as ArchiveFusionTaskDetailDTO);
        const task = (data as ArchiveFusionTaskDetailDTO).task;
        if (task?.status === 'SUCCESS' && task?.taskId) {
          try {
            const cfgRes = await archiveFusionAPI.getPreviewConfig(task.taskId) as { data?: OnlyOfficePreviewConfigDTO };
            const cfg = cfgRes?.data ?? (cfgRes as unknown as OnlyOfficePreviewConfigDTO);
            if (cfg && typeof (cfg as OnlyOfficePreviewConfigDTO).documentServerUrl === 'string') {
              setDocumentPreviewConfig(cfg as OnlyOfficePreviewConfigDTO);
            }
          } catch {
            // 预览配置可选，失败不提示
          }
        }
      } else {
        message.error('任务不存在');
      }
    } catch {
      message.error('加载任务详情失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) loadDetail(taskId);
  }, [taskId, loadDetail]);

  const isExtracting = detail?.task?.status === 'EXTRACTING' || detail?.task?.status === 'MATCHING';

  useEffect(() => {
    if (!taskId || !isExtracting) return;
    const timer = setInterval(() => loadDetail(taskId), 2500);
    return () => clearInterval(timer);
  }, [taskId, isExtracting, loadDetail]);

  const handleConfirmImport = useCallback(async () => {
    if (!detail?.task?.taskId || selectedResultIds.length === 0) {
      message.warning('请先勾选要导入的提取结果');
      return;
    }
    setImporting(true);
    try {
      const res = await archiveFusionAPI.confirmImport(
        detail.task.taskId,
        selectedResultIds,
        batchTags,
        isAdmin ? importAsPublic : false
      ) as unknown as { data?: string[] };
      const ids = res?.data ?? res;
      if (Array.isArray(ids) && ids.length > 0) {
        message.success(`已导入 ${ids.length} 条人物档案`);
        setSelectedResultIds([]);
        loadDetail(detail.task.taskId);
      } else {
        message.info('没有可导入的结果');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message ?? err?.message ?? '导入失败');
    } finally {
      setImporting(false);
    }
  }, [detail?.task?.taskId, selectedResultIds, batchTags, importAsPublic, isAdmin, loadDetail]);

  const toggleResultSelection = useCallback((resultId: string, checked: boolean) => {
    setSelectedResultIds((prev) =>
      checked ? [...prev, resultId] : prev.filter((id) => id !== resultId)
    );
  }, []);

  const handleDownload = useCallback(() => {
    if (!detail?.task?.taskId) return;
    window.open(archiveFusionAPI.getFileDownloadUrl(detail.task.taskId), '_blank');
  }, [detail?.task?.taskId]);

  const handlePreview = useCallback(async () => {
    if (!detail?.task?.taskId) return;
    if (documentPreviewConfig?.enabled) {
      setPreviewConfig(documentPreviewConfig);
      return;
    }
    setPreviewConfig(null);
    setPreviewLoading(true);
    try {
      const res = await archiveFusionAPI.getPreviewConfig(detail.task.taskId) as { data?: OnlyOfficePreviewConfigDTO; message?: string };
      const cfg = res?.data ?? (res as unknown as OnlyOfficePreviewConfigDTO);
      if (cfg && typeof cfg.documentServerUrl === 'string') {
        setPreviewConfig(cfg);
      } else {
        message.warning((res as { message?: string })?.message ?? '无法获取预览配置');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      const msg = e?.response?.data?.message ?? (e?.response?.status === 404 ? '任务不存在或未关联文件' : '获取预览配置失败');
      message.error(msg);
    } finally {
      setPreviewLoading(false);
    }
  }, [detail?.task?.taskId, documentPreviewConfig]);

  const unimportedResultIds = detail?.extractResults?.filter((r) => !r.imported).map((r) => r.resultId) ?? [];
  const selectAllUnimported = useCallback(() => {
    setSelectedResultIds(
      detail?.extractResults?.filter((r) => !r.imported).map((r) => r.resultId) ?? []
    );
  }, [detail?.extractResults]);

  const handleImportAll = useCallback(async () => {
    const idsToImport = detail?.extractResults?.filter((r) => !r.imported).map((r) => r.resultId) ?? [];
    if (!detail?.task?.taskId || idsToImport.length === 0) {
      message.warning('当前无未导入的提取结果');
      return;
    }
    setImporting(true);
    try {
      const res = await archiveFusionAPI.confirmImport(
        detail.task.taskId,
        idsToImport,
        batchTags,
        isAdmin ? importAsPublic : false
      ) as unknown as { data?: string[] };
      const ids = res?.data ?? res;
      if (Array.isArray(ids) && ids.length > 0) {
        message.success(`已批量导入 ${ids.length} 条人物档案`);
        setSelectedResultIds([]);
        loadDetail(detail.task.taskId);
      } else {
        message.info('没有可导入的结果');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message ?? err?.message ?? '导入失败');
    } finally {
      setImporting(false);
    }
  }, [detail?.task?.taskId, detail?.extractResults, batchTags, importAsPublic, isAdmin, loadDetail]);

  /** 从 rawJson 中取第一个头像路径，生成头像代理 URL */
  const getExtractAvatarUrl = useCallback((rawJson: string | undefined): string | null => {
    if (!rawJson) return null;
    try {
      const obj = JSON.parse(rawJson) as Record<string, unknown>;
      const files = obj?.avatar_files;
      if (!Array.isArray(files) || files.length === 0) return null;
      const first = files[0];
      if (typeof first !== 'string' || !first.trim()) return null;
      return `${BASE_PATH}/api/avatar?path=${encodeURIComponent(first.trim())}`;
    } catch {
      return null;
    }
  }, []);

  const renderExtractResult = useCallback((r: ArchiveExtractResultDTO) => {
    const canSelect = !r.imported;
    let rawObj: Record<string, unknown> = {};
    try {
      if (r.rawJson) rawObj = JSON.parse(r.rawJson) as Record<string, unknown>;
    } catch {
      // ignore
    }
    const avatarUrl = getExtractAvatarUrl(r.rawJson);
    return (
      <Card key={r.resultId} size="small" className="import-detail-result-card">
        <div className="import-detail-result-head">
          {canSelect ? (
            <Checkbox
              checked={selectedResultIds.includes(r.resultId)}
              onChange={(e) => toggleResultSelection(r.resultId, e.target.checked)}
            />
          ) : (
            <CheckCircleOutlined className="import-detail-result-checked" />
          )}
          <div className="import-detail-result-main">
            <strong className="import-detail-result-title">提取人物 #{r.extractIndex + 1}</strong>
            {r.imported && r.importedPersonId && (
              <Tag color="green" className="import-detail-result-tag">已导入</Tag>
            )}
            <span className="import-detail-result-meta">
              {r.originalName && <span>姓名：{r.originalName}</span>}
              {r.birthDate && <span style={{ marginLeft: 12 }}>出生：{r.birthDate}</span>}
              {r.gender && <span style={{ marginLeft: 12 }}>性别：{r.gender}</span>}
              {r.nationality && <span style={{ marginLeft: 12 }}>国籍：{r.nationality}</span>}
            </span>
            <Collapse size="small" className="import-detail-result-collapse" defaultActiveKey={['resume']} items={[
              {
                key: 'resume',
                label: '人物简历（结构化档案）',
                children: (
                  <div className="import-detail-resume-inner">
                    <div className="import-detail-resume-content">
                      <ArchiveResumeView
                        data={rawObj}
                        renderAfterBasicInfoTitle={
                          <div className="import-detail-resume-avatar-wrap">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="import-detail-resume-avatar" />
                            ) : (
                              <div className="import-detail-resume-avatar-placeholder"><UserOutlined /></div>
                            )}
                          </div>
                        }
                      />
                    </div>
                  </div>
                ),
              },
            ]} />
            {r.similarPersons && r.similarPersons.length > 0 && (
              <div className="import-detail-similar">
                <div className="import-detail-similar-title">库内相似档案</div>
                <div className="import-detail-similar-list">
                  {r.similarPersons.map((p: PersonCardDTO) => (
                    <Card key={p.personId} size="small" hoverable className="import-detail-similar-card" onClick={() => navigate(`/persons/${p.personId}`)}>
                      <div className="import-detail-similar-card-inner">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt="" className="import-detail-similar-avatar" />
                        ) : (
                          <div className="import-detail-similar-avatar-placeholder"><UserOutlined /></div>
                        )}
                        <div className="import-detail-similar-info">
                          <div className="import-detail-similar-name">{p.chineseName || p.originalName || p.personId}</div>
                          {p.idCardNumber && <div className="import-detail-similar-id">{p.idCardNumber}</div>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }, [selectedResultIds, toggleResultSelection, navigate, getExtractAvatarUrl]);

  if (loading) {
    return (
      <div className="page-wrapper workspace-page import-detail-page">
        <div className="import-detail-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page-wrapper workspace-page import-detail-page">
        <div className="import-detail-back">
          <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
            返回工作区
          </Button>
        </div>
        <Empty description="任务不存在或加载失败" className="import-detail-empty-state" />
      </div>
    );
  }

  const hasUnimported = detail.extractResults?.some((r) => !r.imported) ?? false;
  const showImportBtn = detail.task?.taskId && hasUnimported;
  const canCompareAndImport = detail.task?.status === 'SUCCESS';

  if (isExtracting) {
    return (
      <div className="page-wrapper workspace-page import-detail-page">
        <div className="import-detail-back">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
            返回工作区
          </Button>
        </div>
        <Card className="import-detail-extracting-card" size="small">
          <div className="import-detail-extracting">
            <Spin size="large" />
            <p className="import-detail-extracting-text">大模型正在提取档案，请稍候…</p>
            <p className="import-detail-extracting-hint">完成后可在此对比查看并确认导入</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-wrapper workspace-page import-detail-page">
      <div className="import-detail-toolbar">
        <div className="import-detail-toolbar-left">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')} className="import-detail-back-btn">
            返回工作区
          </Button>
          <div className="import-detail-task-info">
            <span className="import-detail-task-name">{detail.task.fileName}</span>
            <Tag color={STATUS_MAP[detail.task.status]?.color}>{STATUS_MAP[detail.task.status]?.text ?? detail.task.status}</Tag>
            <span className="import-detail-task-meta">提取 {detail.task.extractCount} 人</span>
            {detail.task.errorMessage && <Tag color="error">{detail.task.errorMessage}</Tag>}
          </div>
          <span className="import-detail-toolbar-divider" />
          <Button type="link" size="small" icon={<FileTextOutlined />} loading={previewLoading} onClick={handlePreview}>预览</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={handleDownload}>下载</Button>
        </div>
        {canCompareAndImport && showImportBtn && (
          <div className="import-detail-toolbar-right">
            <span className="import-detail-batch-tags-label">导入可见性：</span>
            <Radio.Group
              value={importAsPublic}
              onChange={(e) => setImportAsPublic(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
              className="import-detail-visibility-radio"
            >
              <Tooltip title={!isAdmin ? '仅系统管理员可导入为公开档案' : undefined}>
                <Radio.Button value={true} disabled={!isAdmin}>
                  {!isAdmin && <LockOutlined style={{ marginRight: 4 }} />}
                  公开
                </Radio.Button>
              </Tooltip>
              <Radio.Button value={false}>私有</Radio.Button>
            </Radio.Group>
            <span className="import-detail-batch-tags-label">本批标签：</span>
            <Select
              mode="tags"
              placeholder="输入后回车添加，本批导入的人物将带上这些标签"
              value={batchTags}
              onChange={(v) => setBatchTags(v ?? [])}
              style={{ minWidth: 220 }}
              maxTagCount={5}
              className="import-detail-batch-tags"
            />
            <Button type="primary" loading={importing} onClick={handleImportAll}>
              全部导入（{unimportedResultIds.length}）
            </Button>
            <Button type="default" loading={importing} disabled={selectedResultIds.length === 0} onClick={handleConfirmImport}>
              确认并导入已勾选（{selectedResultIds.length}）
            </Button>
            <Button type="link" size="small" onClick={selectAllUnimported}>全选未导入</Button>
          </div>
        )}
      </div>

      <div className="import-detail-content">
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Card size="small" title="原始文档（可对比阅读）" className="import-detail-card import-detail-card-original">
              {documentPreviewConfig?.enabled ? (
                <div className="import-detail-original-onlyoffice">
                  <OnlyOfficeViewer
                    config={documentPreviewConfig}
                    height="100%"
                    onError={(msg) => message.warning(msg)}
                  />
                </div>
              ) : (
                (() => {
                  const parsed = parseOriginalTextAsTable(detail.task.originalText, detail.task.fileType ?? '');
                  if (parsed && (parsed.rows.length > 0 || parsed.headers.length > 0)) {
                    const colCount = parsed.headers.length;
                    const padRow = (row: string[]) =>
                      row.length >= colCount ? row.slice(0, colCount) : [...row, ...Array(colCount - row.length).fill('')];
                    const columns = parsed.headers.map((h, i) => ({
                      title: h,
                      dataIndex: String(i),
                      key: String(i),
                      ellipsis: true,
                      render: (v: string) => v ?? '—',
                    }));
                    const dataSource = parsed.rows.map((row, i) => ({
                      key: i,
                      ...Object.fromEntries(padRow(row).map((cell, j) => [String(j), cell])),
                    }));
                    return (
                      <div className="import-detail-original-body">
                        <Table
                          size="small"
                          pagination={false}
                          columns={columns}
                          dataSource={dataSource}
                          scroll={{ x: 'max-content' }}
                          className="import-detail-original-table"
                        />
                      </div>
                    );
                  }
                  return (
                    <pre className="import-detail-original-pre">
                      {detail.task.originalText || '无原文'}
                    </pre>
                  );
                })()
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" title="抽取人物信息（勾选后点击确认并导入）" className="import-detail-card import-detail-card-results">
              <div className="import-detail-results-body">
                {detail.extractResults && detail.extractResults.length > 0 ? (
                  detail.extractResults.map(renderExtractResult)
                ) : (
                  <Empty description="无提取结果" className="import-detail-empty" />
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
      <Modal
        title={`文档预览：${detail.task.fileName ?? ''}`}
        open={previewConfig !== null}
        onCancel={() => setPreviewConfig(null)}
        footer={null}
        width="90%"
        style={{ top: 24 }}
        destroyOnClose
      >
        {previewConfig && (
          <OnlyOfficeViewer
            config={previewConfig}
            height="75vh"
            onError={(msg) => message.warning(msg)}
          />
        )}
      </Modal>
    </div>
  );
};

export default ImportDetail;
