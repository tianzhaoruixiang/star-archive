import React, { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import {
  Button,
  Input,
  Upload,
  message,
  Modal,
  Popconfirm,
  Spin,
  Tooltip,
  Tag,
  List,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileTextOutlined,
  MenuOutlined,
  RobotOutlined,
  UserOutlined,
  SendOutlined,
  EditOutlined,
  StarOutlined,
  SettingOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { smartQAAPI } from '@/services/api';
import type {
  KnowledgeBaseDTO,
  QaDocumentDTO,
  QaSessionDTO,
  QaMessageDTO,
} from '@/services/api';
import { formatDateTime } from '@/utils/date';
import './index.css';

const DOC_STATUS_MAP: Record<string, { color: string; text: string }> = {
  PENDING: { color: 'default', text: '待处理' },
  PARSING: { color: 'processing', text: '解析中' },
  EMBEDDING: { color: 'processing', text: '嵌入中' },
  READY: { color: 'success', text: '就绪' },
  FAILED: { color: 'error', text: '失败' },
};

const unwrap = <T,>(res: unknown): T | undefined => {
  const o = res as { data?: T };
  return o?.data;
};

const SmartQA: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [kbList, setKbList] = useState<KnowledgeBaseDTO[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [docList, setDocList] = useState<QaDocumentDTO[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [sessionList, setSessionList] = useState<QaSessionDTO[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<QaMessageDTO[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [createKbModalOpen, setCreateKbModalOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [createKbSubmitting, setCreateKbSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadKbList = useCallback(async () => {
    setKbLoading(true);
    try {
      const res = await smartQAAPI.listKnowledgeBases();
      const list = unwrap<KnowledgeBaseDTO[]>(res) ?? [];
      setKbList(Array.isArray(list) ? list : []);
    } catch {
      message.error('加载知识库失败');
    } finally {
      setKbLoading(false);
    }
  }, []);

  const loadDocList = useCallback(async () => {
    if (!selectedKbId) {
      setDocList([]);
      return;
    }
    setDocLoading(true);
    try {
      const res = await smartQAAPI.listDocuments(selectedKbId);
      const list = unwrap<QaDocumentDTO[]>(res) ?? [];
      setDocList(Array.isArray(list) ? list : []);
    } catch {
      message.error('加载文档列表失败');
    } finally {
      setDocLoading(false);
    }
  }, [selectedKbId]);

  const loadSessionList = useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = selectedKbId
        ? await smartQAAPI.listSessionsByKb(selectedKbId)
        : await smartQAAPI.listSessions();
      const list = unwrap<QaSessionDTO[]>(res) ?? [];
      setSessionList(Array.isArray(list) ? list : []);
    } catch {
      message.error('加载会话列表失败');
    } finally {
      setSessionLoading(false);
    }
  }, [selectedKbId]);

  const loadMessages = useCallback(async () => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }
    setMessagesLoading(true);
    try {
      const res = await smartQAAPI.listMessages(selectedSessionId);
      const list = unwrap<QaMessageDTO[]>(res) ?? [];
      setMessages(Array.isArray(list) ? list : []);
    } catch {
      message.error('加载消息失败');
    } finally {
      setMessagesLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    loadKbList();
  }, [loadKbList]);

  useEffect(() => {
    loadDocList();
  }, [loadDocList]);

  useEffect(() => {
    loadSessionList();
  }, [loadSessionList]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleCreateKb = useCallback(async () => {
    const name = newKbName?.trim() || '未命名知识库';
    setCreateKbSubmitting(true);
    try {
      await smartQAAPI.createKnowledgeBase({ name });
      message.success('知识库已创建');
      setCreateKbModalOpen(false);
      setNewKbName('');
      loadKbList();
    } catch {
      message.error('创建失败');
    } finally {
      setCreateKbSubmitting(false);
    }
  }, [newKbName, loadKbList]);

  const handleDeleteKb = useCallback(
    async (id: string) => {
      try {
        await smartQAAPI.deleteKnowledgeBase(id);
        message.success('已删除');
        if (selectedKbId === id) setSelectedKbId(null);
        loadKbList();
      } catch {
        message.error('删除失败');
      }
    },
    [selectedKbId, loadKbList]
  );

  const handleUploadDoc = useCallback(async () => {
    if (!selectedKbId) {
      message.warning('请先选择知识库');
      return;
    }
    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.warning('请选择文件');
      return;
    }
    setUploading(true);
    try {
      await smartQAAPI.uploadDocument(selectedKbId, file as File);
      message.success('文档已上传，正在解析与嵌入');
      setFileList([]);
      loadDocList();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      message.error(err?.response?.data?.message ?? err?.message ?? '上传失败');
    } finally {
      setUploading(false);
    }
  }, [selectedKbId, fileList, loadDocList]);

  const handleDeleteDoc = useCallback(
    async (docId: string) => {
      try {
        await smartQAAPI.deleteDocument(docId);
        message.success('已删除');
        loadDocList();
      } catch {
        message.error('删除失败');
      }
    },
    [loadDocList]
  );

  const handleNewChat = useCallback(async () => {
    if (!selectedKbId) {
      message.warning('请先选择知识库');
      setManageModalOpen(true);
      return;
    }
    try {
      const res = await smartQAAPI.createSession({ kbId: selectedKbId });
      const session = unwrap<QaSessionDTO>(res);
      if (session?.id) {
        setSelectedSessionId(session.id);
        loadSessionList();
        setMessages([]);
        inputRef.current?.focus();
      }
    } catch {
      message.error('创建会话失败');
    }
  }, [selectedKbId, loadSessionList]);

  const handleSelectSession = useCallback((id: string) => {
    setSelectedSessionId(id);
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string) => {
      try {
        await smartQAAPI.deleteSession(id);
        message.success('已删除');
        if (selectedSessionId === id) {
          setSelectedSessionId(sessionList.filter((s) => s.id !== id)[0]?.id ?? null);
          setMessages([]);
        }
        loadSessionList();
      } catch {
        message.error('删除失败');
      }
    },
    [selectedSessionId, sessionList, loadSessionList]
  );

  const handleNewChatReturn = useCallback(async (): Promise<string | null> => {
    if (!selectedKbId) return null;
    try {
      const res = await smartQAAPI.createSession({ kbId: selectedKbId });
      const session = unwrap<QaSessionDTO>(res);
      if (session?.id) {
        setSelectedSessionId(session.id);
        loadSessionList();
        setMessages([]);
        return session.id;
      }
    } catch {
      message.error('创建会话失败');
    }
    return null;
  }, [selectedKbId, loadSessionList]);

  const handleSend = useCallback(async () => {
    const content = inputValue?.trim();
    if (!content) return;
    let sessionId = selectedSessionId;
    if (!sessionId && selectedKbId) {
      sessionId = await handleNewChatReturn();
      if (!sessionId) return;
    }
    if (!sessionId) {
      message.warning('请先选择知识库并新建对话');
      return;
    }
    setInputValue('');
    setMessages((prev) => [
      ...prev,
      { id: '', sessionId, role: 'user', content, createdTime: '' },
      { id: '', sessionId, role: 'assistant', content: '', createdTime: '' },
    ]);
    setSending(true);
    try {
      await smartQAAPI.chatStream(
        { sessionId, content },
        (chunk) => {
          flushSync(() => {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === 'assistant') {
                next[next.length - 1] = { ...last, content: last.content + chunk };
              }
              return next;
            });
          });
        },
        (messageId) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              next[next.length - 1] = { ...last, id: messageId };
            }
            return next;
          });
        }
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err?.message ?? '发送失败');
      setMessages((prev) => (prev.length >= 2 ? prev.slice(0, -2) : prev));
      setInputValue(content);
    } finally {
      setSending(false);
    }
  }, [inputValue, selectedSessionId, selectedKbId, handleNewChatReturn]);

  const selectedKb = kbList.find((k) => k.id === selectedKbId);
  const selectedSession = sessionList.find((s) => s.id === selectedSessionId);

  useEffect(() => {
    if (manageModalOpen && selectedKbId) loadDocList();
  }, [manageModalOpen, selectedKbId, loadDocList]);

  const showWelcome = !selectedSessionId && messages.length === 0;
  const suggestionCards = [
    { icon: <SearchOutlined />, title: '基于知识库问答', desc: '根据已上传文档回答问题' },
    { icon: <FileTextOutlined />, title: '上传文档', desc: '将 PDF、Word 等加入知识库' },
    { icon: <AppstoreOutlined />, title: '管理知识库', desc: '新建、切换或删除知识库' },
    { icon: <ThunderboltOutlined />, title: '新建对话', desc: '发起新一轮对话' },
  ];

  return (
    <div className="smart-qa-page smart-qa-gemini">
      {/* 左侧边栏 - Gemini 式：顶栏 + 发起新对话 + 我的内容 + 对话列表 + 底部设置 */}
      <aside className={`smart-qa-sidebar ${sidebarCollapsed ? 'smart-qa-sidebar-collapsed' : ''}`}>
        <div className="smart-qa-sidebar-header">
          <Button
            type="text"
            icon={<MenuOutlined />}
            className="smart-qa-sidebar-menu-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          {!sidebarCollapsed && <span className="smart-qa-sidebar-logo">智能问答</span>}
        </div>
        <div className="smart-qa-sidebar-new-row">
          <Button
            type="text"
            icon={<EditOutlined />}
            className="smart-qa-new-chat-btn"
            onClick={handleNewChat}
          >
            {sidebarCollapsed ? '' : '发起新对话'}
          </Button>
          {!sidebarCollapsed && (
            <Tooltip title="新建对话">
              <Button type="text" size="small" icon={<PlusOutlined />} className="smart-qa-sidebar-new-icon" onClick={handleNewChat} />
            </Tooltip>
          )}
        </div>
        {!sidebarCollapsed && (
          <>
            <div className="smart-qa-sidebar-content-entry">
              <Button type="text" icon={<StarOutlined />} className="smart-qa-my-content-btn" onClick={() => setManageModalOpen(true)}>
                我的内容
              </Button>
            </div>
            <div className="smart-qa-sidebar-section">
              <div className="smart-qa-sidebar-section-title">对话</div>
              <div className="smart-qa-sessions">
                {sessionLoading ? (
                  <div className="smart-qa-loading"><Spin size="small" /></div>
                ) : (
                  sessionList.map((s) => (
                    <div
                      key={s.id}
                      className={`smart-qa-session-item ${selectedSessionId === s.id ? 'smart-qa-session-item-active' : ''}`}
                      onClick={() => handleSelectSession(s.id)}
                    >
                      <span className="smart-qa-session-title">{s.title || '新会话'}</span>
                      <Popconfirm title="确定删除该会话？" onConfirm={() => handleDeleteSession(s.id)}>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className="smart-qa-session-delete"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
        <div className="smart-qa-sidebar-footer">
          <Button type="text" icon={<SettingOutlined />} className="smart-qa-settings-btn" onClick={() => setManageModalOpen(true)}>
            {sidebarCollapsed ? '' : '设置和帮助'}
          </Button>
        </div>
      </aside>

      <main className="smart-qa-main">
        {/* 主区顶栏：Logo + 当前会话标题 + 右侧预留 */}
        <header className="smart-qa-main-header">
          <span className="smart-qa-main-logo">智能问答</span>
          <span className="smart-qa-main-title">{selectedSession?.title || '新会话'}</span>
          <div className="smart-qa-main-header-right" />
        </header>

        {showWelcome ? (
          <div className="smart-qa-welcome">
            <div className="smart-qa-welcome-block">
              <div className="smart-qa-welcome-avatar">
                <RobotOutlined />
              </div>
              <div className="smart-qa-welcome-text">
                <p className="smart-qa-welcome-greeting">你好！很高兴见到你。我是基于知识库的智能问答助手。</p>
                <p className="smart-qa-welcome-sub">我可以为你做这些：</p>
              </div>
            </div>
            <div className="smart-qa-welcome-cards">
              {suggestionCards.map((card, i) => (
                <button
                  key={i}
                  type="button"
                  className="smart-qa-welcome-card"
                  onClick={() => {
                    if (i === 0) inputRef.current?.focus();
                    else if (i === 1 || i === 2) setManageModalOpen(true);
                    else if (i === 3) handleNewChat();
                  }}
                >
                  <span className="smart-qa-welcome-card-icon">{card.icon}</span>
                  <span className="smart-qa-welcome-card-title">{card.title}</span>
                  <span className="smart-qa-welcome-card-desc">{card.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="smart-qa-messages-wrap">
            {messagesLoading ? (
              <div className="smart-qa-loading-center"><Spin /></div>
            ) : (
              messages.map((m) => (
                <div key={m.id || `${m.role}-${m.content?.slice(0, 30)}`} className={`smart-qa-message smart-qa-message-${m.role}`}>
                  <div className="smart-qa-message-avatar">
                    {m.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  </div>
                  <div className="smart-qa-message-body">
                    <div className="smart-qa-message-content">
                      {m.role === 'assistant' && m.content ? (
                        <div className="smart-qa-message-content-markdown">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        m.content
                      )}
                    </div>
                    {m.createdTime && (
                      <div className="smart-qa-message-time">{formatDateTime(m.createdTime)}</div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="smart-qa-input-wrap">
          <div className="smart-qa-input-inner">
            <Button type="text" icon={<PlusOutlined />} className="smart-qa-input-left-btn" />
            <Input.TextArea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="问问"
              autoSize={{ minRows: 1, maxRows: 6 }}
              bordered={false}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
              className="smart-qa-input-textarea"
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              disabled={!inputValue?.trim()}
              onClick={handleSend}
              className="smart-qa-send-btn"
            />
          </div>
          <p className="smart-qa-input-hint">智能问答基于所选知识库，回答可能产生错误，请核实重要信息。</p>
        </div>
      </main>

      {/* 知识库与文档管理弹框 */}
      <Modal
        title="知识库与文档"
        open={manageModalOpen}
        onCancel={() => setManageModalOpen(false)}
        footer={
          <Button type="primary" onClick={() => setManageModalOpen(false)}>
            确定
          </Button>
        }
        width={560}
        destroyOnClose
      >
        <div className="smart-qa-manage-modal">
          <div className="smart-qa-manage-section">
            <div className="smart-qa-manage-section-header">
              <span><FolderOutlined /> 知识库</span>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setCreateKbModalOpen(true)}
              >
                新建
              </Button>
            </div>
            {kbLoading ? (
              <div className="smart-qa-manage-loading"><Spin size="small" /></div>
            ) : (
              <List
                size="small"
                dataSource={kbList}
                locale={{ emptyText: '暂无知识库，请点击「新建」' }}
                renderItem={(item) => (
                  <List.Item
                    className={selectedKbId === item.id ? 'smart-qa-manage-kb-active' : ''}
                    onClick={() => setSelectedKbId(item.id)}
                    actions={[
                      <Popconfirm
                        key="del"
                        title="确定删除该知识库？"
                        onConfirm={() => handleDeleteKb(item.id)}
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                      </Popconfirm>,
                    ]}
                  >
                    <span className="smart-qa-manage-kb-name">{item.name}</span>
                  </List.Item>
                )}
              />
            )}
          </div>
          <Divider />
          <div className="smart-qa-manage-section">
            <div className="smart-qa-manage-section-header">
              <span><FileTextOutlined /> 文档管理</span>
            </div>
            {selectedKbId ? (
              <>
                <div className="smart-qa-manage-upload">
                  <Upload
                    fileList={fileList}
                    onChange={({ fileList: fl }) => setFileList(fl)}
                    beforeUpload={() => false}
                    accept=".pdf,.doc,.docx,.txt"
                    maxCount={1}
                    showUploadList={false}
                  >
                    <Button size="small" icon={<UploadOutlined />}>选择文件</Button>
                  </Upload>
                  <Input
                    size="small"
                    readOnly
                    value={fileList[0]?.name ?? ''}
                    placeholder="选择后点击上传"
                    className="smart-qa-manage-upload-input"
                  />
                  <Button
                    type="primary"
                    size="small"
                    loading={uploading}
                    onClick={handleUploadDoc}
                    disabled={!fileList.length}
                  >
                    上传
                  </Button>
                </div>
                {docLoading ? (
                  <div className="smart-qa-manage-loading"><Spin size="small" /></div>
                ) : (
                  <List
                    size="small"
                    dataSource={docList}
                    locale={{ emptyText: '暂无文档，请上传' }}
                    renderItem={(d) => {
                      const st = DOC_STATUS_MAP[d.status ?? ''] ?? { color: 'default', text: d.status };
                      return (
                        <List.Item
                          actions={[
                            <Tag key="st" color={st.color}>{st.text}</Tag>,
                            <Popconfirm key="del" title="确定删除？" onConfirm={() => handleDeleteDoc(d.id)}>
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>,
                          ]}
                        >
                          <span className="smart-qa-manage-doc-name">{d.fileName}</span>
                          {d.errorMessage && (
                            <div className="smart-qa-manage-doc-err">{d.errorMessage}</div>
                          )}
                        </List.Item>
                      );
                    }}
                  />
                )}
              </>
            ) : (
              <p className="smart-qa-manage-hint">请先选择或新建知识库</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        title="新建知识库"
        open={createKbModalOpen}
        onOk={handleCreateKb}
        onCancel={() => { setCreateKbModalOpen(false); setNewKbName(''); }}
        confirmLoading={createKbSubmitting}
        okText="创建"
      >
        <Input
          placeholder="知识库名称"
          value={newKbName}
          onChange={(e) => setNewKbName(e.target.value)}
          onPressEnter={handleCreateKb}
        />
      </Modal>
    </div>
  );
};

export default SmartQA;
