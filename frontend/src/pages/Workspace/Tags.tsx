import { Button, Table, message, Form, Input, InputNumber, Popconfirm, Modal, AutoComplete } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { personAPI, type TagDTO, type TagCreateDTO } from '@/services/api';

/** 从标签列表中提取已有的一级、二级分类，供新增时选择并与现有分类合并 */
function useExistingCategories(tagList: TagDTO[]) {
  return useMemo(() => {
    const firstSet = new Set<string>();
    const secondByFirst: Record<string, Set<string>> = {};
    tagList.forEach((t) => {
      const first = (t.firstLevelName ?? '').trim();
      const second = (t.secondLevelName ?? '').trim();
      if (first) firstSet.add(first);
      if (first) {
        if (!secondByFirst[first]) secondByFirst[first] = new Set<string>();
        if (second) secondByFirst[first].add(second);
      }
    });
    const firstLevelOptions = Array.from(firstSet).sort((a, b) => a.localeCompare(b));
    const secondLevelOptionsByFirst: Record<string, string[]> = {};
    Object.keys(secondByFirst).forEach((first) => {
      secondLevelOptionsByFirst[first] = Array.from(secondByFirst[first]).sort((a, b) => a.localeCompare(b));
    });
    return { firstLevelOptions, secondLevelOptionsByFirst };
  }, [tagList]);
}

const WorkspaceTags = () => {
  const [tagList, setTagList] = useState<TagDTO[]>([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [addTagModalOpen, setAddTagModalOpen] = useState(false);
  const [addTagSubmitting, setAddTagSubmitting] = useState(false);
  const [addTagForm] = Form.useForm<TagCreateDTO>();
  const { firstLevelOptions, secondLevelOptionsByFirst } = useExistingCategories(tagList);
  const selectedFirstLevel = Form.useWatch('firstLevelName', addTagForm);
  const secondLevelOptions = useMemo(() => {
    const first = (selectedFirstLevel ?? '').trim();
    if (first && secondLevelOptionsByFirst[first]) return secondLevelOptionsByFirst[first].map((v) => ({ value: v }));
    const allSecond = new Set<string>();
    Object.values(secondLevelOptionsByFirst).forEach((arr) => arr.forEach((s) => allSecond.add(s)));
    return Array.from(allSecond).sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v }));
  }, [selectedFirstLevel, secondLevelOptionsByFirst]);

  const loadTags = useCallback(async () => {
    setTagLoading(true);
    try {
      const res = (await personAPI.getTags()) as { data?: TagDTO[] };
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setTagList(list);
    } catch {
      message.error('加载标签列表失败');
      setTagList([]);
    } finally {
      setTagLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const onAddTagFinish = useCallback(
    async (values: TagCreateDTO) => {
      setAddTagSubmitting(true);
      try {
        await personAPI.createTag(values);
        message.success('新增标签成功');
        addTagForm.resetFields();
        setAddTagModalOpen(false);
        loadTags();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string }; status?: number }; message?: string };
        message.error(err?.response?.data?.message ?? err?.message ?? '新增标签失败');
      } finally {
        setAddTagSubmitting(false);
      }
    },
    [addTagForm, loadTags]
  );

  const onDeleteTag = useCallback(
    async (tagId: number) => {
      try {
        await personAPI.deleteTag(tagId);
        message.success('删除成功');
        loadTags();
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        message.error(err?.response?.data?.message ?? err?.message ?? '删除失败');
      }
    },
    [loadTags]
  );

  return (
    <>
      <div className="workspace-tags">
        <div className="workspace-tags-header">
          <span>人物标签用于人员档案筛选与 person_tags，与人员档案页筛选标签共用同一张表。</span>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddTagModalOpen(true)}>新增标签</Button>
        </div>
        <Table<TagDTO>
          rowKey="tagId"
          loading={tagLoading}
          dataSource={tagList}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          size="small"
          columns={[
            { title: '一级分类', dataIndex: 'firstLevelName', key: 'firstLevelName', width: 120, render: (v: string) => v || '—' },
            { title: '二级分类', dataIndex: 'secondLevelName', key: 'secondLevelName', width: 120, render: (v: string) => v || '—' },
            { title: '标签名称', dataIndex: 'tagName', key: 'tagName', width: 140, ellipsis: true },
            { title: '描述', dataIndex: 'tagDescription', key: 'tagDescription', ellipsis: true, render: (v: string) => v || '—' },
            { title: '关联人数', dataIndex: 'personCount', key: 'personCount', width: 100, render: (v: number) => (v != null ? v : '—') },
            {
              title: '操作',
              key: 'action',
              width: 90,
              render: (_: unknown, record: TagDTO) => (
                <Popconfirm
                  title="确定删除该标签？删除后筛选树中不再展示，已关联该标签的人员档案上标签名仍保留。"
                  onConfirm={() => onDeleteTag(record.tagId)}
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </div>
      <Modal title="新增标签" open={addTagModalOpen} onCancel={() => { setAddTagModalOpen(false); addTagForm.resetFields(); }} footer={null} destroyOnClose>
        <Form form={addTagForm} layout="vertical" onFinish={onAddTagFinish} initialValues={{ firstLevelSortOrder: 999 }}>
          <Form.Item label="一级分类" name="firstLevelName" extra="可选择已有分类与现有合并，或输入新分类名">
            <AutoComplete
              options={firstLevelOptions.map((v) => ({ value: v }))}
              placeholder="如：基本属性、身份属性，可选已有或输入新"
              maxLength={100}
              filterOption={(input, option) => (option?.value ?? '').toString().toLowerCase().includes((input || '').toLowerCase())}
            />
          </Form.Item>
          <Form.Item label="二级分类" name="secondLevelName" extra="可选择该一级下已有二级分类合并，或输入新">
            <AutoComplete
              options={secondLevelOptions}
              placeholder="如：年龄、性别，可为空"
              maxLength={100}
              filterOption={(input, option) => (option?.value ?? '').toString().toLowerCase().includes((input || '').toLowerCase())}
            />
          </Form.Item>
          <Form.Item label="标签名称" name="tagName" rules={[{ required: true, message: '请输入标签名称' }, { max: 255, message: '最多 255 字' }]}>
            <Input placeholder="用于人员档案 person_tags 与筛选" maxLength={255} />
          </Form.Item>
          <Form.Item label="描述" name="tagDescription">
            <Input.TextArea placeholder="可选" rows={2} maxLength={2000} showCount />
          </Form.Item>
          <Form.Item label="一级展示顺序" name="firstLevelSortOrder" extra="数字越小越靠前，如 1基本属性 2身份属性 6异常行为">
            <InputNumber min={1} max={999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={addTagSubmitting} style={{ marginRight: 8 }}>确定</Button>
            <Button onClick={() => { setAddTagModalOpen(false); addTagForm.resetFields(); }}>取消</Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default WorkspaceTags;
