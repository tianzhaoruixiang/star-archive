import { Card, Form, Input, Switch, Button, message, Spin } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { systemConfigAPI, type SystemConfigDTO } from '@/services/api';
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

const SystemConfigPage = () => {
  const [form] = Form.useForm<SystemConfigDTO>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    systemConfigAPI
      .getConfig()
      .then((res: { data?: SystemConfigDTO }) => {
        const data = res?.data ?? res;
        if (data && typeof data === 'object') {
          form.setFieldsValue({
            systemName: data.systemName ?? '重点人员档案监测系统',
            systemLogoUrl: data.systemLogoUrl ?? '',
            frontendBaseUrl: data.frontendBaseUrl ?? '/',
            navDashboard: data.navDashboard !== false,
            navPersons: data.navPersons !== false,
            navKeyPersonLibrary: data.navKeyPersonLibrary !== false,
            navWorkspace: data.navWorkspace !== false,
            navModelManagement: data.navModelManagement !== false,
            navSituation: data.navSituation !== false,
            navSystemConfig: data.navSystemConfig !== false,
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
          }}
        >
          <Form.Item
            label="系统名称"
            name="systemName"
            rules={[{ required: true, message: '请输入系统名称' }]}
          >
            <Input placeholder="如：重点人员档案监测系统" maxLength={100} showCount />
          </Form.Item>
          <Form.Item label="系统 Logo 地址" name="systemLogoUrl">
            <Input placeholder="图片 URL 或相对路径，留空则使用默认图标" maxLength={500} />
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
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SystemConfigPage;
