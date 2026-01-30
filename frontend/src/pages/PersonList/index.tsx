import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, Row, Col, Tag, Pagination, Spin, Empty, Input } from 'antd';
import { SearchOutlined, BellOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonList, fetchTags, fetchPersonListByTag } from '@/store/slices/personSlice';
import PersonCard, { type PersonCardData } from '@/components/PersonCard';
import './index.css';

/** 标签项（与后端 tag 表 /persons/tags 一致） */
interface TagItem {
  tagId: number;
  firstLevelName?: string;
  secondLevelName?: string;
  tagName: string;
  personCount?: number;
  parentTagId?: number;
}

/** 按一级 -> 二级 -> 标签列表 分组，用于筛选区展示 */
function buildTagTree(tags: TagItem[] | null): Record<string, Record<string, TagItem[]>> {
  if (!tags?.length) return {};
  const byFirst: Record<string, Record<string, TagItem[]>> = {};
  tags.forEach((t) => {
    const f = t.firstLevelName ?? '其他';
    const s = t.secondLevelName ?? '';
    if (!byFirst[f]) byFirst[f] = {};
    if (!byFirst[f][s]) byFirst[f][s] = [];
    byFirst[f][s].push(t);
  });
  return byFirst;
}

const PersonList = () => {
  const dispatch = useAppDispatch();
  const { list, pagination, loading, tags } = useAppSelector((state) => state.person);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

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

  const handlePageChange = useCallback(
    (page: number, size: number) => {
      if (selectedTag) {
        dispatch(fetchPersonListByTag({ tag: selectedTag, page: page - 1, size }));
      } else {
        dispatch(fetchPersonList({ page: page - 1, size }));
      }
    },
    [dispatch, selectedTag]
  );

  const handleTagClick = useCallback((tagName: string) => {
    setSelectedTag((prev) => (prev === tagName ? null : tagName));
  }, []);

  const tagTree = useMemo(() => buildTagTree((tags || []) as TagItem[]), [tags]);

  const filteredList = useMemo(() => {
    if (!searchKeyword.trim()) return list;
    const kw = searchKeyword.trim().toLowerCase();
    return (list as { chineseName?: string; originalName?: string; idCardNumber?: string; personId?: string }[]).filter(
      (p) =>
        (p.chineseName && p.chineseName.toLowerCase().includes(kw)) ||
        (p.originalName && p.originalName.toLowerCase().includes(kw)) ||
        (p.idCardNumber && p.idCardNumber.includes(kw))
    );
  }, [list, searchKeyword]);

  return (
    <div className="page-wrapper person-list-page">
      {/* 顶部：标题 + 搜索 + 右侧图标 */}
      <div className="person-list-top">
        <h1 className="page-title person-list-title">人员档案</h1>
        <div className="person-list-top-right">
          <Input
            placeholder="搜索姓名、身份证号..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="page-search person-list-search"
            allowClear
          />
        </div>
      </div>

      {/* 筛选标签（全部来自 Doris tag 表 /persons/tags），默认展示所有人员 */}
      <div className="person-list-filter">
        <div className="person-list-filter-title">筛选标签</div>
        {Object.entries(tagTree).map(([firstLevelName, secondMap]) => (
          <div key={firstLevelName} className="person-list-filter-block">
            <div className="person-list-filter-category">
              <span className="person-list-filter-bar" />
              <span className="person-list-filter-category-label">{firstLevelName}</span>
            </div>
            {Object.entries(secondMap).map(([secondLevelName, items]) => (
              <div key={`${firstLevelName}-${secondLevelName}`} className="person-list-filter-row">
                {secondLevelName ? (
                  <span className="person-list-filter-sub-label">{secondLevelName}：</span>
                ) : null}
                <div className="person-list-filter-tags">
                  {items.map((t) => (
                    <Tag
                      key={t.tagId}
                      className={`person-list-tag ${selectedTag === t.tagName ? 'person-list-tag-selected' : ''}`}
                      onClick={() => handleTagClick(t.tagName)}
                    >
                      {t.tagName}
                      {t.personCount != null && (
                        <span className="person-list-tag-count">({t.personCount})</span>
                      )}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 分割线 */}
      <div className="person-list-divider" />

      {/* 结果列表 */}
      {loading ? (
        <div className="person-list-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      ) : filteredList.length === 0 ? (
        <Card className="person-list-result-card">
          <Empty description={searchKeyword ? '未找到匹配人员' : '暂无人员数据'} />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]} className="person-list-grid">
            {filteredList.map((person: PersonCardData) => (
              <Col xs={24} sm={12} md={8} lg={6} xl={4} key={person.personId}>
                <PersonCard
                  person={person}
                  showActionLink
                  actionLinkText="查看详情"
                />
              </Col>
            ))}
          </Row>

          {!searchKeyword && (
            <div className="page-pagination person-list-pagination">
              <Pagination
                current={pagination.page + 1}
                pageSize={pagination.size}
                total={pagination.total}
                onChange={handlePageChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条`}
                className="person-list-pagination-inner"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PersonList;
