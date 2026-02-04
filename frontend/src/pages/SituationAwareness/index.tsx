import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Pagination, Empty, Spin, Tag, Tabs } from 'antd';
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons';
import { newsAPI, type NewsItem, NEWS_CATEGORIES } from '@/services/api';
import { formatDateTime, parseDate } from '@/utils/date';
import './index.css';

const PAGE_SIZE = 20;

/** 分类 Tab：全部 + 政治、经济、文化、社会民生 */
const CATEGORY_TAB_ALL = '全部';
const CATEGORY_TABS = [CATEGORY_TAB_ALL, ...NEWS_CATEGORIES];

/** 从新闻内容截取摘要（纯文本，约 120 字） */
function getSummary(content: string | undefined, maxLen: number = 120): string {
  if (!content?.trim()) return '';
  const text = content.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

/** 新闻列表项卡片 */
const NewsListCard: React.FC<{
  item: NewsItem;
  onTitleClick: (newsId: string) => void;
}> = ({ item, onTitleClick }) => {
  const publishTimeStr = parseDate(item.publishTime)
    ? formatDateTime(item.publishTime, '')
    : '';
  const summary = getSummary(item.content);

  return (
    <article className="news-list-card">
      <div className="news-list-card-body">
        <h3 className="news-list-card-title">
          <span
            className="news-list-card-title-link"
            onClick={() => onTitleClick(item.newsId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onTitleClick(item.newsId)}
          >
            {item.title || '无标题'}
          </span>
        </h3>
        {summary && <p className="news-list-card-summary">{summary}</p>}
        <div className="news-list-card-meta">
          {item.category && (
            <Tag color="blue" className="news-list-card-tag">
              {item.category}
            </Tag>
          )}
          {item.mediaName && (
            <span className="news-list-card-source">{item.mediaName}</span>
          )}
          {publishTimeStr && (
            <span className="news-list-card-time">{publishTimeStr}</span>
          )}
        </div>
      </div>
      <FileTextOutlined className="news-list-card-icon" />
    </article>
  );
};

/** 态势感知 - 仅保留新闻动态，主流新闻站风格 */
const SituationAwareness: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState<string>(CATEGORY_TAB_ALL);
  const [list, setList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const categoryParam = category === CATEGORY_TAB_ALL ? undefined : category;
      const res = (await newsAPI.getNewsList(
        page - 1,
        PAGE_SIZE,
        keyword || undefined,
        categoryParam
      )) as { data?: { content?: NewsItem[]; list?: NewsItem[]; totalElements?: number; total?: number } };
      const data = res?.data ?? res;
      // @ts-ignore
      const content = data?.content ?? data?.list ?? [];
      // @ts-ignore
      const totalCount = data?.totalElements ?? data?.total ?? 0;
      setList(Array.isArray(content) ? content : []);
      setTotal(Number(totalCount));
    } finally {
      setLoading(false);
    }
  }, [page, keyword, category]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleSearch = useCallback(() => {
    setKeyword(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleCategoryChange = useCallback((key: string) => {
    setCategory(key);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const handleTitleClick = useCallback(
    (newsId: string) => {
      navigate(`/situation/news/${newsId}`);
    },
    [navigate]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page-wrapper situation-awareness">
      <div className="situation-awareness-card">
        <div className="news-page-header">
          <h1 className="news-page-title">新闻动态</h1>
          <p className="news-page-desc">态势感知 · 新闻资讯</p>
        </div>

        <Tabs
        activeKey={category}
        onChange={handleCategoryChange}
        size="small"
        className="news-category-tabs"
        items={CATEGORY_TABS.map((tab) => ({ key: tab, label: tab }))}
      />

      <div className="news-search-bar">
        <Input
          placeholder="搜索新闻关键词"
          prefix={<SearchOutlined className="news-search-icon" />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={handleSearch}
          className="news-search-input"
          allowClear
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
      </div>

      <div className="news-list-wrap">
        {loading ? (
          <div className="news-list-loading">
            <Spin size="large" tip="加载中..." />
          </div>
        ) : list.length === 0 ? (
          <Empty
            className="news-list-empty"
            description="暂无新闻数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <>
            <ul className="news-list">
              {list.map((item) => (
                <li key={item.newsId}>
                  <NewsListCard item={item} onTitleClick={handleTitleClick} />
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="news-pagination">
                <Pagination
                  current={page}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                  showTotal={(t) => `共 ${t} 条`}
                />
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default SituationAwareness;
