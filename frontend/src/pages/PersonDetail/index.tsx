import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Spin, Empty } from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  ReadOutlined,
  BankOutlined,
  TeamOutlined,
  HeartOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  AuditOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonDetail } from '@/store/slices/personSlice';
import type { PersonTravelItem, SocialDynamicItem } from '@/types/person';
import { formatBirthMonth, formatDateRange, formatDateTime } from '@/utils/date';
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
    ? detail.phoneNumbers.join('、')
    : '—';
  const emailStr = detail?.emails?.length
    ? detail.emails.join('、')
    : '—';
  const tags = detail?.personTags ?? [];
  const occupationOrOrg = detail?.organization || tags[0] || detail?.highestEducation || '—';

  if (loading && !detail) {
    return (
      <div className="page-wrapper person-detail-page">
        <div className="person-detail-loading">
          <Spin size="large" tip="加载中..." />
        </div>
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

  return (
    <div className="page-wrapper person-detail-page">
      <div className="person-detail-header">
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/persons')}
          className="person-detail-back"
        >
          返回
        </Button>
      </div>

      {/* 简历式主体：顶带 + 双栏 */}
      <div className="person-detail-resume">
        {/* 顶带：RESUME 角标 + 姓名 + 身份/意向 */}
        <div className="person-detail-resume-head">
          <span className="person-detail-resume-label">RESUME</span>
          <div className="person-detail-resume-head-right">
            <h1 className="person-detail-resume-name">{displayName}</h1>
            <p className="person-detail-resume-intent">{occupationOrOrg}</p>
          </div>
        </div>

        <div className="person-detail-resume-body">
          {/* 左栏：头像、自我评价、技能标签、兴趣爱好 */}
          <aside className="person-detail-resume-left">
            <div className="person-detail-resume-avatar-wrap">
              {detail.avatarUrl ? (
                <img
                  src={detail.avatarUrl}
                  alt={displayName}
                  className="person-detail-resume-avatar"
                />
              ) : (
                <div className="person-detail-resume-avatar-placeholder">
                  <UserOutlined />
                </div>
              )}
            </div>

            {detail.remark && (
              <div className="person-detail-resume-block">
                <div className="person-detail-resume-block-title">
                  <UserOutlined />
                  <span>自我评价</span>
                </div>
                <p className="person-detail-resume-remark">{detail.remark}</p>
              </div>
            )}

            {tags.length > 0 && (
              <div className="person-detail-resume-block">
                <div className="person-detail-resume-block-title">
                  <AuditOutlined />
                  <span>人物标签</span>
                </div>
                <div className="person-detail-resume-tags">
                  {tags.map((tag: string, idx: number) => (
                    <Tag key={idx} className="person-detail-resume-tag">
                      {tag}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <div className="person-detail-resume-block">
              <div className="person-detail-resume-block-title">
                <HeartOutlined />
                <span>身份标识</span>
              </div>
              <div className="person-detail-resume-identity">
                {detail.isKeyPerson ? (
                  <Tag color="red">重点人员</Tag>
                ) : (
                  <Tag color="default">普通人员</Tag>
                )}
              </div>
            </div>
          </aside>

          {/* 右栏：个人信息、教育背景、工作/实践经历 */}
          <main className="person-detail-resume-right">
            <div className="person-detail-resume-block">
              <div className="person-detail-resume-block-title">
                <IdcardOutlined />
                <span>个人信息</span>
              </div>
              <div className="person-detail-resume-info-grid">
                <div className="person-detail-resume-info-item">
                  <span className="info-label">出生年月</span>
                  <span className="info-value">{formatBirthMonth(detail.birthDate)}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">现居/籍贯</span>
                  <span className="info-value">{detail.householdAddress || detail.nationality || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">最高学历</span>
                  <span className="info-value">{detail.highestEducation || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">联系电话</span>
                  <span className="info-value">{phoneStr}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">电子邮箱</span>
                  <span className="info-value">{emailStr}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">性别</span>
                  <span className="info-value">{detail.gender || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">身份证号</span>
                  <span className="info-value">{detail.idCardNumber || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">国籍</span>
                  <span className="info-value">{detail.nationality || '—'}</span>
                </div>
                {detail.organization && (
                  <div className="person-detail-resume-info-item">
                    <span className="info-label">所属机构</span>
                    <span className="info-value">{detail.organization}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="person-detail-resume-block">
              <div className="person-detail-resume-block-title">
                <ReadOutlined />
                <span>教育背景</span>
              </div>
              {educationList.length > 0 ? (
                <div className="person-detail-resume-exp-list">
                  {educationList.map((item, idx) => (
                    <div key={idx} className="person-detail-resume-exp-item">
                      <div className="person-detail-resume-exp-time">
                        {formatDateRange(item.start_time, item.end_time)}
                      </div>
                      <div className="person-detail-resume-exp-org">
                        {item.school_name || item.organization || '—'}
                      </div>
                      {item.major && (
                        <div className="person-detail-resume-exp-role">{item.major}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="person-detail-resume-empty">
                  {detail.educationExperience?.trim() ? (
                    <pre className="person-detail-resume-raw">{detail.educationExperience}</pre>
                  ) : (
                    <span>暂无教育经历</span>
                  )}
                </div>
              )}
            </div>

            <div className="person-detail-resume-block">
              <div className="person-detail-resume-block-title">
                <BankOutlined />
                <span>工作/实践经历</span>
              </div>
              {workList.length > 0 ? (
                <div className="person-detail-resume-exp-list">
                  {workList.map((item, idx) => (
                    <div key={idx} className="person-detail-resume-exp-item">
                      <div className="person-detail-resume-exp-time">
                        {formatDateRange(item.start_time, item.end_time)}
                      </div>
                      <div className="person-detail-resume-exp-org">
                        {item.organization || item.school_name || '—'}
                      </div>
                      {(item.job || item.department) && (
                        <div className="person-detail-resume-exp-role">
                          {[item.job, item.department].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="person-detail-resume-empty">
                  {detail.workExperience?.trim() ? (
                    <pre className="person-detail-resume-raw">{detail.workExperience}</pre>
                  ) : (
                    <span>暂无工作经历</span>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* 民航铁路、社交媒体（次要，全宽） */}
      {((detail.recentTravels?.length ?? 0) > 0 || (detail.recentSocialDynamics?.length ?? 0) > 0) && (
        <div className="person-detail-resume-extra">
          {(detail.recentTravels?.length ?? 0) > 0 && (
            <Card className="person-detail-resume-extra-card" title="民航铁路信息" size="small">
              <ul className="person-detail-travel-list">
                {detail.recentTravels!.map((t: PersonTravelItem) => (
                  <li key={t.travelId ?? t.eventTime}>
                    <span className="time">
                      {formatDateTime(t.eventTime, '')}
                    </span>
                    {t.travelType === 'FLIGHT' ? '航班' : '火车'}：{t.departure} → {t.destination}
                    {t.ticketNumber && ` · 票号 ${t.ticketNumber}`}
                    {t.visaType && ` · 签证 ${t.visaType}`}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {(detail.recentSocialDynamics?.length ?? 0) > 0 && (
            <Card className="person-detail-resume-extra-card" title="社交媒体动态" size="small">
              <ul className="person-detail-social-list">
                {detail.recentSocialDynamics!.map((s: SocialDynamicItem) => (
                  <li key={s.dynamicId}>
                    <Tag color="blue">{s.socialAccountType}</Tag> {s.socialAccount}
                    <div className="content">{s.content?.substring(0, 200)}</div>
                    <div className="time">{formatDateTime(s.publishTime, '')}</div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <div className="person-detail-float-btns">
        <button type="button" className="float-btn" title="网格">▦</button>
        <button type="button" className="float-btn" title="刷新">K</button>
      </div>
    </div>
  );
};

export default PersonDetail;
