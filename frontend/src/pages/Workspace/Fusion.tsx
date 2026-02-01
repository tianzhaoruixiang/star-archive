import { Card, Button, Upload, Table, message, Tag } from 'antd';
import type { UploadFile } from 'antd';
import { UploadOutlined, EyeOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { archiveFusionAPI } from '@/services/api';
import type { ArchiveImportTaskDTO, PageResponse } from '@/types/archiveFusion';
import { useAppSelector } from '@/store/hooks';
import { formatDateTime } from '@/utils/date';
import { TableSkeleton } from '@/components/SkeletonPresets';

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
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file as Blob));
      if (user?.username) formData.append('creatorUsername', user.username);
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
  }, [fileList, user, loadTasks]);

  const goToDetail = useCallback((id: string) => navigate(`/workspace/fusion/${id}`), [navigate]);
  const handleDownload = useCallback((taskId: string) => {
    window.open(archiveFusionAPI.getFileDownloadUrl(taskId), '_blank');
  }, []);

  const goToPreview = useCallback((taskId: string) => navigate(`/workspace/fusion/${taskId}/preview`), [navigate]);

  const taskColumns = [
    { title: '文件名', dataIndex: 'fileName', key: 'fileName', ellipsis: true, render: (t: string) => t || '-' },
    { title: '类型', dataIndex: 'fileType', key: 'fileType', width: 80 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: (s: string) => <Tag color={STATUS_MAP[s]?.color ?? 'default'}>{STATUS_MAP[s]?.text ?? s}</Tag> },
    { title: '提取人数', dataIndex: 'extractCount', key: 'extractCount', width: 90 },
    { title: '创建时间', dataIndex: 'createdTime', key: 'createdTime', width: 170, render: (t: string) => formatDateTime(t, '-') },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: unknown, record: ArchiveImportTaskDTO) => (
        <span className="workspace-fusion-actions">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => goToDetail(record.taskId)}>查看</Button>
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => goToPreview(record.taskId)}>预览</Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record.taskId)}>下载</Button>
        </span>
      ),
    },
  ];

  return (
    <>
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
