import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Spin, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  FolderOutlined,
  BookOutlined,
  BankOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonDetail } from '@/store/slices/personSlice';
import './index.css';

/** 教育/工作经历单项（与 ArchiveResumeView 解析一致） */
interface ExperienceItem {
  school_name?: string;
  organization?: string;
  major?: string;
  job?: string;
  department?: string;
  start_time?: string;
  end_time?: string;
  degree?: string;
  [key: string]: unknown;
}

function parseExperienceJson(raw: string | undefined): ExperienceItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as ExperienceItem[];
    if (parsed && typeof parsed === 'object') return [parsed as ExperienceItem];
  } catch {
    // ignore
  }
  return [];
}

function formatDateRange(start?: string, end?: string): string {
  const s = start?.trim();
  const e = end?.trim();
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  if (e) return e;
  return '—';
}

/** 根据出生日期计算年龄 */
function ageFromBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate) return '—';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? `${age}岁` : '—';
}

const PersonDetail = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { detail, loading } = useAppSelector((state) => state.person);

  useEffect(() => {
    if (personId) dispatch(fetchPersonDetail(personId));
  }, [dispatch, personId]);

  const educationList = useMemo(
    () => parseExperienceJson(detail?.educationExperience),
    [detail?.educationExperience]
  );
  const workList = useMemo(
    () => parseExperienceJson(detail?.workExperience),
    [detail?.workExperience]
  );

  const phoneStr = detail?.phoneNumbers?.length
    ? detail.phoneNumbers.join(', ')
    : '—';
  const updatedStr = detail?.updatedTime
    ? new Date(detail.updatedTime).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '—';

  if (loading && !detail) {
    return (
      <div className="person-detail-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="page-wrapper person-detail-page">
        <div className="person-detail-empty">
          <Empty description="未找到该人员档案" />
          <Button type="primary" onClick={() => navigate('/persons')}>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  const displayName = detail.chineseName || detail.originalName || '—';
  const statusTag = detail.isKeyPerson ? '重点人员' : '正常';
  const tags = detail.personTags?.slice(0, 5) || [];
  const occupation = tags[0] || detail.highestEducation || '—';

  return (
    <div className="page-wrapper person-detail-page">
      {/* 顶部：返回 + 标题 */}
      <div className="person-detail-header">
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/persons')}
          className="person-detail-back"
        >
          返回
        </Button>
        <h1 className="person-detail-title">人员档案详情</h1>
      </div>

      {/* 档案卡片：头像 + 姓名 + 标签 */}
      <Card className="person-detail-profile-card">
        <div className="person-detail-profile">
          <div className="person-detail-avatar-wrap">
            {detail.avatarUrl ? (
              <img
                src={detail.avatarUrl}
                alt={displayName}
                className="person-detail-avatar-img"
              />
            ) : (
              <div className="person-detail-avatar-placeholder">
                <SmileOutlined />
              </div>
            )}
            <Tag color="green" className="person-detail-status-tag">
              {statusTag}
            </Tag>
          </div>
          <div className="person-detail-profile-main">
            <h2 className="person-detail-name">{displayName}</h2>
            <div className="person-detail-tags">
              {tags.map((tag: string, idx: number) => (
                <Tag key={idx} className="person-detail-attr-tag">
                  {tag}
                </Tag>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 基本信息 */}
      <Card className="person-detail-section-card">
        <div className="person-detail-section-title">
          <FolderOutlined />
          <span>基本信息</span>
        </div>
        <div className="person-detail-basic-grid">
          <div className="person-detail-basic-item">
            <span className="label">身份证号</span>
            <span className="value">{detail.idCardNumber || '—'}</span>
          </div>
          <div className="person-detail-basic-item">
            <span className="label">性别</span>
            <span className="value">{detail.gender || '—'}</span>
          </div>
          <div className="person-detail-basic-item">
            <span className="label">年龄</span>
            <span className="value">{ageFromBirthDate(detail.birthDate)}</span>
          </div>
          <div className="person-detail-basic-item">
            <span className="label">籍贯</span>
            <span className="value">{detail.householdAddress || detail.nationality || '—'}</span>
          </div>
          <div className="person-detail-basic-item">
            <span className="label">职业</span>
            <span className="value">{occupation}</span>
          </div>
          <div className="person-detail-basic-item">
            <span className="label">电话</span>
            <span className="value">{phoneStr}</span>
          </div>
          <div className="person-detail-basic-item person-detail-basic-item-full">
            <span className="label">最后更新</span>
            <span className="value">{updatedStr}</span>
          </div>
        </div>
      </Card>

      {/* 教育经历 */}
      <Card className="person-detail-section-card">
        <div className="person-detail-section-title">
          <BookOutlined />
          <span>教育经历</span>
        </div>
        {educationList.length > 0 ? (
          <div className="person-detail-exp-list">
            {educationList.map((item, idx) => (
              <div key={idx} className="person-detail-exp-item">
                <div className="person-detail-exp-row">
                  <span className="school">{item.school_name || item.organization || '—'}</span>
                  {item.major && <span className="major">{item.major}</span>}
                  {item.degree && (
                    <Tag className="person-detail-attr-tag">{item.degree}</Tag>
                  )}
                </div>
                <div className="person-detail-exp-date">
                  {formatDateRange(item.start_time, item.end_time)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="person-detail-exp-empty">
            {detail.educationExperience?.trim() ? (
              <pre className="person-detail-raw-text">{detail.educationExperience}</pre>
            ) : (
              <Empty description="暂无教育经历" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        )}
      </Card>

      {/* 工作经历 */}
      <Card className="person-detail-section-card">
        <div className="person-detail-section-title">
          <BankOutlined />
          <span>工作经历</span>
        </div>
        {workList.length > 0 ? (
          <div className="person-detail-exp-list">
            {workList.map((item, idx) => (
              <div key={idx} className="person-detail-exp-item">
                <div className="person-detail-exp-row">
                  <span className="school">{item.organization || item.school_name || '—'}</span>
                  {item.job && <span className="major">{item.job}</span>}
                  {item.department && (
                    <Tag className="person-detail-attr-tag">{item.department}</Tag>
                  )}
                </div>
                <div className="person-detail-exp-date">
                  {formatDateRange(item.start_time, item.end_time)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="person-detail-exp-empty">
            {detail.workExperience?.trim() ? (
              <pre className="person-detail-raw-text">{detail.workExperience}</pre>
            ) : (
              <Empty description="暂无工作经历" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        )}
      </Card>

      {/* 民航铁路信息（折叠或次要） */}
      {(detail.recentTravels?.length ?? 0) > 0 && (
        <Card className="person-detail-section-card" title="民航铁路信息" size="small">
          <ul className="person-detail-travel-list">
            {detail.recentTravels.map((t: { travelId?: string; eventTime?: string; travelType?: string; departure?: string; destination?: string; ticketNumber?: string }) => (
              <li key={t.travelId ?? t.eventTime}>
                <span className="time">
                  {t.eventTime ? new Date(t.eventTime).toLocaleString() : ''}
                </span>
                <span>
                  {t.travelType === 'FLIGHT' ? '航班' : '火车'}：{t.departure} → {t.destination}
                  {t.ticketNumber && ` · 票号 ${t.ticketNumber}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 社交媒体动态（次要） */}
      {(detail.recentSocialDynamics?.length ?? 0) > 0 && (
        <Card className="person-detail-section-card" title="社交媒体动态" size="small">
          <ul className="person-detail-social-list">
            {detail.recentSocialDynamics.map((s: { dynamicId?: string; socialAccount?: string; socialAccountType?: string; content?: string; publishTime?: string }) => (
              <li key={s.dynamicId}>
                <Tag color="blue">{s.socialAccountType}</Tag> {s.socialAccount}
                <div className="content">{s.content?.substring(0, 200)}</div>
                <div className="time">{s.publishTime ? new Date(s.publishTime).toLocaleString() : ''}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="person-detail-float-btns">
        <div className="float-btn">▦</div>
        <div className="float-btn">K</div>
      </div>
    </div>
  );
};

export default PersonDetail;
