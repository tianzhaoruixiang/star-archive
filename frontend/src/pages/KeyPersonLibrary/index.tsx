import { useCallback, useEffect, useState } from 'react';
import { Row, Col, Pagination, Spin, Empty, message } from 'antd';
import { keyPersonLibraryAPI, type KeyPersonCategory } from '@/services/api';
import PersonCard, { type PersonCardData } from '@/components/PersonCard';
import './index.css';

const PAGE_SIZE = 30;

const KeyPersonLibrary: React.FC = () => {
  const [categories, setCategories] = useState<KeyPersonCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [list, setList] = useState<PersonCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, size: PAGE_SIZE, total: 0 });
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = (await keyPersonLibraryAPI.getCategories()) as { data?: KeyPersonCategory[] };
      const data = res?.data ?? res;
      setCategories(Array.isArray(data) ? data : []);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadPersons = useCallback(async () => {
    if (!selectedCategoryId) return;
    setLoading(true);
    try {
      const res = (await keyPersonLibraryAPI.getPersonsByCategory(
        selectedCategoryId,
        pagination.page - 1,
        pagination.size
      )) as unknown;
      const raw = res && typeof res === 'object' && 'data' in res ? (res as { data?: { content?: PersonCardData[]; list?: PersonCardData[]; totalElements?: number; total?: number } }).data : res as { content?: PersonCardData[]; list?: PersonCardData[]; totalElements?: number; total?: number } | undefined;
      const content = raw?.content ?? raw?.list ?? [];
      const total = raw?.totalElements ?? raw?.total ?? 0;
      setList(Array.isArray(content) ? content : []);
      setPagination((p) => ({ ...p, total: Number(total) }));
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, pagination.page, pagination.size]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadPersons();
  }, [loadPersons]);

  const handleCategoryClick = useCallback((id: string) => {
    setSelectedCategoryId(id);
    setPagination((p) => ({ ...p, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number, size: number) => {
    setPagination((p) => ({ ...p, page, size }));
  }, []);

  const handleRemove = useCallback(
    async (e: React.MouseEvent, personId: string) => {
      e.stopPropagation();
      if (selectedCategoryId === 'all') return;
      const directoryId = parseInt(selectedCategoryId, 10);
      if (Number.isNaN(directoryId)) return;
      setRemovingId(personId);
      try {
        await keyPersonLibraryAPI.removePersonFromDirectory(directoryId, personId);
        message.success('已移除');
        loadPersons();
        loadCategories();
      } catch {
        message.error('移除失败');
      } finally {
        setRemovingId(null);
      }
    },
    [selectedCategoryId, loadPersons, loadCategories]
  );

  const currentCategoryName = categories.find((c) => c.id === selectedCategoryId)?.name ?? '全部重点人员';
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.size));

  return (
    <div className="page-wrapper key-person-page">
      <h1 className="page-title page-title-accent key-person-title">重点人员管理</h1>

      <div className="key-person-body">
        <aside className="key-person-sidebar">
          <div className="key-person-sidebar-title">重点人员类别</div>
          {categoriesLoading ? (
            <div className="key-person-sidebar-loading">
              <Spin size="small" />
            </div>
          ) : (
            <ul className="key-person-category-list">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className={`key-person-category-item ${selectedCategoryId === cat.id ? 'key-person-category-item-active' : ''}`}
                  onClick={() => handleCategoryClick(cat.id)}
                >
                  <span className="key-person-category-name">{cat.name}</span>
                  <span className="key-person-category-count">{cat.count}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="key-person-main">
          <div className="key-person-main-header">
            <span className="key-person-main-title">{currentCategoryName}</span>
            <span className="key-person-main-total">共{pagination.total}人</span>
          </div>
          <div className="key-person-pagination-info">
            共{pagination.total} 条记录, 第 {pagination.page}/{totalPages} 页
          </div>

          {loading ? (
            <div className="key-person-loading">
              <Spin size="large" />
            </div>
          ) : list.length === 0 ? (
            <div className="key-person-empty">
              <Empty description="暂无重点人员" />
            </div>
          ) : (
            <>
              <Row gutter={[16, 16]} className="key-person-grid">
                {list.map((person) => (
                  <Col xs={24} sm={12} lg={8} key={person.personId}>
                    <PersonCard
                      person={person}
                      showActionLink
                      actionLinkText="查看本地库数据"
                      showRemove={selectedCategoryId !== 'all'}
                      onRemove={handleRemove}
                      removing={removingId === person.personId}
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
                  showQuickJumper
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default KeyPersonLibrary;
