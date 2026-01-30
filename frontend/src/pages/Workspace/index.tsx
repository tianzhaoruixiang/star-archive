import { Tabs, Card, Tree, Button, Upload, Empty, Row, Col, Table, message, Tag } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { PlusOutlined, UploadOutlined, EyeOutlined } from '@ant-design/icons';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { archiveFusionAPI } from '@/services/api';
import type {
  ArchiveImportTaskDTO,
  ArchiveFusionBatchCreateResultDTO,
  PageResponse,
} from '@/types/archiveFusion';
import { useAppSelector } from '@/store/hooks';
import './index.css';

const { TabPane } = Tabs;

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待处理' },
  EXTRACTING: { color: 'processing', text: '提取中' },
  MATCHING: { color: 'processing', text: '匹配中' },
  SUCCESS: { color: 'success', text: '成功' },
  FAILED: { color: 'error', text: '失败' },
};

const Workspace = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth?.user);
  const [activeTab, setActiveTab] = useState('data');
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

  const loadTasks = useCallback(async () => {
    setTaskLoading(true);
    try {
      const res = await archiveFusionAPI.listTasks({
        creatorUserId: user ? undefined : undefined,
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

  const handleBatchUpload = useCallback(async () => {
    const files = fileList
      .map((f) => f.originFileObj)
      .filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      message.warning('请先选择要上传的文件');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (user?.username) formData.append('creatorUsername', user.username);
      const res = await archiveFusionAPI.batchCreateTasks(formData) as {
        data?: ArchiveFusionBatchCreateResultDTO;
        message?: string;
      };
      const data = res?.data ?? res;
      if (data && 'successCount' in data) {
        const { successCount, failedCount, errors } = data;
        if (successCount > 0) {
          message.success(`已创建 ${successCount} 个任务，提取与匹配完成后可查看结果`);
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
      render: (t: string) => (t ? new Date(t).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: unknown, record: ArchiveImportTaskDTO) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => goToDetail(record.taskId)}>
          查看
        </Button>
      ),
    },
  ];

  return (
    <div className="page-wrapper workspace-page">
      <Card title="个人工作区">
        <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k ?? 'data')}>
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
          <TabPane tab="模型管理" key="model">
            <Card>
              <div className="placeholder-block">
                <PlusOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <p>新建模型，通过建模精细化锁定重点人员；运行模型可展示符合条件人员卡片</p>
                <Button type="primary" disabled>新建模型（待对接）</Button>
              </div>
            </Card>
          </TabPane>
          <TabPane tab="档案融合" key="fusion">
            <Card
              title="人员档案导入融合"
              extra={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Upload
                    accept=".doc,.docx,.xls,.xlsx,.csv,.pdf"
                    multiple
                    fileList={fileList}
                    onChange={({ fileList: next }) => setFileList(next)}
                    beforeUpload={() => false}
                    showUploadList={{ showPreviewIcon: false }}
                    disabled={uploading}
                  >
                    <Button icon={<UploadOutlined />}>选择文件</Button>
                  </Upload>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    loading={uploading}
                    disabled={fileList.length === 0}
                    onClick={handleBatchUpload}
                  >
                    批量上传并提取{fileList.length > 0 ? `（${fileList.length}）` : ''}
                  </Button>
                </div>
              }
            >
              <p style={{ color: '#666', marginBottom: 16 }}>
                支持批量选择 Word(.doc/.docx)、Excel(.xls/.xlsx)、CSV、PDF。每个文件创建一个任务，提取完成后可在详情页批量确认导入。
              </p>
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
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Workspace;
