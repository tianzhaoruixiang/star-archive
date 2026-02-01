import { Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { archiveFusionAPI } from '@/services/api';
import type { OnlyOfficePreviewConfigDTO } from '@/types/archiveFusion';
import OnlyOfficeViewer from '@/components/OnlyOfficeViewer';
import './Preview.css';

const WorkspacePreview = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [config, setConfig] = useState<OnlyOfficePreviewConfigDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setConfig(null);
    try {
      const res = (await archiveFusionAPI.getPreviewConfig(id)) as unknown as { data?: OnlyOfficePreviewConfigDTO; message?: string };
      const cfg = res?.data ?? (res as OnlyOfficePreviewConfigDTO);
      if (cfg && typeof (cfg as OnlyOfficePreviewConfigDTO).documentServerUrl === 'string') {
        setConfig(cfg as OnlyOfficePreviewConfigDTO);
      } else {
        setError((res as { message?: string })?.message ?? '无法获取预览配置');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string }; status?: number }; message?: string };
      setError(err?.response?.data?.message ?? err?.response?.status === 404 ? '任务不存在或未关联文件' : '获取预览配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) loadConfig(taskId);
    else setLoading(false);
  }, [taskId, loadConfig]);

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (!taskId) {
    return (
      <div className="workspace-preview-page">
        <div className="workspace-preview-toolbar">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workspace/fusion')}>返回</Button>
        </div>
        <div className="workspace-preview-error">缺少任务 ID</div>
      </div>
    );
  }

  return (
    <div className="workspace-preview-page">
      <div className="workspace-preview-toolbar">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={goBack}>返回</Button>
        <span className="workspace-preview-title">文档预览（OnlyOffice）</span>
      </div>
      {loading && (
        <div className="workspace-preview-loading">
          <Spin size="large" tip="加载预览配置..." />
        </div>
      )}
      {!loading && error && (
        <div className="workspace-preview-error">
          {error}
          <Button type="primary" onClick={() => loadConfig(taskId)} style={{ marginTop: 16 }}>重试</Button>
        </div>
      )}
      {!loading && config && (
        <div className="workspace-preview-viewer">
          <OnlyOfficeViewer config={config} height="calc(100vh - 120px)" onError={(msg) => message.warning(msg)} />
        </div>
      )}
    </div>
  );
};

export default WorkspacePreview;
