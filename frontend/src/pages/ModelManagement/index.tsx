import { useCallback, useEffect, useState } from 'react';
import { Card, Row, Col, Button, Tag, message, Modal, Form, Input, Pagination, Empty } from 'antd';
import { SyncOutlined, TeamOutlined } from '@ant-design/icons';
import { modelAPI, type PredictionModelDTO } from '@/services/api';
import { formatDateTime } from '@/utils/date';
import PersonCard, { type PersonCardData } from '@/components/PersonCard';
import { PageCardGridSkeleton } from '@/components/SkeletonPresets';
import './index.css';

type ModelStatusDisplay = 'running' | 'paused';
const statusMap: Record<string, ModelStatusDisplay> = {
  RUNNING: 'running',
  PAUSED: 'paused',
};

const unwrap = <T,>(res: unknown): T => {
  if (res != null && typeof res === 'object' && 'data' in res) return (res as { data: T }).data;
  return res as T;
};

const ModelManagement: React.FC = () => {
  const [models, setModels] = useState<PredictionModelDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingModel, setEditingModel] = useState<PredictionModelDTO | null>(null);
  const [ruleViewVisible, setRuleViewVisible] = useState(false);
  const [ruleEditVisible, setRuleEditVisible] = useState(false);
  const [ruleModel, setRuleModel] = useState<PredictionModelDTO | null>(null);
  const [ruleConfigText, setRuleConfigText] = useState('');
  const [form] = Form.useForm();
  const [ruleForm] = Form.useForm();
  /** 查看命中人员弹窗 */
  const [lockedModalModel, setLockedModalModel] = useState<PredictionModelDTO | null>(null);
  const [lockedList, setLockedList] = useState<PersonCardData[]>([]);
  const [lockedLoading, setLockedLoading] = useState(false);
  const [lockedPage, setLockedPage] = useState(0);
  const [lockedSize] = useState(12);
  const [lockedTotal, setLockedTotal] = useState(0);

  const fetchList = useCallback(() => {
    setLoading(true);
    modelAPI
      .list()
      .then((res) => {
        const list = unwrap<PredictionModelDTO[]>(res);
        setModels(Array.isArray(list) ? list : []);
      })
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleCreate = () => {
    form.resetFields();
    setCreateVisible(true);
  };

  const handleCreateOk = () => {
    form.validateFields().then((values) => {
      modelAPI
        .create({
          name: values.name?.trim(),
          description: values.description?.trim() || undefined,
          ruleConfig: values.ruleConfig?.trim() || undefined,
          accuracy: values.accuracy?.trim() || undefined,
          lockedCount: values.lockedCount != null ? Number(values.lockedCount) : undefined,
        })
        .then((res) => {
          unwrap<PredictionModelDTO>(res);
          message.success('创建成功');
          setCreateVisible(false);
          fetchList();
        })
        .catch(() => message.error('创建失败'));
    });
  };

  const handleEdit = (model: PredictionModelDTO) => {
    setEditingModel(model);
    form.setFieldsValue({
      name: model.name,
      description: model.description ?? '',
      ruleConfig: model.ruleConfig ?? '',
      accuracy: model.accuracy ?? '',
      lockedCount: model.lockedCount ?? 0,
    });
    setEditVisible(true);
  };

  const handleEditOk = () => {
    if (!editingModel) return;
    form.validateFields().then((values) => {
      modelAPI
        .update(editingModel.modelId, {
          name: values.name?.trim(),
          description: values.description?.trim() || undefined,
          ruleConfig: values.ruleConfig?.trim() || undefined,
          accuracy: values.accuracy?.trim() || undefined,
          lockedCount: values.lockedCount != null ? Number(values.lockedCount) : undefined,
        })
        .then(() => {
          message.success('保存成功');
          setEditVisible(false);
          setEditingModel(null);
          fetchList();
        })
        .catch(() => message.error('保存失败'));
    });
  };

  const handleViewRule = (model: PredictionModelDTO) => {
    setRuleModel(model);
    setRuleConfigText(model.ruleConfig ?? '');
    setRuleViewVisible(true);
  };

  const handleViewLockedPersons = useCallback((model: PredictionModelDTO) => {
    setLockedModalModel(model);
    setLockedPage(0);
    setLockedList([]);
    setLockedTotal(0);
  }, []);

  const fetchLockedPersons = useCallback(() => {
    if (!lockedModalModel) return;
    setLockedLoading(true);
    modelAPI
      .getLockedPersons(lockedModalModel.modelId, lockedPage, lockedSize)
      .then((res: unknown) => {
        const raw = res != null && typeof res === 'object' && 'data' in res ? (res as { data?: unknown }).data : res;
        const data = raw && typeof raw === 'object' && raw !== null ? raw as { content?: unknown[]; totalElements?: number } : null;
        setLockedList(Array.isArray(data?.content) ? (data.content as PersonCardData[]) : []);
        setLockedTotal(typeof data?.totalElements === 'number' ? data.totalElements : 0);
      })
      .catch(() => {
        setLockedList([]);
        setLockedTotal(0);
      })
      .finally(() => setLockedLoading(false));
  }, [lockedModalModel, lockedPage, lockedSize]);

  useEffect(() => {
    if (lockedModalModel) fetchLockedPersons();
  }, [lockedModalModel, fetchLockedPersons]);

  const handleEditRule = (model: PredictionModelDTO) => {
    setRuleModel(model);
    setRuleConfigText(model.ruleConfig ?? '');
    ruleForm.setFieldsValue({ ruleConfig: model.ruleConfig ?? '' });
    setRuleEditVisible(true);
  };

  const handleRuleEditOk = () => {
    if (!ruleModel) return;
    ruleForm.validateFields().then((values) => {
      const text = values.ruleConfig?.trim() ?? '';
      modelAPI
        .updateRuleConfig(ruleModel.modelId, text)
        .then(() => {
          message.success('规则配置已保存');
          setRuleEditVisible(false);
          setRuleModel(null);
          fetchList();
        })
        .catch(() => message.error('保存失败'));
    });
  };

  const handlePauseOrStart = (model: PredictionModelDTO) => {
    const isRunning = model.status === 'RUNNING';
    const api = isRunning ? modelAPI.pause(model.modelId) : modelAPI.start(model.modelId);
    api
      .then(() => {
        message.success(isRunning ? '已暂停' : '已启动');
        fetchList();
      })
      .catch(() => message.error('操作失败'));
  };

  const handleDelete = (model: PredictionModelDTO) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除模型「${model.name}」吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () =>
        modelAPI
          .delete(model.modelId)
          .then(() => {
            message.success('已删除');
            fetchList();
          })
          .catch(() => message.error('删除失败')),
    });
  };

  const displayStatus = (status: string): ModelStatusDisplay => statusMap[status] ?? 'paused';
  const updatedAtStr = (m: PredictionModelDTO) =>
    m.updatedTime ? formatDateTime(m.updatedTime) : '';

  return (
    <div className="page-wrapper model-management-page">
      <p className="model-management-desc">
        通过建模的方式锁定关键人群，创建和管理预测模型。规则为语义规则（自然语言），启动后将根据语义规则自动调用大模型匹配人物档案，锁定人数将更新。
      </p>

      {loading ? (
        <div className="model-management-loading">
          <PageCardGridSkeleton title count={6} />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]} className="model-management-cards">
            {models.map((model) => {
              const statusDisplay = displayStatus(model.status);
              return (
                <Col xs={24} md={12} key={model.modelId}>
                  <Card className="model-management-card">
                    <div className="model-management-card-head">
                      <span className="model-management-card-title">{model.name}</span>
                      <Tag
                        className={`model-management-card-status model-management-card-status-${statusDisplay}`}
                      >
                        {statusDisplay === 'running' ? '运行中' : '已暂停'}
                      </Tag>
                    </div>
                    <p className="model-management-card-desc">
                      {model.description || '暂无描述'}
                    </p>
                    <div className="model-management-card-metrics">
                      <div className="model-management-card-metric">
                        <span className="model-management-card-metric-label">锁定人数:</span>
                        <span className="model-management-card-metric-value">
                          {model.lockedCount ?? 0}
                        </span>
                      </div>
                      <div className="model-management-card-metric">
                        <span className="model-management-card-metric-label">准确率:</span>
                        <span className="model-management-card-metric-value">
                          {model.accuracy ?? '-'}
                        </span>
                      </div>
                      <div className="model-management-card-metric">
                        <span className="model-management-card-metric-label">更新时间:</span>
                        <span className="model-management-card-metric-value">
                          {updatedAtStr(model)}
                        </span>
                      </div>
                    </div>
                    <div className="model-management-card-actions">
                      {(model.lockedCount ?? 0) > 0 && (
                        <Button
                          type="primary"
                          size="small"
                          className="model-management-card-btn"
                          icon={<TeamOutlined />}
                          onClick={() => handleViewLockedPersons(model)}
                        >
                          查看命中人员
                        </Button>
                      )}
                      <Button
                        type="default"
                        size="small"
                        className="model-management-card-btn"
                        onClick={() => handleViewRule(model)}
                      >
                        查看语义规则
                      </Button>
                      <Button
                        type="default"
                        size="small"
                        className="model-management-card-btn"
                        onClick={() => handleEditRule(model)}
                      >
                        编辑语义规则
                      </Button>
                      <Button
                        type="default"
                        size="small"
                        className="model-management-card-btn"
                        onClick={() => handlePauseOrStart(model)}
                      >
                        {statusDisplay === 'running' ? '暂停' : '启动'}
                      </Button>
                      <Button
                        type="default"
                        size="small"
                        className="model-management-card-btn"
                        onClick={() => handleEdit(model)}
                      >
                        编辑
                      </Button>
                      <Button
                        type="primary"
                        size="small"
                        danger
                        className="model-management-card-btn-delete"
                        onClick={() => handleDelete(model)}
                      >
                        删除
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <div className="model-management-create-wrap">
            <Button
              type="primary"
              size="large"
              className="model-management-create-btn"
              onClick={handleCreate}
            >
              + 创建新模型
            </Button>
          </div>
        </>
      )}

      <div className="model-management-float-btns">
        <button
          type="button"
          className="model-management-float-btn"
          title="刷新"
          onClick={() => fetchList()}
        >
          <SyncOutlined />
        </button>
      </div>

      {/* 创建模型弹窗 */}
      <Modal
        title="创建新模型"
        open={createVisible}
        onOk={handleCreateOk}
        onCancel={() => setCreateVisible(false)}
        okText="创建"
        cancelText="取消"
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" className="model-management-form">
          <Form.Item name="name" label="模型名称" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input placeholder="请输入模型名称" maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="description" label="模型描述">
            <Input.TextArea placeholder="请输入模型描述" rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="ruleConfig" label="语义规则（自然语言）">
            <Input.TextArea
              placeholder="例如：满足年龄大于20岁，并且具有高消费标签的所有人群"
              rows={4}
            />
          </Form.Item>
          <Form.Item name="accuracy" label="准确率">
            <Input placeholder="例如：92.5%" maxLength={50} />
          </Form.Item>
          <Form.Item name="lockedCount" label="锁定人数" initialValue={0}>
            <Input type="number" min={0} placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑模型弹窗 */}
      <Modal
        title="编辑模型"
        open={editVisible}
        onOk={handleEditOk}
        onCancel={() => { setEditVisible(false); setEditingModel(null); }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" className="model-management-form">
          <Form.Item name="name" label="模型名称" rules={[{ required: true, message: '请输入模型名称' }]}>
            <Input placeholder="请输入模型名称" maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="description" label="模型描述">
            <Input.TextArea placeholder="请输入模型描述" rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="ruleConfig" label="语义规则（自然语言）">
            <Input.TextArea
              placeholder="例如：满足年龄大于20岁，并且具有高消费标签的所有人群"
              rows={4}
            />
          </Form.Item>
          <Form.Item name="accuracy" label="准确率">
            <Input placeholder="例如：92.5%" maxLength={50} />
          </Form.Item>
          <Form.Item name="lockedCount" label="锁定人数">
            <Input type="number" min={0} placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看语义规则弹窗 */}
      <Modal
        title={`查看语义规则 - ${ruleModel?.name ?? ''}`}
        open={ruleViewVisible}
        onCancel={() => { setRuleViewVisible(false); setRuleModel(null); }}
        footer={[
          <Button key="close" onClick={() => { setRuleViewVisible(false); setRuleModel(null); }}>
            关闭
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setRuleViewVisible(false);
              if (ruleModel) handleEditRule(ruleModel);
            }}
          >
            编辑语义规则
          </Button>,
        ]}
        width={640}
      >
        <pre className="model-management-rule-preview">
          {ruleConfigText || '暂无语义规则'}
        </pre>
      </Modal>

      {/* 编辑语义规则弹窗 */}
      <Modal
        title={`编辑语义规则 - ${ruleModel?.name ?? ''}`}
        open={ruleEditVisible}
        onOk={handleRuleEditOk}
        onCancel={() => { setRuleEditVisible(false); setRuleModel(null); }}
        okText="保存"
        cancelText="取消"
        destroyOnClose
        width={640}
      >
        <Form form={ruleForm} layout="vertical">
          <Form.Item name="ruleConfig" label="语义规则（自然语言）">
            <Input.TextArea
              rows={6}
              placeholder="例如：满足年龄大于20岁，并且具有高消费标签的所有人群"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看命中人员弹窗 */}
      <Modal
        title={`命中人员 - ${lockedModalModel?.name ?? ''}（共 ${lockedTotal} 人）`}
        open={!!lockedModalModel}
        onCancel={() => setLockedModalModel(null)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {lockedLoading ? (
          <div className="model-management-loading" style={{ minHeight: 200 }}>
            <PageCardGridSkeleton title={false} count={6} />
          </div>
        ) : lockedList.length === 0 ? (
          <Empty description="暂无命中人员" />
        ) : (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              {lockedList.map((person) => (
                <Col xs={24} sm={12} md={8} key={person.personId}>
                  <PersonCard person={person} clickable showActionLink showRemove={false} />
                </Col>
              ))}
            </Row>
            {lockedTotal > lockedSize && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <Pagination
                  current={lockedPage + 1}
                  pageSize={lockedSize}
                  total={lockedTotal}
                  showSizeChanger={false}
                  onChange={(page) => setLockedPage(page - 1)}
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default ModelManagement;
