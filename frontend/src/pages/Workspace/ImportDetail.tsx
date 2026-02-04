import { Card, Row, Col, Button, Tag, Spin, Checkbox, Collapse, Empty, message, Table, Modal, Select, Radio, Tooltip, Pagination } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleOutlined, FileTextOutlined, DownloadOutlined, LockOutlined, ReloadOutlined } from '@ant-design/icons';
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
import PersonCard from '@/components/PersonCard';
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
  /** 右侧提取结果分页：当前页数据、总数、当前页号、每页条数（默认 20，防止档案过多卡顿） */
  const [extractResultsPage, setExtractResultsPage] = useState<ArchiveExtractResultDTO[]>([]);
  const [extractResultsTotal, setExtractResultsTotal] = useState(0);
  const [extractPage, setExtractPage] = useState(0);
  const [extractPageSize, setExtractPageSize] = useState(20);
  /** 导入档案可见性：公开=所有人可见，私有=仅创建人可见；仅系统管理员可选公开 */
  const [importAsPublic, setImportAsPublic] = useState<boolean>(false);
  /** 原始文档区 OnlyOffice 配置（页面加载时拉取，用于左侧对比阅读） */
  const [documentPreviewConfig, setDocumentPreviewConfig] = useState<OnlyOfficePreviewConfigDTO | null>(null);
  const [retrying, setRetrying] = useState(false);
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
            // @ts-ignore
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

  /** 加载指定页的提取结果（对照预览右侧） */
  const loadExtractResultsPage = useCallback(async (id: string, page: number, size: number) => {
    try {
      const res = await archiveFusionAPI.getExtractResultsPage(id, page, size) as { data?: { content?: ArchiveExtractResultDTO[]; totalElements?: number } };
      const payload = res?.data ?? res;
      const content = Array.isArray((payload as { content?: ArchiveExtractResultDTO[] }).content)
        ? (payload as { content: ArchiveExtractResultDTO[] }).content
        : [];
      const total = typeof (payload as { totalElements?: number }).totalElements === 'number'
        ? (payload as { totalElements: number }).totalElements
        : 0;
      setExtractResultsPage(content);
      setExtractResultsTotal(total);
    } catch {
      setExtractResultsPage([]);
      setExtractResultsTotal(0);
    }
  }, []);

  useEffect(() => {
    if (taskId) loadDetail(taskId);
  }, [taskId, loadDetail]);

  useEffect(() => {
    setExtractPage(0);
  }, [taskId]);

  const handleExtractPaginationChange = useCallback((page: number, size: number) => {
    setExtractPage(page - 1);
    if (size !== extractPageSize) {
      setExtractPageSize(size);
      setExtractPage(0);
    }
  }, [extractPageSize]);

  /** 任务详情加载完成且状态为 SUCCESS 时按页加载提取结果（默认分页，防止档案过多卡顿） */
  useEffect(() => {
    if (!taskId || !detail?.task || detail.task.status !== 'SUCCESS') {
      setExtractResultsPage([]);
      setExtractResultsTotal(0);
      return;
    }
    loadExtractResultsPage(taskId, extractPage, extractPageSize);
  }, [taskId, detail?.task?.status, extractPage, extractPageSize, loadExtractResultsPage]);

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

  const goToPreview = useCallback(() => {
    if (taskId) navigate(`/workspace/fusion/${taskId}/preview`);
  }, [taskId, navigate]);

  const handleRetry = useCallback(async () => {
    if (!taskId) return;
    setRetrying(true);
    try {
      const res = (await archiveFusionAPI.retryTask(taskId)) as { data?: unknown; message?: string };
      if (res?.data) {
        message.success(res.message ?? '已提交重新导入，页面将刷新');
        loadDetail(taskId);
      } else {
        message.error((res as { message?: string })?.message ?? '重新导入失败');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message ?? err?.message ?? '重新导入失败');
    } finally {
      setRetrying(false);
    }
  }, [taskId, loadDetail]);

  /** 未导入条数：由任务详情接口返回的 unimportedCount 提供（支持 2000+ 条） */
  const unimportedCount = detail?.task?.unimportedCount ?? 0;
  /** 当前页中未导入的 resultId，用于「全选未导入」仅选当前页 */
  const unimportedOnCurrentPage = extractResultsPage.filter((r) => !r.imported).map((r) => r.resultId);
  const selectAllUnimported = useCallback(() => {
    setSelectedResultIds((prev) => {
      const add = unimportedOnCurrentPage.filter((id) => !prev.includes(id));
      return add.length === 0 ? prev.filter((id) => !unimportedOnCurrentPage.includes(id)) : [...prev, ...add];
    });
  }, [unimportedOnCurrentPage]);

  /** 全部导入：提交服务端异步任务，接口立即返回 */
  const handleImportAll = useCallback(async () => {
    if (!detail?.task?.taskId) return;
    if (unimportedCount <= 0) {
      message.warning('当前无未导入的提取结果');
      return;
    }
    setImporting(true);
    try {
      const res = await archiveFusionAPI.confirmImportAllAsync(
        detail.task.taskId,
        batchTags,
        isAdmin ? importAsPublic : false
      ) as { data?: { totalQueued?: number }; message?: string };
      const totalQueued = res?.data?.totalQueued ?? res?.message?.match(/\d+/)?.[0];
      message.success(res?.message ?? `已提交，共 ${totalQueued ?? unimportedCount} 条将后台导入`);
      setSelectedResultIds([]);
      loadDetail(detail.task.taskId);
      loadExtractResultsPage(detail.task.taskId, extractPage, extractPageSize);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message ?? err?.message ?? '提交全部导入失败');
    } finally {
      setImporting(false);
    }
  }, [detail?.task?.taskId, unimportedCount, batchTags, importAsPublic, isAdmin, loadDetail, loadExtractResultsPage, extractPage, extractPageSize]);

  /** 从 rawJson 中取全部头像路径，生成头像代理 URL 列表（支持多头像展示） */
  const getExtractAvatarUrls = useCallback((rawJson: string | undefined): string[] => {
    if (!rawJson) return [];
    try {
      const obj = JSON.parse(rawJson) as Record<string, unknown>;
      const files = obj?.avatar_files;
      if (!Array.isArray(files)) return [];
      return files
        .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
        .map((f) => `${BASE_PATH}/api/avatar?path=${encodeURIComponent(f.trim())}`);
    } catch {
      return [];
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
    const avatarUrls = getExtractAvatarUrls(r.rawJson);
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
                            {avatarUrls.length > 0 ? (
                              <>
                                <div className="import-detail-resume-avatar-main">
                                  <img src={avatarUrls[0]} alt="" className="import-detail-resume-avatar-img" />
                                </div>
                                {avatarUrls.length > 1 && (
                                  <div className="import-detail-resume-avatar-thumbs">
                                    {avatarUrls.slice(1).map((url, idx) => (
                                      <div key={idx} className="import-detail-resume-avatar-thumb">
                                        <img src={url} alt="" className="import-detail-resume-avatar-img" />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="import-detail-resume-avatar-placeholder import-detail-resume-avatar-main">
                                <UserOutlined />
                              </div>
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
                    <PersonCard key={p.personId} person={p} clickable minWidth={280} maxWidth={320} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }, [selectedResultIds, toggleResultSelection, navigate, getExtractAvatarUrls]);

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

  const hasUnimported = unimportedCount > 0;
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
            <span className="import-detail-task-meta">
              {detail.task.totalExtractCount != null && detail.task.totalExtractCount > 0
                ? `已提取 ${detail.task.extractCount ?? 0} / ${detail.task.totalExtractCount} 人`
                : `提取 ${detail.task.extractCount ?? 0} 人`}
              {detail.task.completedTime != null && (
                <> · 完成时间 {new Date(detail.task.completedTime).toLocaleString('zh-CN')}</>
              )}
              {detail.task.durationSeconds != null && detail.task.durationSeconds >= 0 && (
                <> · 总耗时 {detail.task.durationSeconds < 60 ? `${detail.task.durationSeconds}秒` : `${Math.floor(detail.task.durationSeconds / 60)}分${detail.task.durationSeconds % 60}秒`}</>
              )}
            </span>
            {detail.task.errorMessage && <Tag color="error">{detail.task.errorMessage}</Tag>}
          </div>
          <span className="import-detail-toolbar-divider" />
          {detail.task.status === 'FAILED' && (
            <Button type="primary" size="small" icon={<ReloadOutlined />} loading={retrying} onClick={handleRetry}>
              重新导入
            </Button>
          )}
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={goToPreview}>预览</Button>
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
              全部导入（{unimportedCount}）
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
                {extractResultsPage.length > 0 ? (
                  <>
                    {extractResultsPage.map(renderExtractResult)}
                    <div className="import-detail-results-pagination">
                      <Pagination
                        current={extractPage + 1}
                        pageSize={extractPageSize}
                        total={extractResultsTotal}
                        showSizeChanger
                        pageSizeOptions={[10, 20, 50]}
                        showTotal={(total) => `共 ${total} 条`}
                        onChange={handleExtractPaginationChange}
                      />
                    </div>
                  </>
                ) : (
                  <Empty description="无提取结果" className="import-detail-empty" />
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ImportDetail;
