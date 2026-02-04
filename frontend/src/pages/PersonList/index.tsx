import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, Row, Col, Tag, Pagination, Empty, Input } from 'antd';
import { SearchOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonList, fetchTags } from '@/store/slices/personSlice';
import PersonCard, { type PersonCardData } from '@/components/PersonCard';
import { PageCardGridSkeleton, InlineSkeleton } from '@/components/SkeletonPresets';
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
  const { list, pagination, loading, tags, tagsLoading } = useAppSelector((state) => state.person);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  useEffect(() => {
    dispatch(fetchTags());
  }, [dispatch]);

  /** 标签 + 姓名/证件号检索统一走 GET /persons，支持同时选标签和输入关键词 */
  const listFilter = useMemo(
    () => ({
      ...(selectedTags.length > 0 && { tags: selectedTags }),
      ...(searchKeyword.trim() !== '' && { keyword: searchKeyword.trim() }),
      matchAny: true,
    }),
    [selectedTags, searchKeyword]
  );

  useEffect(() => {
    dispatch(fetchPersonList({ page: 0, size: 20, filter: listFilter }));
  }, [dispatch, listFilter]);

  const handlePageChange = useCallback(
    (page: number, size: number) => {
      dispatch(fetchPersonList({ page: page - 1, size, filter: listFilter }));
    },
    [dispatch, listFilter]
  );

  const handleTagClick = useCallback((tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  }, []);

  const handleRemoveSelectedTag = useCallback((tagName: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagName));
  }, []);

  const handleClearSelectedTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const tagTree = useMemo(() => buildTagTree((tags || []) as TagItem[]), [tags]);

  const displayList = useMemo(() => (Array.isArray(list) ? list : []) as PersonCardData[], [list]);

  const safePagination = useMemo(
    () => ({
      page: typeof pagination?.page === 'number' ? pagination.page : 0,
      size: typeof pagination?.size === 'number' ? pagination.size : 20,
      total: typeof pagination?.total === 'number' ? pagination.total : 0,
    }),
    [pagination]
  );

  return (
    <div className="page-wrapper person-list-page">
      <div className="person-list-card">
      <div className="page-header">
        <h1 className="page-header-title">人员档案</h1>
        <p className="page-header-desc">人员档案 · 列表与筛选</p>
      </div>
      {/* 顶部：搜索 + 右侧图标 */}
      <div className="person-list-top">
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

      {/* 筛选标签：可收起；一级 -> 二级 -> 三级标签，风格统一 */}
      <div className={`person-list-filter ${filterCollapsed ? 'person-list-filter-collapsed' : ''}`}>
        <div
          className="person-list-filter-header"
          onClick={() => setFilterCollapsed((c) => !c)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFilterCollapsed((c) => !c)}
        >
          <span className="person-list-filter-title">筛选标签</span>
          <span className="person-list-filter-toggle">
            {filterCollapsed ? <DownOutlined /> : <UpOutlined />}
          </span>
        </div>
        {!filterCollapsed && (
          <>
            {tagsLoading ? (
              <div className="person-list-filter-loading">
                <InlineSkeleton lines={4} />
              </div>
            ) : (
              <>
                {Object.entries(tagTree).map(([firstLevelName, secondMap]) => (
                  <div key={firstLevelName} className="person-list-filter-block">
                    <div className="person-list-filter-category">
                      <span className="person-list-filter-bar" />
                      <span className="person-list-filter-category-label">{firstLevelName}</span>
                    </div>
                    <div className="person-list-filter-seconds-col">
                      {Object.entries(secondMap).map(([secondLevelName, items]) => {
                        const secondKey = `${firstLevelName}-${secondLevelName}`;
                        const displaySecondName = secondLevelName || '其他';
                        return (
                          <div key={secondKey} className="person-list-filter-second-row">
                            <div className="person-list-filter-second">
                              <span className="person-list-filter-second-label">{displaySecondName}</span>
                            </div>
                            <div className="person-list-filter-tags person-list-filter-tags-third">
                              {items.map((t) => (
                                <Tag
                                  key={t.tagId}
                                  className={`person-list-tag person-list-tag-third ${selectedTags.includes(t.tagName) ? 'person-list-tag-selected' : ''}`}
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
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* 当前已选标签 */}
      {selectedTags.length > 0 && (
        <div className="person-list-selected">
          <span className="person-list-selected-label">当前已选：</span>
          <div className="person-list-selected-tags">
            {selectedTags.map((tag) => (
              <Tag
                key={tag}
                closable
                onClose={() => handleRemoveSelectedTag(tag)}
                className="person-list-selected-tag"
              >
                {tag}
              </Tag>
            ))}
            <button
              type="button"
              className="person-list-selected-clear"
              onClick={handleClearSelectedTags}
            >
              清除全部
            </button>
          </div>
        </div>
      )}

      {/* 分割线 */}
      <div className="person-list-divider" />

      {/* 结果列表 */}
      {loading ? (
        <div className="person-list-loading">
          <PageCardGridSkeleton title={false} count={8} />
        </div>
      ) : displayList.length === 0 ? (
        <Card className="person-list-result-card">
          <Empty description={searchKeyword ? '未找到匹配人员' : '暂无人员数据'} />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]} className="person-list-grid">
            {displayList.map((person: PersonCardData) => (
              <Col xs={24} sm={12} md={8} lg={6} className="person-list-col-five" key={person.personId}>
                <PersonCard
                  person={person}
                  clickable
                />
              </Col>
            ))}
          </Row>

          <div className="page-pagination person-list-pagination">
            <Pagination
              current={safePagination.page + 1}
              pageSize={safePagination.size}
              total={safePagination.total}
              onChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 条`}
              className="person-list-pagination-inner"
            />
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default PersonList;
