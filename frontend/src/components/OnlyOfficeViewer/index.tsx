import { FC, useEffect, useRef, useId } from 'react';
import { Spin } from 'antd';
import type { OnlyOfficePreviewConfigDTO } from '@/types/archiveFusion';
import './index.css';

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        id: string,
        config: {
          document: { url: string; fileType: string; key: string; title: string };
          documentType: string;
          editorConfig?: { mode?: string };
        }
      ) => void;
    };
  }
}

export interface OnlyOfficeViewerProps {
  /** OnlyOffice 预览配置（由 getPreviewConfig 返回的 data） */
  config: OnlyOfficePreviewConfigDTO;
  /** 容器高度，默认 600px */
  height?: string | number;
  /** 加载失败或未启用时的提示 */
  onError?: (message: string) => void;
}

const OnlyOfficeViewer: FC<OnlyOfficeViewerProps> = ({
  config,
  height = '600px',
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);
  const id = useId().replace(/:/g, '-');
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!config.enabled) {
      onError?.('OnlyOffice 预览未启用，请使用下载');
      return;
    }

    const base = (config.documentServerUrl || '').replace(/\/$/, '');
    const scriptUrl = `${base}/web-apps/apps/api/documents/api.js`;

    const initEditor = () => {
      if (!containerRef.current || !window.DocsAPI) return;
      try {
        editorRef.current = new window.DocsAPI.DocEditor(id, {
          document: {
            url: config.documentUrl,
            fileType: config.fileType,
            key: config.documentKey,
            title: config.title,
          },
          documentType: config.documentType,
          editorConfig: { mode: 'view' },
        });
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'OnlyOffice 初始化失败');
      }
    };

    if (window.DocsAPI && scriptLoadedRef.current) {
      initEditor();
      return;
    }

    const existing = document.querySelector(`script[src="${scriptUrl}"]`);
    if (existing) {
      scriptLoadedRef.current = true;
      initEditor();
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      initEditor();
    };
    script.onerror = (e) => {
      console.error(e)
      onError?.('OnlyOffice 脚本加载失败，请确认 OnlyOffice 服务已启动（document-server-url）或使用下载');
    };
    document.head.appendChild(script);

    return () => {
      editorRef.current = null;
    };
  }, [config.documentUrl, config.documentKey, config.fileType, config.title, config.documentType, config.documentServerUrl, config.enabled, id, onError]);

  if (!config.enabled) {
    return (
      <div className="onlyoffice-viewer onlyoffice-viewer-disabled" style={{ height }}>
        预览未启用，请使用「下载」获取文件。
      </div>
    );
  }

  return (
    <div className="onlyoffice-viewer" style={{ height }}>
      <div ref={containerRef} id={id} className="onlyoffice-viewer-placeholder">
        <Spin tip="正在加载文档..." size="large" />
      </div>
      <p className="onlyoffice-viewer-hint">
        若出现「Download failed」：请确认（1）后端已启动且端口与 document-download-base 一致；（2）OnlyOffice 服务端能访问文档地址（Docker 下 Linux 需配置 extra_hosts: host.docker.internal:host-gateway）；（3）任务已关联文件且 SeaweedFS 可访问。可在 OnlyOffice 容器内执行 <code>curl -I &quot;{config.documentUrl}&quot;</code> 验证文档地址是否可达。
      </p>
    </div>
  );
};

export default OnlyOfficeViewer;
