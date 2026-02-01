import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Empty, Tag } from 'antd';
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons';
import { newsAPI, type NewsItem } from '@/services/api';
import { formatDateTime, parseDate } from '@/utils/date';
import './index.css';

/** 新闻详情页 - 主流新闻站文章式布局 */
const NewsDetail: React.FC = () => {
  const { newsId } = useParams<{ newsId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!newsId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    try {
      const res = (await newsAPI.getNewsDetail(newsId)) as {
        data?: NewsItem;
        result?: string;
      };
      const data = res?.data ?? res;
      if (data && typeof data === 'object' && 'newsId' in data) {
        setDetail(data as NewsItem);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [newsId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const publishTimeStr = detail?.publishTime
    ? formatDateTime(detail.publishTime, '')
    : '';
  const authorsStr =
    detail?.authors && detail.authors.length > 0
      ? detail.authors.join('、')
      : '';

  if (loading) {
    return (
      <div className="page-wrapper news-detail-page">
        <div className="news-detail-loading">
          <Spin size="large" tip="加载中..." />
        </div>
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="page-wrapper news-detail-page">
        <div className="news-detail-back-bar">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/situation')}
          >
            返回新闻列表
          </Button>
        </div>
        <Empty
          className="news-detail-empty"
          description="新闻不存在或已删除"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate('/situation')}>
            返回新闻列表
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="page-wrapper news-detail-page">
      <div className="news-detail-back-bar">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/situation')}
          className="news-detail-back-btn"
        >
          返回新闻列表
        </Button>
      </div>

      <article className="news-detail-article">
        <header className="news-detail-header">
          {detail.category && (
            <Tag color="blue" className="news-detail-category">
              {detail.category}
            </Tag>
          )}
          <h1 className="news-detail-title">{detail.title || '无标题'}</h1>
          <div className="news-detail-meta">
            {detail.mediaName && (
              <span className="news-detail-source">{detail.mediaName}</span>
            )}
            {publishTimeStr && (
              <span className="news-detail-time">{publishTimeStr}</span>
            )}
            {authorsStr && (
              <span className="news-detail-author">作者：{authorsStr}</span>
            )}
          </div>
        </header>

        <div className="news-detail-body">
          {detail.content ? (
            <div className="news-detail-content">
              {detail.content.split('\n').map((para, idx) =>
                para.trim() ? (
                  <p key={idx}>{para}</p>
                ) : (
                  <br key={idx} />
                )
              )}
            </div>
          ) : (
            <p className="news-detail-no-content">暂无正文</p>
          )}

          {detail.tags && detail.tags.length > 0 && (
            <div className="news-detail-tags">
              <span className="news-detail-tags-label">标签：</span>
              {detail.tags.map((tag, idx) => (
                <Tag key={idx}>{tag}</Tag>
              ))}
            </div>
          )}

          {detail.originalUrl && (
            <div className="news-detail-original">
              <a
                href={detail.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="news-detail-original-link"
              >
                <LinkOutlined /> 阅读原文
              </a>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

export default NewsDetail;
