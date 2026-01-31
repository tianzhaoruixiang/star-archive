import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Spin, Empty, Drawer, Form, Input, Select, DatePicker, Switch, message } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ArrowLeftOutlined, EditOutlined, UserOutlined, ReadOutlined, BankOutlined, HeartOutlined, AuditOutlined, IdcardOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonDetail } from '@/store/slices/personSlice';
import { personAPI, type PersonUpdatePayload } from '@/services/api';
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

/** 编辑表单字段（与 PersonUpdatePayload 对应，表单内用 string/array/dayjs） */
interface EditFormValues {
  chineseName?: string;
  originalName?: string;
  organization?: string;
  belongingGroup?: string;
  gender?: string;
  birthDate?: Dayjs | null;
  nationality?: string;
  householdAddress?: string;
  highestEducation?: string;
  phoneNumbersText?: string;
  emailsText?: string;
  idCardNumber?: string;
  visaType?: string;
  visaNumber?: string;
  personTags?: string[];
  workExperience?: string;
  educationExperience?: string;
  remark?: string;
  isKeyPerson?: boolean;
}

const PersonDetail = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { detail, loading } = useAppSelector((state) => state.person);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<EditFormValues>();

  useEffect(() => {
    if (personId) dispatch(fetchPersonDetail(personId));
  }, [dispatch, personId]);

  const openEdit = useCallback(() => {
    if (!detail) return;
    const birth = detail.birthDate
      ? dayjs(detail.birthDate, ['YYYY-MM', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss'], true)
      : null;
    form.setFieldsValue({
      chineseName: detail.chineseName ?? '',
      originalName: detail.originalName ?? '',
      organization: detail.organization ?? '',
      belongingGroup: detail.belongingGroup ?? '',
      gender: detail.gender ?? undefined,
      birthDate: birth ?? undefined,
      nationality: detail.nationality ?? '',
      householdAddress: detail.householdAddress ?? '',
      highestEducation: detail.highestEducation ?? '',
      phoneNumbersText: (detail.phoneNumbers ?? []).join('\n'),
      emailsText: (detail.emails ?? []).join('\n'),
      idCardNumber: detail.idCardNumber ?? '',
      visaType: detail.visaType ?? '',
      visaNumber: detail.visaNumber ?? '',
      personTags: detail.personTags ?? [],
      workExperience: detail.workExperience ?? '',
      educationExperience: detail.educationExperience ?? '',
      remark: detail.remark ?? '',
      isKeyPerson: detail.isKeyPerson ?? false,
    });
    setEditOpen(true);
  }, [detail, form]);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    form.resetFields();
  }, [form]);

  const handleEditSubmit = useCallback(async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values || !personId) return;
    const phones = (values.phoneNumbersText ?? '')
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const emails = (values.emailsText ?? '')
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: PersonUpdatePayload = {
      chineseName: values.chineseName || undefined,
      originalName: values.originalName || undefined,
      organization: values.organization || undefined,
      belongingGroup: values.belongingGroup || undefined,
      gender: values.gender || undefined,
      birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
      nationality: values.nationality || undefined,
      householdAddress: values.householdAddress || undefined,
      highestEducation: values.highestEducation || undefined,
      phoneNumbers: phones.length ? phones : undefined,
      emails: emails.length ? emails : undefined,
      idCardNumber: values.idCardNumber || undefined,
      visaType: values.visaType || undefined,
      visaNumber: values.visaNumber || undefined,
      personTags: values.personTags?.length ? values.personTags : undefined,
      workExperience: values.workExperience || undefined,
      educationExperience: values.educationExperience || undefined,
      remark: values.remark || undefined,
      isKeyPerson: values.isKeyPerson,
    };
    setSubmitting(true);
    try {
      await personAPI.updatePerson(personId, payload);
      message.success('保存成功');
      closeEdit();
      dispatch(fetchPersonDetail(personId));
    } catch (e) {
      message.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败');
    } finally {
      setSubmitting(false);
    }
  }, [form, personId, closeEdit, dispatch]);

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
        <Button
          type="default"
          icon={<EditOutlined />}
          onClick={openEdit}
          className="person-detail-edit-btn"
        >
          编辑
        </Button>
      </div>

      {/* 简历式主体：顶带 + 双栏 */}
      <div className="person-detail-resume">
        {/* 顶带：RESUME 角标 + 姓名 + 身份/意向 */}
        <div className="person-detail-resume-head">
          <span className="person-detail-resume-label">ARCHIVE</span>
          <div className="person-detail-resume-head-right">
            <h1 className="person-detail-resume-name">{displayName}</h1>
            <p className="person-detail-resume-intent">{occupationOrOrg}</p>
          </div>
        </div>

        <div className="person-detail-resume-body">
          {/* 左栏：多头像（一大图 + 下方小图）、自我评价、技能标签等 */}
          <aside className="person-detail-resume-left">
            <div className="person-detail-resume-avatars">
              {(detail.avatarUrls && detail.avatarUrls.length > 0) || detail.avatarUrl ? (
                <>
                  <div className="person-detail-resume-avatar-main">
                    <img
                      src={(detail.avatarUrls && detail.avatarUrls[0]) || detail.avatarUrl || ''}
                      alt={displayName}
                      className="person-detail-resume-avatar-img"
                    />
                  </div>
                  {detail.avatarUrls && detail.avatarUrls.length > 1 && (
                    <div className="person-detail-resume-avatar-thumbs">
                      {detail.avatarUrls.slice(1).map((url, idx) => (
                        <div key={idx} className="person-detail-resume-avatar-thumb">
                          <img src={url} alt="" className="person-detail-resume-avatar-img" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="person-detail-resume-avatar-placeholder person-detail-resume-avatar-main">
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
                  <span className="info-label">签证类型</span>
                  <span className="info-value">{detail.visaType || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">签证号码</span>
                  <span className="info-value">{detail.visaNumber || '—'}</span>
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
                    {t.travelType === 'FLIGHT' ? '航班' : '火车'}：{(t.departureCity && t.destinationCity) ? `${t.departureCity} → ${t.destinationCity}` : `${t.departure ?? ''} → ${t.destination ?? ''}`}
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

      <Drawer
        title="编辑人员档案"
        open={editOpen}
        onClose={closeEdit}
        width={560}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={closeEdit} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" loading={submitting} onClick={() => form.submit()}>
              保存
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
          <Form.Item label="中文姓名" name="chineseName">
            <Input placeholder="请输入中文姓名" />
          </Form.Item>
          <Form.Item label="外文姓名" name="originalName">
            <Input placeholder="请输入外文姓名" />
          </Form.Item>
          <Form.Item label="性别" name="gender">
            <Select placeholder="请选择" allowClear options={[{ value: '男', label: '男' }, { value: '女', label: '女' }, { value: '其他', label: '其他' }]} />
          </Form.Item>
          <Form.Item label="出生日期" name="birthDate">
            <DatePicker style={{ width: '100%' }} placeholder="请选择出生日期" />
          </Form.Item>
          <Form.Item label="国籍" name="nationality">
            <Input placeholder="请输入国籍" />
          </Form.Item>
          <Form.Item label="现居/籍贯" name="householdAddress">
            <Input placeholder="请输入现居地或籍贯" />
          </Form.Item>
          <Form.Item label="最高学历" name="highestEducation">
            <Input placeholder="如：本科、硕士" />
          </Form.Item>
          <Form.Item label="所属机构" name="organization">
            <Input placeholder="请输入所属机构" />
          </Form.Item>
          <Form.Item label="所属群体" name="belongingGroup">
            <Input placeholder="请输入所属群体" />
          </Form.Item>
          <Form.Item label="联系电话（每行一个）" name="phoneNumbersText">
            <Input.TextArea rows={2} placeholder="每行一个号码" />
          </Form.Item>
          <Form.Item label="电子邮箱（每行一个）" name="emailsText">
            <Input.TextArea rows={2} placeholder="每行一个邮箱" />
          </Form.Item>
          <Form.Item label="身份证号" name="idCardNumber">
            <Input placeholder="请输入身份证号" />
          </Form.Item>
          <Form.Item label="签证类型" name="visaType">
            <Input placeholder="如：公务签证、旅游签证" />
          </Form.Item>
          <Form.Item label="签证号码" name="visaNumber">
            <Input placeholder="请输入签证号码" />
          </Form.Item>
          <Form.Item label="人物标签" name="personTags">
            <Select mode="tags" placeholder="输入后回车添加" allowClear />
          </Form.Item>
          <Form.Item label="工作/实践经历" name="workExperience">
            <Input.TextArea rows={4} placeholder="可填写 JSON 或纯文本" />
          </Form.Item>
          <Form.Item label="教育背景" name="educationExperience">
            <Input.TextArea rows={4} placeholder="可填写 JSON 或纯文本" />
          </Form.Item>
          <Form.Item label="自我评价" name="remark">
            <Input.TextArea rows={3} placeholder="请输入自我评价" />
          </Form.Item>
          <Form.Item label="重点人员" name="isKeyPerson" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default PersonDetail;
