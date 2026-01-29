import { Tabs, Card, Input, List, Tag, Empty } from 'antd';
import { SearchOutlined, BarChartOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { newsAPI, socialAPI } from '@/services/api';
import './index.css';

const { TabPane } = Tabs;

const SituationAwareness = () => {
  const [newsKeyword, setNewsKeyword] = useState('');
  const [newsList, setNewsList] = useState<any[]>([]);
  const [socialList, setSocialList] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  const loadNews = () => {
    setNewsLoading(true);
    newsAPI.getNewsList(0, 20, newsKeyword || undefined).then((res: any) => {
      const d = res?.data ?? res;
      const content = d?.content ?? d?.list ?? [];
      setNewsList(Array.isArray(content) ? content : []);
    }).finally(() => setNewsLoading(false));
  };

  const loadSocial = (platform?: string) => {
    setSocialLoading(true);
    socialAPI.getSocialList(0, 20, platform).then((res: any) => {
      const d = res?.data ?? res;
      const content = d?.content ?? d?.list ?? [];
      setSocialList(Array.isArray(content) ? content : []);
    }).finally(() => setSocialLoading(false));
  };

  useEffect(() => { loadNews(); }, []);
  useEffect(() => { loadSocial(); }, []);

  return (
    <div className="situation-awareness">
      <Card title="态势感知">
        <Tabs defaultActiveKey="news">
          <TabPane tab="新闻动态" key="news">
            <div className="tab-toolbar">
              <Input
                placeholder="搜索关键词"
                prefix={<SearchOutlined />}
                value={newsKeyword}
                onChange={(e) => setNewsKeyword(e.target.value)}
                onPressEnter={loadNews}
                style={{ width: 260 }}
              />
              <a onClick={loadNews}>搜索</a>
              <span className="hint">按日期排序，点击可查看详情</span>
            </div>
            <Card size="small" title="新闻列表" loading={newsLoading}>
              {newsList.length === 0 ? (
                <Empty description="暂无新闻数据，请先配置新闻接口" />
              ) : (
                <List
                  dataSource={newsList}
                  renderItem={(item: any) => (
                    <List.Item
                      onClick={() => {}}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <Tag color="blue">{item.category ?? item.mediaName}</Tag>
                        {item.title}
                      </div>
                      <span className="list-meta">
                        {item.publishTime
                          ? new Date(item.publishTime).toLocaleString()
                          : ''}
                      </span>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </TabPane>
          <TabPane tab="社交动态" key="social">
            <div className="tab-toolbar">
              <span className="hint">按社交平台展示，点击查看发言详情</span>
            </div>
            <Card size="small" title="社交动态列表" loading={socialLoading}>
              {socialList.length === 0 ? (
                <Empty description="暂无社交动态，请先配置社交接口" />
              ) : (
                <List
                  dataSource={socialList}
                  renderItem={(item: any) => (
                    <List.Item>
                      <div>
                        <Tag color="green">{item.socialAccountType}</Tag>
                        {item.socialAccount} — {item.title ?? item.content?.slice(0, 50)}
                      </div>
                      <span className="list-meta">
                        {item.publishTime
                          ? new Date(item.publishTime).toLocaleString()
                          : ''}
                      </span>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </TabPane>
          <TabPane tab="新闻分析" key="news-analysis">
            <Card>
              <div className="analysis-placeholder">
                <BarChartOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <p>今日热点排行前十、词云、按类别图表 — 待对接分析接口</p>
              </div>
            </Card>
          </TabPane>
          <TabPane tab="社交分析" key="social-analysis">
            <Card>
              <div className="analysis-placeholder">
                <BarChartOutlined style={{ fontSize: 48, color: '#ccc' }} />
                <p>今日热点排行前十、词云、按社交类别图表 — 待对接分析接口</p>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default SituationAwareness;
