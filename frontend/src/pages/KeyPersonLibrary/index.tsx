import { useCallback, useEffect, useState } from 'react';
import { Row, Col, Pagination, Empty } from 'antd';
import { TagOutlined } from '@ant-design/icons';
import { personAPI, type TagDTO } from '@/services/api';
import PersonCard, { type PersonCardData } from '@/components/PersonCard';
import { PageCardGridSkeleton, InlineSkeleton } from '@/components/SkeletonPresets';
import './index.css';

const PAGE_SIZE = 16;

const KeyPersonLibrary: React.FC = () => {
  const [keyTags, setKeyTags] = useState<TagDTO[]>([]);
  const [keyTagsLoading, setKeyTagsLoading] = useState(true);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [list, setList] = useState<PersonCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, size: PAGE_SIZE, total: 0 });

  const loadKeyTags = useCallback(async () => {
    setKeyTagsLoading(true);
    try {
      const res = (await personAPI.getTags({ keyTag: true })) as { data?: TagDTO[] };
      const arr = Array.isArray(res?.data) ? res.data : [];
      setKeyTags(arr);
    } finally {
      setKeyTagsLoading(false);
    }
  }, []);

  const loadPersons = useCallback(async () => {
    setLoading(true);
    try {
      const tagsToUse =
        selectedTagNames.length > 0
          ? selectedTagNames
          : keyTags.map((t) => t.tagName);
      if (tagsToUse.length === 0) {
        setList([]);
        setPagination((p) => ({ ...p, total: 0 }));
        return;
      }
      const res = (await personAPI.getPersonListByTags(
        tagsToUse,
        pagination.page - 1,
        pagination.size,
        true
      )) as unknown;
      const raw =
        res && typeof res === 'object' && 'data' in res
          ? (res as { data?: { content?: PersonCardData[]; list?: PersonCardData[]; totalElements?: number; total?: number } }).data
          : (res as { content?: PersonCardData[]; list?: PersonCardData[]; totalElements?: number; total?: number } | undefined);
      const content = raw?.content ?? raw?.list ?? [];
      const total = raw?.totalElements ?? raw?.total ?? 0;
      setList(Array.isArray(content) ? content : []);
      setPagination((p) => ({ ...p, total: Number(total) }));
    } finally {
      setLoading(false);
    }
  }, [keyTags, selectedTagNames, pagination.page, pagination.size]);

  useEffect(() => {
    loadKeyTags();
  }, [loadKeyTags]);

  useEffect(() => {
    loadPersons();
  }, [loadPersons]);

  /** 重点人员标签：仅支持单选；再次点击已选标签则清除筛选 */
  const handleTagClick = useCallback((tagName: string) => {
    setSelectedTagNames((prev) =>
      prev.includes(tagName) ? [] : [tagName]
    );
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedTagNames([]);
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number, size: number) => {
    setPagination((p) => ({ ...p, page, size }));
  }, []);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.size));
  const titleText =
    selectedTagNames.length === 0
      ? '全部重点人员'
      : `已选标签：${selectedTagNames.join('、')}`;

  return (
    <div className="page-wrapper key-person-page">
      <div className="key-person-card">
        <div className="page-header">
          <h1 className="page-header-title">重点人员</h1>
          <p className="page-header-desc">重点人员库 · 重点标签人员</p>
        </div>
        <div className="key-person-body">
        <aside className="key-person-sidebar">
          {keyTagsLoading ? (
            <div className="key-person-sidebar-loading">
              <InlineSkeleton lines={6} />
            </div>
          ) : keyTags.length === 0 ? (
            <div className="key-person-sidebar-empty">
              暂无重点标签，请在「工作区 → 标签管理」中为标签勾选「是否重点标签」。
            </div>
          ) : (
            <>
              {selectedTagNames.length > 0 && (
                <button
                  type="button"
                  className="key-person-sidebar-clear"
                  onClick={handleClearSelection}
                >
                  清除筛选
                </button>
              )}
              <div className="key-person-sidebar-tags-wrap">
                <ul className="key-person-tag-list">
                  {keyTags.map((tag) => (
                  <li
                    key={tag.tagId}
                    role="button"
                    tabIndex={0}
                    className={`key-person-tag-item ${
                      selectedTagNames.includes(tag.tagName) ? 'key-person-tag-item-active' : ''
                    }`}
                    onClick={() => handleTagClick(tag.tagName)}
                    onKeyDown={(e) =>
                      (e.key === 'Enter' || e.key === ' ') && handleTagClick(tag.tagName)
                    }
                  >
                    <span className="key-person-tag-name">{tag.tagName}</span>
                    <span className="key-person-tag-count">
                      {tag.personCount != null ? tag.personCount : '—'}
                    </span>
                  </li>
                ))}
                </ul>
              </div>
            </>
          )}
        </aside>

        <main className="key-person-main">
          <div className="key-person-main-header">
            <span className="key-person-main-title">{titleText}</span>
            <span className="key-person-main-total">{pagination.total} 人</span>
          </div>
          <div className="key-person-pagination-info">
            共 {pagination.total} 条记录，第 {pagination.page}/{totalPages} 页
          </div>

          {loading ? (
            <div className="key-person-loading">
              <PageCardGridSkeleton title={false} count={6} />
            </div>
          ) : list.length === 0 ? (
            <div className="key-person-empty">
              <Empty
                description={
                  keyTags.length === 0
                    ? '请先在工作区标签管理中勾选「是否重点标签」'
                    : '暂无命中重点标签的人员'
                }
              />
            </div>
          ) : (
            <>
              <Row gutter={[16, 16]} className="key-person-grid">
                {list.map((person) => (
                  <Col
                    xs={24}
                    sm={12}
                    lg={6}
                    xl={6}
                    key={person.personId}
                    className="key-person-grid-col"
                  >
                    <PersonCard
                      person={person}
                      clickable
                    />
                  </Col>
                ))}
              </Row>
              <div className="page-pagination key-person-pagination">
                <Pagination
                  current={pagination.page}
                  pageSize={pagination.size}
                  total={pagination.total}
                  onChange={handlePageChange}
                  showSizeChanger
                  pageSizeOptions={[8, 16, 24, 32]}
                  showQuickJumper
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            </>
          )}
        </main>
        </div>
      </div>
    </div>
  );
};

export default KeyPersonLibrary;
