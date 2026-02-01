import { Card, Form, Input, Switch, Button, message, Spin, Upload, Table, Modal, Select, Popconfirm } from 'antd';
import { SettingOutlined, UploadOutlined, UserOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { systemConfigAPI, sysUserAPI, type SystemConfigDTO, type SysUserDTO, type SysUserCreateDTO } from '@/services/api';
import { formatDateTime } from '@/utils/date';
import './index.css';

const NAV_ITEMS: { key: keyof SystemConfigDTO; label: string }[] = [
  { key: 'navDashboard', label: '首页' },
  { key: 'navPersons', label: '人员档案' },
  { key: 'navKeyPersonLibrary', label: '重点人员库' },
  { key: 'navWorkspace', label: '工作区' },
  { key: 'navModelManagement', label: '模型管理' },
  { key: 'navSituation', label: '态势感知' },
  { key: 'navSystemConfig', label: '系统配置' },
];

const PAGE_FEATURE_ITEMS: { key: keyof SystemConfigDTO; label: string }[] = [
  { key: 'showPersonDetailEdit', label: '人物详情页编辑功能' },
];

const SystemConfigPage = () => {
  const [form] = Form.useForm<SystemConfigDTO>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [userList, setUserList] = useState<SysUserDTO[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [addUserSubmitting, setAddUserSubmitting] = useState(false);
  const [addUserForm] = Form.useForm<SysUserCreateDTO>();

  const fetchUserList = useCallback(() => {
    setUserListLoading(true);
    sysUserAPI
      .list()
      .then((res: unknown) => {
        const data = res && typeof res === 'object' && 'data' in res ? (res as { data?: SysUserDTO[] }).data : res as SysUserDTO[];
        setUserList(Array.isArray(data) ? data : []);
      })
      .catch(() => message.error('加载用户列表失败'))
      .finally(() => setUserListLoading(false));
  }, []);

  useEffect(() => {
    fetchUserList();
  }, [fetchUserList]);

  const handleLogoUpload = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setLogoUploading(true);
    systemConfigAPI
      .uploadLogo(formData)
      .then((res: { data?: { logoUrl?: string } }) => {
        const url = res?.data?.logoUrl ?? (res as { logoUrl?: string })?.logoUrl;
        if (url) {
          form.setFieldValue('systemLogoUrl', url);
          message.success('Logo 上传成功，请保存配置');
        } else {
          message.error('上传成功但未返回 URL');
        }
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        message.error(err?.response?.data?.message ?? 'Logo 上传失败');
      })
      .finally(() => setLogoUploading(false));
    return false;
  };

  useEffect(() => {
    setLoading(true);
    systemConfigAPI
      .getConfig()
      .then((res: { data?: SystemConfigDTO }) => {
        const data = res?.data ?? res;
        if (data && typeof data === 'object') {
          form.setFieldsValue({
            // @ts-ignore
            systemName: data.systemName ?? '重点人员档案监测系统',
            // @ts-ignore
            systemLogoUrl: data.systemLogoUrl ?? '',
            // @ts-ignore
            frontendBaseUrl: data.frontendBaseUrl ?? '/',
            // @ts-ignore
            navDashboard: data.navDashboard !== false,
            // @ts-ignore
            navPersons: data.navPersons !== false,
            // @ts-ignore
            navKeyPersonLibrary: data.navKeyPersonLibrary !== false,
            // @ts-ignore
            navWorkspace: data.navWorkspace !== false,
            // @ts-ignore
            navModelManagement: data.navModelManagement !== false,
            // @ts-ignore
            navSituation: data.navSituation !== false,
            // @ts-ignore
            navSystemConfig: data.navSystemConfig !== false,
            // @ts-ignore
            showPersonDetailEdit: data.showPersonDetailEdit !== false,
          });
        }
      })
      .catch(() => message.error('加载配置失败'))
      .finally(() => setLoading(false));
  }, [form]);

  const onFinish = (values: SystemConfigDTO) => {
    setSaving(true);
    systemConfigAPI
      .updateConfig(values)
      .then(() => {
        message.success('保存成功，刷新页面后导航与系统名称将生效');
        window.dispatchEvent(new CustomEvent('system-config-updated'));
      })
      .catch(() => message.error('保存失败'))
      .finally(() => setSaving(false));
  };

  const onAddUserFinish = (values: SysUserCreateDTO) => {
    setAddUserSubmitting(true);
    sysUserAPI
      .create(values)
      .then(() => {
        message.success('新增用户成功');
        addUserForm.resetFields();
        setAddUserModalOpen(false);
        fetchUserList();
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        message.error(err?.response?.data?.message ?? '新增用户失败');
      })
      .finally(() => setAddUserSubmitting(false));
  };

  const onDeleteUser = (userId: number) => {
    sysUserAPI
      .delete(userId)
      .then(() => {
        message.success('删除成功');
        fetchUserList();
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        message.error(err?.response?.data?.message ?? '删除失败');
      });
  };

  if (loading) {
    return (
      <div className="page-wrapper system-config-page">
        <div className="system-config-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper system-config-page">
      <Card
        title={
          <span>
            <SettingOutlined style={{ marginRight: 8 }} />
            系统配置
          </span>
        }
        className="system-config-card"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            systemName: '重点人员档案监测系统',
            systemLogoUrl: '',
            frontendBaseUrl: '/',
            navDashboard: true,
            navPersons: true,
            navKeyPersonLibrary: true,
            navWorkspace: true,
            navModelManagement: true,
            navSituation: true,
            navSystemConfig: true,
            showPersonDetailEdit: true,
          }}
        >
          <Form.Item
            label="系统名称"
            name="systemName"
            rules={[{ required: true, message: '请输入系统名称' }]}
          >
            <Input placeholder="如：重点人员档案监测系统" maxLength={100} showCount />
          </Form.Item>
          <Form.Item label="系统 Logo" extra="上传图片将存储到 SeaweedFS，或直接填写图片 URL">
            <div className="system-config-logo-row">
              <Upload
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleLogoUpload(file);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} loading={logoUploading}>
                  上传 Logo
                </Button>
              </Upload>
              <Form.Item name="systemLogoUrl" noStyle>
                <Input
                  placeholder="上传后自动填充，或手动填写图片 URL"
                  maxLength={500}
                  className="system-config-logo-input"
                />
              </Form.Item>
            </div>
          </Form.Item>
          <Form.Item
            label="前端统一 base URL 路径"
            name="frontendBaseUrl"
            extra="部署子路径时填写，如 /app/；根路径填 /"
          >
            <Input placeholder="/ 或 /app/" maxLength={200} />
          </Form.Item>
          <Form.Item label="导航与核心板块显示">
            <div className="system-config-nav-switches">
              {NAV_ITEMS.map(({ key, label }) => (
                <div key={key} className="system-config-nav-row">
                  <span className="system-config-nav-label">{label}</span>
                  <Form.Item name={key} valuePropName="checked" noStyle>
                    <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
                  </Form.Item>
                </div>
              ))}
            </div>
          </Form.Item>
          <Form.Item label="页面功能开关">
            <div className="system-config-nav-switches">
              {PAGE_FEATURE_ITEMS.map(({ key, label }) => (
                <div key={key} className="system-config-nav-row">
                  <span className="system-config-nav-label">{label}</span>
                  <Form.Item name={key} valuePropName="checked" noStyle>
                    <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
                  </Form.Item>
                </div>
              ))}
            </div>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <span>
            <UserOutlined style={{ marginRight: 8 }} />
            用户管理
          </span>
        }
        className="system-config-card system-config-users-card"
        style={{ marginTop: 16 }}
      >
        <div className="system-config-users-toolbar">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddUserModalOpen(true)}>
            新增用户
          </Button>
        </div>
        <Table<SysUserDTO>
          rowKey="userId"
          loading={userListLoading}
          dataSource={userList}
          pagination={false}
          size="small"
          columns={[
            { title: '用户名', dataIndex: 'username', key: 'username', width: 160 },
            {
              title: '角色',
              dataIndex: 'role',
              key: 'role',
              width: 100,
              render: (role: string) => (role === 'admin' ? '管理员' : '普通用户'),
            },
            {
              title: '创建时间',
              dataIndex: 'createdTime',
              key: 'createdTime',
              render: (t: string) => (t ? formatDateTime(t, '') : '—'),
            },
            {
              title: '操作',
              key: 'action',
              width: 100,
              render: (_, record) => (
                <Popconfirm
                  title="确定删除该用户？"
                  onConfirm={() => onDeleteUser(record.userId)}
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="新增用户"
        open={addUserModalOpen}
        onCancel={() => { setAddUserModalOpen(false); addUserForm.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={addUserForm}
          layout="vertical"
          onFinish={onAddUserFinish}
          initialValues={{ role: 'user' }}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }, { min: 2, max: 64, message: '长度 2-64 位' }]}
          >
            <Input placeholder="登录用户名" maxLength={64} />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }, { min: 6, max: 32, message: '长度 6-32 位' }]}
          >
            <Input.Password placeholder="6-32 位" maxLength={32} />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'admin', label: '管理员' },
                { value: 'user', label: '普通用户' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={addUserSubmitting} style={{ marginRight: 8 }}>
              确定
            </Button>
            <Button onClick={() => { setAddUserModalOpen(false); addUserForm.resetFields(); }}>
              取消
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemConfigPage;
