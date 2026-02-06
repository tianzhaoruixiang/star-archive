import { useCallback, useEffect, useState } from 'react';
import { Row, Col, Pagination, Empty } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import { favoriteAPI } from '@/services/api';
import PersonCard, { type PersonCardData } from '@/components/PersonCard';
import { PageCardGridSkeleton } from '@/components/SkeletonPresets';
import './Favorites.css';

const PAGE_SIZE = 16;

const WorkspaceFavorites = () => {
  const user = useAppSelector((state) => state.auth?.user);
  const [list, setList] = useState<PersonCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, size: PAGE_SIZE, total: 0 });

  const loadFavorites = useCallback(async () => {
    if (!user?.username) {
      setList([]);
      setPagination((p) => ({ ...p, total: 0 }));
      return;
    }
    setLoading(true);
    try {
      const res = (await favoriteAPI.list(pagination.page - 1, pagination.size)) as unknown;
      const raw = res && typeof res === 'object' && 'data' in res ? (res as { data?: { content?: PersonCardData[]; totalElements?: number } }).data : res as { content?: PersonCardData[]; totalElements?: number } | undefined;
      const content = raw?.content ?? [];
      const total = raw?.totalElements ?? 0;
      setList(Array.isArray(content) ? content : []);
      setPagination((p) => ({ ...p, total: Number(total) }));
    } finally {
      setLoading(false);
    }
  }, [user?.username, pagination.page, pagination.size]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handlePageChange = useCallback((page: number, size: number) => {
    setPagination((p) => ({ ...p, page, size }));
  }, []);

  if (!user) {
    return (
      <div className="workspace-favorites">
        <div className="workspace-favorites-header">
          <h1 className="workspace-favorites-title">我的收藏</h1>
          <p className="workspace-favorites-desc">工作区 · 收藏的人物档案</p>
        </div>
        <div className="workspace-favorites-empty workspace-favorites-empty-login">
          <Empty description="请先登录后使用收藏功能" />
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-favorites">
      <div className="workspace-favorites-header">
        <h1 className="workspace-favorites-title">
          我的收藏
        </h1>
        <p className="workspace-favorites-desc">工作区 · 收藏的人物档案，点击卡片进入详情</p>
      </div>
      {loading && list.length === 0 ? (
        <div className="workspace-favorites-loading">
          <PageCardGridSkeleton />
        </div>
      ) : list.length === 0 ? (
        <div className="workspace-favorites-empty">
          <Empty description="暂无收藏，在人物详情页点击「收藏」可添加" />
        </div>
      ) : (
        <>
          <div className="workspace-favorites-toolbar">
            <span className="workspace-favorites-total">共 {pagination.total} 条</span>
          </div>
          <Row gutter={[16, 16]} className="workspace-favorites-grid">
            {list.map((person) => (
              <Col xs={24} sm={12} lg={6} xl={6} key={person.personId} className="workspace-favorites-grid-col">
                <PersonCard person={person} clickable />
              </Col>
            ))}
          </Row>
          <div className="workspace-favorites-pagination">
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
    </div>
  );
};

export default WorkspaceFavorites;
