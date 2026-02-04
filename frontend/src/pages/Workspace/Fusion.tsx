import { Card, Button, Upload, Table, message, Tag, Popconfirm, Checkbox } from 'antd';
import type { UploadFile } from 'antd';
import { UploadOutlined, EyeOutlined, DownloadOutlined, FileTextOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { archiveFusionAPI } from '@/services/api';
import type { ArchiveImportTaskDTO, PageResponse } from '@/types/archiveFusion';
import { SIMILAR_MATCH_FIELD_OPTIONS } from '@/types/archiveFusion';
import { useAppSelector } from '@/store/hooks';
import { formatDateTime } from '@/utils/date';

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待提取' },
  EXTRACTING: { color: 'processing', text: '提取中' },
  MATCHING: { color: 'processing', text: '匹配中' },
  SUCCESS: { color: 'success', text: '成功' },
  FAILED: { color: 'error', text: '失败' },
};

const WorkspaceFusion = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth?.user);
  const [taskList, setTaskList] = useState<ArchiveImportTaskDTO[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(0);
  const [taskSize] = useState(10);
  const [taskLoading, setTaskLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [similarMatchFields, setSimilarMatchFields] = useState<string[]>(
    SIMILAR_MATCH_FIELD_OPTIONS.map((o) => o.key)
  );
  const similarMatchFieldsStr = useMemo(() => similarMatchFields.join(','), [similarMatchFields]);

  const loadTasks = useCallback(async () => {
    setTaskLoading(true);
    try {
      const res = (await archiveFusionAPI.listTasks({ page: taskPage, size: taskSize })) as { data?: PageResponse<ArchiveImportTaskDTO> };
      const data = res?.data ?? res;
      if (data && 'content' in data) {
        setTaskList(data.content);
        setTaskTotal(data.totalElements ?? 0);
      }
    } catch {
      message.error('加载任务列表失败');
    } finally {
      setTaskLoading(false);
    }
  }, [taskPage, taskSize]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const hasInProgressTasks = taskList.some((t) => ['PENDING', 'EXTRACTING', 'MATCHING'].includes(t.status ?? ''));
  useEffect(() => {
    if (!hasInProgressTasks) return;
    const timer = setInterval(() => loadTasks(), 2500);
    return () => clearInterval(timer);
  }, [hasInProgressTasks, loadTasks]);

  const handleBatchUpload = useCallback(async () => {
    const files = fileList
      .map((f) => f.originFileObj)
      .filter((file): file is NonNullable<UploadFile['originFileObj']> => file != null);
    if (files.length === 0) {
      message.warning('请先选择要上传的文件');
      return;
    }
    if (similarMatchFields.length === 0) {
      message.warning('请至少选择一项用于判定相似档案的属性');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file as Blob));
      if (user?.username) formData.append('creatorUsername', user.username);
      formData.append('similarMatchFields', similarMatchFieldsStr);
      const res = (await archiveFusionAPI.batchCreateTasks(formData)) as { data?: { successCount?: number; failedCount?: number; errors?: { fileName: string; message: string }[] }; message?: string };
      const data = res?.data ?? res;
      if (data && 'successCount' in data) {
        if ((data.successCount ?? 0) > 0) {
          message.success('已上传，任务已创建。大模型在后台异步提取，列表将自动刷新');
          setFileList([]);
          loadTasks();
        }
        if ((data.failedCount ?? 0) > 0 && data.errors?.length) {
          data.errors.forEach((e) => message.error(`${e.fileName}: ${e.message}`));
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
  }, [fileList, user, loadTasks, similarMatchFields, similarMatchFieldsStr]);

  const goToDetail = useCallback((id: string) => navigate(`/workspace/fusion/${id}`), [navigate]);
  const handleDownload = useCallback((taskId: string) => {
    window.open(archiveFusionAPI.getFileDownloadUrl(taskId), '_blank');
  }, []);

  const goToPreview = useCallback((taskId: string) => navigate(`/workspace/fusion/${taskId}/preview`), [navigate]);

  const handleRetry = useCallback(
    async (taskId: string) => {
      setRetryingTaskId(taskId);
      try {
        const res = (await archiveFusionAPI.retryTask(taskId)) as { data?: ArchiveImportTaskDTO; message?: string };
        if (res?.data) {
          message.success(res.message ?? '已提交重新导入，列表将自动刷新');
          loadTasks();
        } else {
          message.error((res as { message?: string })?.message ?? '重新导入失败');
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        message.error(err?.response?.data?.message ?? err?.message ?? '重新导入失败');
      } finally {
        setRetryingTaskId(null);
      }
    },
    [loadTasks]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        await archiveFusionAPI.deleteTask(taskId);
        message.success('删除成功');
        loadTasks();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        message.error(err?.response?.data?.message ?? err?.message ?? '删除失败');
      }
    },
    [loadTasks]
  );

  /** 总耗时秒数转为「X分Y秒」或「X秒」 */
  const formatDuration = (seconds: number | undefined | null): string => {
    if (seconds == null || seconds < 0) return '—';
    if (seconds < 60) return `${seconds}秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分`;
  };

  const taskColumns = [
    { title: '文件名', dataIndex: 'fileName', key: 'fileName',  width: 280, ellipsis: true, render: (t: string) => t || '-' },
    { title: '类型', dataIndex: 'fileType', key: 'fileType', width: 80 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (s: string) => <Tag color={STATUS_MAP[s]?.color ?? 'default'}>{STATUS_MAP[s]?.text ?? s}</Tag> },
    {
      title: '提取进度',
      key: 'extractProgress',
      width: 110,
      render: (_: unknown, record: ArchiveImportTaskDTO) => {
        const total = record.totalExtractCount ?? 0;
        const done = record.extractCount ?? 0;
        if (total > 0) {
          return <span>{done} / {total}</span>;
        }
        return <span>{done}</span>;
      },
    },
    { title: '创建时间', dataIndex: 'createdTime', key: 'createdTime', width: 170, render: (t: string) => formatDateTime(t, '-') },
    { title: '总耗时', dataIndex: 'durationSeconds', key: 'durationSeconds', width: 100, render: (_: unknown, record: ArchiveImportTaskDTO) => formatDuration(record.durationSeconds) },
    {
      title: '操作',
      key: 'action',
      width: 400,
      render: (_: unknown, record: ArchiveImportTaskDTO) => (
        <span className="workspace-fusion-actions">
          {record.status === 'FAILED' && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              loading={retryingTaskId === record.taskId}
              onClick={() => handleRetry(record.taskId)}
            >
              重新导入
            </Button>
          )}
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => goToDetail(record.taskId)}>查看</Button>
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => goToPreview(record.taskId)}>预览</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record.taskId)}>下载</Button>
          <Popconfirm
            title="确定删除该导入任务？删除后任务及提取结果、相似匹配记录将不可恢复，档案文件仍保留在存储中。"
            onConfirm={() => handleDelete(record.taskId)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="workspace-fusion">
        <div className="page-header">
          <h1 className="page-header-title">档案融合</h1>
          <p className="page-header-desc">工作区 · 人员档案导入融合</p>
        </div>
        <p className="workspace-fusion-desc">
          支持 Word(.doc/.docx)、Excel(.xls/.xlsx)、CSV、PDF。上传成功后立即返回，大模型在后台异步提取，状态变为「成功」后可在详情页对比并批量确认导入。
        </p>
        <div className="workspace-fusion-similar-match-row">
          <span className="workspace-fusion-similar-match-label">查询相似档案时使用的属性：</span>
          <Checkbox.Group
            options={SIMILAR_MATCH_FIELD_OPTIONS.map((o) => ({ label: o.label, value: o.key }))}
            value={similarMatchFields}
            onChange={(vals) => setSimilarMatchFields((vals as string[]).slice())}
            className="workspace-fusion-similar-match-checkboxes"
          />
        </div>
        <div className="workspace-fusion-upload-box">
          <Upload.Dragger
            accept=".doc,.docx,.xls,.xlsx,.csv,.pdf"
            multiple
            fileList={fileList}
            onChange={({ fileList: next }) => setFileList(next)}
            beforeUpload={() => false}
            showUploadList={{ showPreviewIcon: false, showRemoveIcon: true, showDownloadIcon: false }}
            disabled={uploading}
            className="workspace-fusion-dragger"
          >
            <div className="workspace-fusion-dragger-inner">
              <UploadOutlined className="workspace-fusion-dragger-icon" />
              <p className="workspace-fusion-dragger-text">点击或拖拽多个文件到此区域上传</p>
              <p className="workspace-fusion-dragger-hint">支持 Word(.doc/.docx)、Excel(.xls/.xlsx)、CSV、PDF</p>
              {fileList.length > 0 && <p className="workspace-fusion-dragger-count">已选 {fileList.length} 个文件，点击下方「开始上传」提交</p>}
            </div>
          </Upload.Dragger>
          {fileList.length > 0 && (
            <div className="workspace-fusion-upload-actions">
              <Button type="primary" icon={<UploadOutlined />} loading={uploading} onClick={handleBatchUpload} size="large" className="workspace-fusion-upload-btn">
                开始上传（{fileList.length}）
              </Button>
              <Button type="default" disabled={uploading} onClick={() => setFileList([])}>清空列表</Button>
            </div>
          )}
        </div>
        <div className="workspace-fusion-table-wrap">
          <div className="workspace-fusion-table-header">
            <span>任务列表</span>
            {taskTotal > 0 && <span className="workspace-fusion-table-total">共 {taskTotal} 条</span>}
          </div>
          {hasInProgressTasks && <p className="workspace-fusion-progress-hint">有任务正在处理，列表将自动刷新</p>}
          <Table
            rowKey="taskId"
            columns={taskColumns}
            dataSource={taskList}
            loading={taskLoading}
            pagination={{ current: taskPage + 1, pageSize: taskSize, total: taskTotal, showSizeChanger: false, onChange: (page) => setTaskPage(page - 1) }}
            onRow={(record) => ({ onDoubleClick: () => goToDetail(record.taskId) })}
            className="workspace-fusion-table"
          />
        </div>
      </div>
    </>
  );
};

export default WorkspaceFusion;
