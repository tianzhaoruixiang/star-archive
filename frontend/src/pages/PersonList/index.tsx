import { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Tag, Pagination, Spin, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonList, fetchTags, fetchPersonListByTag } from '@/store/slices/personSlice';
import './index.css';

interface FlatTag {
  tagId: number;
  firstLevelName?: string;
  secondLevelName?: string;
  tagName: string;
  personCount?: number;
  parentTagId?: number;
}

const PersonList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { list, pagination, loading, tags } = useAppSelector((state) => state.person);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tagTree = useMemo(() => {
    const flat = (tags || []) as FlatTag[];
    const byFirst: Record<string, Record<string, FlatTag[]>> = {};
    flat.forEach((t) => {
      const f = t.firstLevelName ?? '其他';
      const s = t.secondLevelName ?? '';
      if (!byFirst[f]) byFirst[f] = {};
      if (!byFirst[f][s]) byFirst[f][s] = [];
      byFirst[f][s].push(t);
    });
    return byFirst;
  }, [tags]);

  useEffect(() => {
    dispatch(fetchTags());
  }, [dispatch]);

  useEffect(() => {
    if (selectedTag) {
      dispatch(fetchPersonListByTag({ tag: selectedTag, page: 0, size: 20 }));
    } else {
      dispatch(fetchPersonList({ page: 0, size: 20 }));
    }
  }, [dispatch, selectedTag]);

  const handlePageChange = (page: number, size: number) => {
    if (selectedTag) {
      dispatch(fetchPersonListByTag({ tag: selectedTag, page: page - 1, size }));
    } else {
      dispatch(fetchPersonList({ page: page - 1, size }));
    }
  };

  const handleCardClick = (personId: string) => {
    navigate(`/persons/${personId}`);
  };

  return (
    <div className="person-list">
      <Card title="人员档案" style={{ marginBottom: 16 }}>
        <div className="tag-filter">
          <span className="filter-label">标签筛选：</span>
          <Tag
            className={selectedTag === null ? 'tag-selected' : ''}
            onClick={() => setSelectedTag(null)}
            style={{ cursor: 'pointer' }}
          >
            全部
          </Tag>
          {Object.entries(tagTree).map(([first, seconds]) => (
            <span key={first} className="tag-group">
              <span className="tag-first">{first}</span>
              {Object.entries(seconds).map(([second, items]) =>
                items.map((t) => (
                  <Tag
                    key={t.tagId}
                    className={selectedTag === t.tagName ? 'tag-selected' : ''}
                    onClick={() => setSelectedTag(t.tagName)}
                    style={{ cursor: 'pointer', fontSize: 12 }}
                  >
                    {t.tagName}
                    {t.personCount != null && (
                      <span className="tag-count">({t.personCount})</span>
                    )}
                  </Tag>
                ))
              )}
            </span>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <Empty description="暂无人员数据" />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {list.map((person) => (
              <Col span={4} key={person.personId}>
                <Card
                  hoverable
                  className="person-card"
                  onClick={() => handleCardClick(person.personId)}
                >
                  <div className="person-avatar">
                    {person.chineseName?.charAt(0) || '?'}
                  </div>
                  <div className="person-name">{person.chineseName}</div>
                  <div className="person-id">{person.idCardNumber || '无身份证'}</div>
                  <div className="person-birth">
                    {person.birthDate
                      ? new Date(person.birthDate).toLocaleDateString()
                      : '未知'}
                  </div>
                  <div className="person-tags">
                    {person.personTags?.slice(0, 2).map((tag: string, idx: number) => (
                      <Tag key={idx} color="blue" style={{ fontSize: 12 }}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                  {person.isKeyPerson && (
                    <Tag color="red" className="key-person-tag">
                      重点人员
                    </Tag>
                  )}
                </Card>
              </Col>
            ))}
          </Row>

          <div className="pagination-container">
            <Pagination
              current={pagination.page + 1}
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
    </div>
  );
};

export default PersonList;
