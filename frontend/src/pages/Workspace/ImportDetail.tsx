import { Card, Row, Col, Button, Tag, Spin, Checkbox, Collapse, Empty, message, Table } from 'antd';
import { ArrowLeftOutlined, UserOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { archiveFusionAPI } from '@/services/api';
import type {
  ArchiveFusionTaskDetailDTO,
  ArchiveExtractResultDTO,
  PersonCardDTO,
} from '@/types/archiveFusion';
import ArchiveResumeView from '@/components/ArchiveResumeView';
import './index.css';

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待处理' },
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
  const [importing, setImporting] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await archiveFusionAPI.getTaskDetail(id) as { data?: ArchiveFusionTaskDetailDTO };
      const data = res?.data ?? res;
      if (data) setDetail(data as ArchiveFusionTaskDetailDTO);
      else message.error('任务不存在');
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
      const res = await archiveFusionAPI.confirmImport(detail.task.taskId, selectedResultIds) as unknown as { data?: string[] };
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
  }, [detail?.task?.taskId, selectedResultIds, loadDetail]);

  const toggleResultSelection = useCallback((resultId: string, checked: boolean) => {
    setSelectedResultIds((prev) =>
      checked ? [...prev, resultId] : prev.filter((id) => id !== resultId)
    );
  }, []);

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
      const res = await archiveFusionAPI.confirmImport(detail.task.taskId, idsToImport) as unknown as { data?: string[] };
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
  }, [detail?.task?.taskId, detail?.extractResults, loadDetail]);

  const renderExtractResult = useCallback((r: ArchiveExtractResultDTO) => {
    const canSelect = !r.imported;
    let rawObj: Record<string, unknown> = {};
    try {
      if (r.rawJson) rawObj = JSON.parse(r.rawJson) as Record<string, unknown>;
    } catch {
      // ignore
    }
    return (
      <Card key={r.resultId} size="small" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          {canSelect ? (
            <Checkbox
              checked={selectedResultIds.includes(r.resultId)}
              onChange={(e) => toggleResultSelection(r.resultId, e.target.checked)}
            />
          ) : (
            <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 4 }} />
          )}
          <div style={{ flex: 1 }}>
            <strong>提取人物 #{r.extractIndex + 1}</strong>
            {r.imported && r.importedPersonId && (
              <Tag color="green" style={{ marginLeft: 8 }}>已导入</Tag>
            )}
            <span style={{ marginLeft: 12 }}>
              {r.originalName && <span>姓名：{r.originalName}</span>}
              {r.birthDate && <span style={{ marginLeft: 12 }}>出生：{r.birthDate}</span>}
              {r.gender && <span style={{ marginLeft: 12 }}>性别：{r.gender}</span>}
              {r.nationality && <span style={{ marginLeft: 12 }}>国籍：{r.nationality}</span>}
            </span>
            <Collapse
              size="small"
              style={{ marginTop: 8 }}
              defaultActiveKey={['resume']}
              items={[
                {
                  key: 'resume',
                  label: '人物简历（结构化档案）',
                  children: (
                    <ArchiveResumeView data={rawObj} />
                  ),
                },
              ]}
            />
            {r.similarPersons && r.similarPersons.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ marginBottom: 6, color: '#666' }}>库内相似档案：</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {r.similarPersons.map((p: PersonCardDTO) => (
                    <Card
                      key={p.personId}
                      size="small"
                      hoverable
                      style={{ width: 160 }}
                      onClick={() => navigate(`/persons/${p.personId}`)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                        ) : (
                          <div style={{ width: 32, height: 32, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UserOutlined />
                          </div>
                        )}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 500, fontSize: 12 }}>{p.chineseName || p.originalName || p.personId}</div>
                          {p.idCardNumber && <div style={{ fontSize: 11, color: '#999' }}>{p.idCardNumber}</div>}
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
  }, [selectedResultIds, toggleResultSelection, navigate]);

  if (loading) {
    return (
      <div className="workspace-page" style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="workspace-page" style={{ padding: 24 }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
          返回工作区
        </Button>
        <Empty description="任务不存在或加载失败" style={{ marginTop: 24 }} />
      </div>
    );
  }

  const hasUnimported = detail.extractResults?.some((r) => !r.imported) ?? false;
  const showImportBtn = detail.task?.taskId && hasUnimported;
  const canCompareAndImport = detail.task?.status === 'SUCCESS';

  if (isExtracting) {
    return (
      <div className="workspace-page" style={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
            返回工作区
          </Button>
        </div>
        <Card size="small" title={detail.task.fileName}>
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#666' }}>
              大模型正在提取档案，请稍候… 完成后可在此对比查看并确认导入
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="workspace-page" style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace')}>
            返回工作区
          </Button>
          <span style={{ color: '#999' }}>|</span>
          <span>
            <strong>任务详情：</strong>
            {detail.task.fileName} · {STATUS_MAP[detail.task.status]?.text ?? detail.task.status} · 提取 {detail.task.extractCount} 人
          </span>
          {detail.task.errorMessage && (
            <Tag color="error">{detail.task.errorMessage}</Tag>
          )}
        </div>
        {canCompareAndImport && showImportBtn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button type="primary" loading={importing} onClick={handleImportAll}>
              全部导入（{unimportedResultIds.length}）
            </Button>
            <Button
              type="default"
              loading={importing}
              disabled={selectedResultIds.length === 0}
              onClick={handleConfirmImport}
            >
              确认并导入已勾选（{selectedResultIds.length}）
            </Button>
            <Button type="link" size="small" onClick={selectAllUnimported}>
              全选未导入
            </Button>
          </div>
        )}
      </div>

      <Row gutter={16} style={{ minHeight: 360 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title="原始文档（可对比阅读）" style={{ height: '100%' }}>
            {(() => {
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
                  <div style={{ maxHeight: 520, overflow: 'auto' }}>
                    <Table
                      size="small"
                      pagination={false}
                      columns={columns}
                      dataSource={dataSource}
                      scroll={{ x: 'max-content' }}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                );
              }
              return (
                <pre
                  style={{
                    margin: 0,
                    maxHeight: 520,
                    overflow: 'auto',
                    fontSize: 12,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    background: '#fafafa',
                    padding: 12,
                    borderRadius: 4,
                  }}
                >
                  {detail.task.originalText || '无原文'}
                </pre>
              );
            })()}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="抽取人物信息（勾选后点击确认并导入）" style={{ height: '100%' }}>
            <div style={{ maxHeight: 520, overflow: 'auto' }}>
              {detail.extractResults && detail.extractResults.length > 0 ? (
                detail.extractResults.map(renderExtractResult)
              ) : (
                <Empty description="无提取结果" style={{ marginTop: 12 }} />
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ImportDetail;
