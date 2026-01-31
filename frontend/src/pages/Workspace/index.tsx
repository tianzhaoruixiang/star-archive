import { Tabs, Card, Tree, Button, Upload, Empty, Row, Col, Table, message, Tag, Modal, Spin } from 'antd';
import type { UploadFile } from 'antd';
import { UploadOutlined, EyeOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { archiveFusionAPI } from '@/services/api';
import type {
  ArchiveImportTaskDTO,
  ArchiveFusionBatchCreateResultDTO,
  PageResponse,
  OnlyOfficePreviewConfigDTO,
} from '@/types/archiveFusion';
import OnlyOfficeViewer from '@/components/OnlyOfficeViewer';
import { useAppSelector } from '@/store/hooks';
import { formatDateTime } from '@/utils/date';
import './index.css';

const { TabPane } = Tabs;

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待提取' },
  EXTRACTING: { color: 'processing', text: '提取中' },
  MATCHING: { color: 'processing', text: '匹配中' },
  SUCCESS: { color: 'success', text: '成功' },
  FAILED: { color: 'error', text: '失败' },
};

const Workspace = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth?.user);
  const [activeTab, setActiveTab] = useState('fusion');
  const [personalTree, setPersonalTree] = useState<unknown[]>([]);
  const [publicTree, setPublicTree] = useState<unknown[]>([]);

  // 档案融合
  const [taskList, setTaskList] = useState<ArchiveImportTaskDTO[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(0);
  const [taskSize] = useState(10);
  const [taskLoading, setTaskLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const [previewConfig, setPreviewConfig] = useState<OnlyOfficePreviewConfigDTO | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    setTaskLoading(true);
    try {
      const res = await archiveFusionAPI.listTasks({
        page: taskPage,
        size: taskSize,
      }) as { data?: PageResponse<ArchiveImportTaskDTO> };
      const data = res?.data ?? res;
      if (data && 'content' in data) {
        setTaskList(data.content);
        setTaskTotal(data.totalElements ?? 0);
      }
    } catch (e) {
      message.error('加载任务列表失败');
    } finally {
      setTaskLoading(false);
    }
  }, [taskPage, taskSize, user]);

  useEffect(() => {
    if (activeTab === 'fusion') loadTasks();
  }, [activeTab, loadTasks]);

  /** 存在待提取/提取中/匹配中的任务时轮询任务列表，用于展示处理进度 */
  const hasInProgressTasks = taskList.some((t) =>
    ['PENDING', 'EXTRACTING', 'MATCHING'].includes(t.status ?? '')
  );
  useEffect(() => {
    if (activeTab !== 'fusion' || !hasInProgressTasks) return;
    const timer = setInterval(() => loadTasks(), 2500);
    return () => clearInterval(timer);
  }, [activeTab, hasInProgressTasks, loadTasks]);

  const handleBatchUpload = useCallback(async () => {
    const files = fileList
      .map((f) => f.originFileObj)
      .filter((file): file is NonNullable<UploadFile['originFileObj']> => file != null);
    if (files.length === 0) {
      message.warning('请先选择要上传的文件');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file as Blob));
      if (user?.username) formData.append('creatorUsername', user.username);
      const res = await archiveFusionAPI.batchCreateTasks(formData) as {
        data?: ArchiveFusionBatchCreateResultDTO;
        message?: string;
      };
      const data = res?.data ?? res;
      if (data && 'successCount' in data) {
        const { successCount, failedCount, errors } = data;
        if (successCount > 0) {
          message.success(`已上传 ${successCount} 个文件，任务已创建。大模型在后台异步提取，任务列表将自动刷新处理进度`);
          setFileList([]);
          loadTasks();
        }
        if (failedCount > 0 && errors?.length) {
          errors.forEach((e: { fileName: string; message: string }) =>
            message.error(`${e.fileName}: ${e.message}`)
          );
        }
      } else {
        message.error((res as { message?: string })?.message ?? '上传失败');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message ?? err?.message ?? '上传失败');
    } finally {
      setUploading(false);
    }
  }, [fileList, user, loadTasks]);

  const goToDetail = useCallback((id: string) => navigate(`/workspace/fusion/${id}`), [navigate]);

  const handleDownload = useCallback((taskId: string) => {
    const url = archiveFusionAPI.getFileDownloadUrl(taskId);
    window.open(url, '_blank');
  }, []);

  const handlePreview = useCallback(async (taskId: string) => {
    setPreviewTaskId(taskId);
    setPreviewConfig(null);
    setPreviewLoading(true);
    try {
      const res = (await archiveFusionAPI.getPreviewConfig(taskId)) as unknown as { data?: OnlyOfficePreviewConfigDTO; message?: string };
      const cfg = res?.data ?? (res as unknown as OnlyOfficePreviewConfigDTO);
      if (cfg && typeof cfg.documentServerUrl === 'string') {
        setPreviewConfig(cfg);
      } else {
        message.warning(res?.message ?? '无法获取预览配置');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      const msg = e?.response?.data?.message ?? e?.response?.status === 404 ? '任务不存在或未关联文件' : '获取预览配置失败';
      message.error(msg);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const taskColumns = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '类型',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const s = STATUS_MAP[status] ?? { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '提取人数',
      dataIndex: 'extractCount',
      key: 'extractCount',
      width: 90,
    },
    {
      title: '创建时间',
      dataIndex: 'createdTime',
      key: 'createdTime',
      width: 170,
      render: (t: string) => formatDateTime(t, '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: unknown, record: ArchiveImportTaskDTO) => (
        <span className="workspace-fusion-actions">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => goToDetail(record.taskId)}>查看</Button>
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handlePreview(record.taskId)}>预览</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record.taskId)}>下载</Button>
        </span>
      ),
    },
  ];

  return (
    <div className="page-wrapper workspace-page">
      <Card title="个人工作区" className="workspace-card">
        <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k ?? 'fusion')} className="workspace-tabs">
          <TabPane tab="档案融合" key="fusion">
            <div className="workspace-fusion">
              <div className="workspace-fusion-header">
                <div className="workspace-fusion-title">人员档案导入融合</div>
                <p className="workspace-fusion-desc">
                  支持 Word(.doc/.docx)、Excel(.xls/.xlsx)、CSV、PDF。上传成功后立即返回，大模型在后台异步提取，状态变为「成功」后可在详情页对比并批量确认导入。
                </p>
              </div>
              <div className="workspace-fusion-upload-box">
                <Upload.Dragger
                  accept=".doc,.docx,.xls,.xlsx,.csv,.pdf"
                  multiple
                  fileList={fileList}
                  onChange={({ fileList: next }) => setFileList(next)}
                  beforeUpload={() => false}
                  showUploadList={{
                    showPreviewIcon: false,
                    showRemoveIcon: true,
                    showDownloadIcon: false,
                  }}
                  disabled={uploading}
                  className="workspace-fusion-dragger"
                >
                  <div className="workspace-fusion-dragger-inner">
                    <UploadOutlined className="workspace-fusion-dragger-icon" />
                    <p className="workspace-fusion-dragger-text">
                      点击或拖拽多个文件到此区域上传
                    </p>
                    <p className="workspace-fusion-dragger-hint">
                      支持 Word(.doc/.docx)、Excel(.xls/.xlsx)、CSV、PDF
                    </p>
                    {fileList.length > 0 && (
                      <p className="workspace-fusion-dragger-count">
                        已选 {fileList.length} 个文件，点击下方「开始上传」提交
                      </p>
                    )}
                  </div>
                </Upload.Dragger>
                {fileList.length > 0 && (
                  <div className="workspace-fusion-upload-actions">
                    <Button
                      type="primary"
                      icon={<UploadOutlined />}
                      loading={uploading}
                      onClick={handleBatchUpload}
                      size="large"
                      className="workspace-fusion-upload-btn"
                    >
                      开始上传（{fileList.length}）
                    </Button>
                    <Button
                      type="default"
                      disabled={uploading}
                      onClick={() => setFileList([])}
                    >
                      清空列表
                    </Button>
                  </div>
                )}
              </div>
              <div className="workspace-fusion-table-wrap">
                <div className="workspace-fusion-table-header">
                  <span>任务列表</span>
                  {taskTotal > 0 && (
                    <span className="workspace-fusion-table-total">共 {taskTotal} 条</span>
                  )}
                </div>
                {hasInProgressTasks && (
                  <p className="workspace-fusion-progress-hint">
                    有任务正在处理，列表将自动刷新
                  </p>
                )}
                <Table
                  rowKey="taskId"
                  columns={taskColumns}
                  dataSource={taskList}
                  loading={taskLoading}
                  pagination={{
                    current: taskPage + 1,
                    pageSize: taskSize,
                    total: taskTotal,
                    showSizeChanger: false,
                    onChange: (page) => setTaskPage(page - 1),
                  }}
                  onRow={(record) => ({ onDoubleClick: () => goToDetail(record.taskId) })}
                  className="workspace-fusion-table"
                />
              </div>
            </div>
            <Modal
              title="文档预览（OnlyOffice）"
              open={previewTaskId !== null}
              onCancel={() => { setPreviewTaskId(null); setPreviewConfig(null); }}
              footer={null}
              width="90%"
              style={{ top: 24 }}
              destroyOnClose
            >
              {previewLoading && (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <Spin size="large" tip="加载预览配置..." />
                </div>
              )}
              {!previewLoading && previewConfig && (
                <OnlyOfficeViewer
                  config={previewConfig}
                  height="75vh"
                  onError={(msg) => message.warning(msg)}
                />
              )}
            </Modal>
          </TabPane>
          <TabPane tab="数据管理" key="data">
            <Row gutter={24}>
              <Col span={12}>
                <Card size="small" title="个人区" extra={<Upload><Button type="link" icon={<UploadOutlined />}>上传</Button></Upload>}>
                  {personalTree.length === 0 ? (
                    <Empty description="暂无文件，支持文件夹管理、Word/Excel/CSV 上传" />
                  ) : (
                    <Tree showLine treeData={personalTree as never[]} />
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="公共区">
                  {publicTree.length === 0 ? (
                    <Empty description="公共区文档所有人可见" />
                  ) : (
                    <Tree showLine treeData={publicTree as never[]} />
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>

        </Tabs>
      </Card>
    </div>
  );
};

export default Workspace;
