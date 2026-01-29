import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Timeline, Spin, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonDetail } from '@/store/slices/personSlice';
import './index.css';

const PersonDetail = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { detail } = useAppSelector((state) => state.person);

  useEffect(() => {
    if (personId) {
      dispatch(fetchPersonDetail(personId));
    }
  }, [dispatch, personId]);

  if (!detail) {
    return (
      <div className="loading-container">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="person-detail">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/persons')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card title="人员详情" style={{ marginBottom: 16 }}>
        <div className="detail-header">
          <div className="detail-avatar">
            {detail.chineseName?.charAt(0) || '?'}
          </div>
          <div className="detail-basic">
            <h2>{detail.chineseName}</h2>
            <div className="detail-tags">
              {detail.personTags?.map((tag: string, idx: number) => (
                <Tag key={idx} color="blue">
                  {tag}
                </Tag>
              ))}
              {detail.isKeyPerson && <Tag color="red">重点人员</Tag>}
            </div>
          </div>
        </div>

        <Descriptions bordered column={2} style={{ marginTop: 24 }}>
          <Descriptions.Item label="证件号">{detail.idCardNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">
            {detail.phoneNumbers?.join(', ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="出生日期">
            {detail.birthDate
              ? new Date(detail.birthDate).toLocaleDateString()
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            {detail.emails?.join(', ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="国籍">{detail.nationality || '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">{detail.gender || '-'}</Descriptions.Item>
          <Descriptions.Item label="最高学历">
            {detail.highestEducation || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="护照号">
            {detail.passportNumbers?.join(', ') || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="民航铁路信息" style={{ marginBottom: 16 }}>
        {detail.recentTravels && detail.recentTravels.length > 0 ? (
          <Timeline>
            {detail.recentTravels.map((travel: any) => (
              <Timeline.Item key={travel.travelId}>
                <div>
                  <strong>{new Date(travel.eventTime).toLocaleString()}</strong>
                </div>
                <div>
                  {travel.travelType === 'FLIGHT' ? '✈️ 航班' : '🚄 火车'}: {travel.departure} →{' '}
                  {travel.destination}
                </div>
                {travel.ticketNumber && <div>票号: {travel.ticketNumber}</div>}
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Empty description="暂无行程信息" />
        )}
      </Card>

      <Card title="社交媒体动态">
        {detail.recentSocialDynamics && detail.recentSocialDynamics.length > 0 ? (
          <div className="social-list">
            {detail.recentSocialDynamics.map((social: any) => (
              <Card
                key={social.dynamicId}
                type="inner"
                title={
                  <div>
                    <Tag color="blue">{social.socialAccountType}</Tag>
                    {social.socialAccount}
                  </div>
                }
                style={{ marginBottom: 12 }}
              >
                <div>{social.content?.substring(0, 200)}...</div>
                <div style={{ marginTop: 8, color: '#999' }}>
                  {new Date(social.publishTime).toLocaleString()}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="暂无社交动态" />
        )}
      </Card>
    </div>
  );
};

export default PersonDetail;
