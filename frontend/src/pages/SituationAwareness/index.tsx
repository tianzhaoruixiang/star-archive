import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Pagination, Empty, Spin, Tag, Tabs, Drawer } from 'antd';
import { SearchOutlined, FileTextOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { newsAPI, eventsAPI, type NewsItem, type EventItem, type EventDetailItem, NEWS_CATEGORIES } from '@/services/api';
import { formatDateTime, parseDate } from '@/utils/date';
import './index.css';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const CATEGORY_TAB_ALL = '全部';
const CATEGORY_TABS = [CATEGORY_TAB_ALL, ...NEWS_CATEGORIES];

/** 主 Tab：新闻动态 | 事件聚合 */
const MAIN_TAB_NEWS = 'news';
const MAIN_TAB_EVENTS = 'events';

function getSummary(content: string | undefined, maxLen: number = 120): string {
  if (!content?.trim()) return '';
  const text = content.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

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

/** 事件列表项卡片 */
const EventListCard: React.FC<{
  item: EventItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const dateStr = item.eventDate ? String(item.eventDate).slice(0, 10) : '';
  const lastStr = parseDate(item.lastPublishTime) ? formatDateTime(item.lastPublishTime, '') : '';

  return (
    <article
      className="news-list-card event-list-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div className="news-list-card-body">
        <h3 className="news-list-card-title">
          <span className="news-list-card-title-link">{item.title || '无标题'}</span>
        </h3>
        {item.summary && <p className="news-list-card-summary">{item.summary}</p>}
        <div className="news-list-card-meta">
          <Tag color="green" className="news-list-card-tag">
            {item.newsCount ?? 0} 条相关新闻
          </Tag>
          {dateStr && <span className="news-list-card-time">{dateStr}</span>}
          {lastStr && <span className="news-list-card-time">最近：{lastStr}</span>}
        </div>
      </div>
      <UnorderedListOutlined className="news-list-card-icon" />
    </article>
  );
};

const SituationAwareness: React.FC = () => {
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<string>(MAIN_TAB_NEWS);

  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState<string>(CATEGORY_TAB_ALL);
  const [list, setList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const [eventList, setEventList] = useState<EventItem[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventPage, setEventPage] = useState(1);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [eventDetail, setEventDetail] = useState<EventDetailItem | null>(null);
  const [eventDetailLoading, setEventDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const categoryParam = category === CATEGORY_TAB_ALL ? undefined : category;
      const res = await newsAPI.getNewsList(
        page - 1,
        pageSize,
        keyword || undefined,
        categoryParam
      );
      const payload = res && typeof res === 'object' && 'data' in res ? (res as { data?: { content?: NewsItem[]; totalElements?: number } }).data : undefined;
      const content = Array.isArray(payload?.content) ? payload.content : [];
      const totalCount = Number(payload?.totalElements ?? 0);
      setList(Array.isArray(content) ? content : []);
      setTotal(Number(totalCount));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, category]);

  const loadEventList = useCallback(async () => {
    setEventLoading(true);
    try {
      const res = await eventsAPI.getEventList(eventPage - 1, pageSize);
      const payload = res && typeof res === 'object' && 'data' in res ? (res as { data?: { content?: EventItem[]; totalElements?: number } }).data : undefined;
      const content = Array.isArray(payload?.content) ? payload.content : [];
      setEventList(content);
      setEventTotal(Number(payload?.totalElements ?? 0));
    } finally {
      setEventLoading(false);
    }
  }, [eventPage, pageSize]);

  useEffect(() => {
    if (mainTab === MAIN_TAB_NEWS) loadList();
  }, [mainTab, loadList]);

  useEffect(() => {
    if (mainTab === MAIN_TAB_EVENTS) loadEventList();
  }, [mainTab, loadEventList]);

  const handleSearch = useCallback(() => {
    setKeyword(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleCategoryChange = useCallback((key: string) => {
    setCategory(key);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number, size?: number) => {
    setPage(p);
    if (size != null && size !== pageSize) setPageSize(size);
  }, [pageSize]);

  const handleEventPageChange = useCallback((p: number, size?: number) => {
    setEventPage(p);
    if (size != null && size !== pageSize) setPageSize(size);
  }, [pageSize]);

  const handleTitleClick = useCallback(
    (newsId: string) => {
      navigate(`/situation/news/${newsId}`);
    },
    [navigate]
  );

  const openEventDetail = useCallback(async (eventId: string) => {
    setEventDetailOpen(true);
    setEventDetail(null);
    setEventDetailLoading(true);
    try {
      const res = await eventsAPI.getEventDetail(eventId);
      const data = res && typeof res === 'object' && 'data' in res ? (res as { data?: EventDetailItem }).data : undefined;
      setEventDetail(data ?? null);
    } finally {
      setEventDetailLoading(false);
    }
  }, []);

  const closeEventDetail = useCallback(() => {
    setEventDetailOpen(false);
    setEventDetail(null);
  }, []);

  return (
    <div className="page-wrapper situation-awareness">
      <div className="situation-awareness-card">
        <div className="page-header">
          <h1 className="page-header-title">态势感知</h1>
          <p className="page-header-desc">新闻动态 · 事件聚合</p>
        </div>

        <Tabs
          activeKey={mainTab}
          onChange={setMainTab}
          size="small"
          className="news-category-tabs"
          items={[
            { key: MAIN_TAB_NEWS, label: '新闻动态' },
            { key: MAIN_TAB_EVENTS, label: '事件聚合' },
          ]}
        />

        {mainTab === MAIN_TAB_NEWS && (
          <>
            <Tabs
              activeKey={category}
              onChange={handleCategoryChange}
              size="small"
              className="news-category-tabs news-category-tabs-inner"
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
                  <div className="news-pagination">
                    <Pagination
                      current={page}
                      total={total}
                      pageSize={pageSize}
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onChange={handlePageChange}
                      showSizeChanger
                      showQuickJumper
                      showTotal={(t) => `共 ${t} 条`}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {mainTab === MAIN_TAB_EVENTS && (
          <div className="news-list-wrap">
            <p className="events-intro">事件由系统每日从新闻中自动提取并聚类，一个事件可对应多条相关新闻。</p>
            {eventLoading ? (
              <div className="news-list-loading">
                <Spin size="large" tip="加载中..." />
              </div>
            ) : eventList.length === 0 ? (
              <Empty
                className="news-list-empty"
                description="暂无事件数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <>
                <ul className="news-list">
                  {eventList.map((item) => (
                    <li key={item.eventId}>
                      <EventListCard
                        item={item}
                        onClick={() => openEventDetail(item.eventId)}
                      />
                    </li>
                  ))}
                </ul>
                <div className="news-pagination">
                  <Pagination
                    current={eventPage}
                    total={eventTotal}
                    pageSize={pageSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onChange={handleEventPageChange}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(t) => `共 ${t} 条`}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Drawer
        title={eventDetail?.title ?? '事件详情'}
        placement="right"
        width={480}
        onClose={closeEventDetail}
        open={eventDetailOpen}
      >
        {eventDetailLoading ? (
          <Spin tip="加载中..." />
        ) : eventDetail ? (
          <div className="event-detail-drawer">
            {eventDetail.eventDate && (
              <p className="event-detail-meta">事件日期：{String(eventDetail.eventDate).slice(0, 10)}</p>
            )}
            {eventDetail.summary && <p className="event-detail-summary">{eventDetail.summary}</p>}
            <p className="event-detail-news-count">共 {eventDetail.relatedNews?.length ?? 0} 条相关新闻</p>
            <ul className="event-detail-news-list">
              {(eventDetail.relatedNews ?? []).map((n) => (
                <li key={n.newsId}>
                  <span
                    className="event-detail-news-link"
                    onClick={() => {
                      closeEventDetail();
                      navigate(`/situation/news/${n.newsId}`);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && (closeEventDetail(), navigate(`/situation/news/${n.newsId}`))}
                  >
                    {n.title || '无标题'}
                  </span>
                  {n.mediaName && <span className="event-detail-news-source"> · {n.mediaName}</span>}
                  {n.publishTime && (
                    <span className="event-detail-news-time">
                      {formatDateTime(n.publishTime, '')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Empty description="未找到事件详情" />
        )}
      </Drawer>
    </div>
  );
};

export default SituationAwareness;
