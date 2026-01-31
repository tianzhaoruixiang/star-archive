import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Spin, Empty, Drawer, Form, Input, Select, DatePicker, Switch, message } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ArrowLeftOutlined, EditOutlined, UserOutlined, ReadOutlined, BankOutlined, HeartOutlined, AuditOutlined, IdcardOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonDetail } from '@/store/slices/personSlice';
import { personAPI, type PersonUpdatePayload } from '@/services/api';
import type { PersonTravelItem, SocialDynamicItem } from '@/types/person';
import { formatBirthMonth, formatDateTime } from '@/utils/date';
import './index.css';

/** 教育/工作经历单项（支持 start_time/start_date、end_time/end_date、position/job 等） */
interface ExperienceItem {
  school_name?: string;
  organization?: string;
  major?: string;
  job?: string;
  position?: string;
  department?: string;
  faculty?: string;
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  degree?: string;
  responsibilities?: string;
  [key: string]: unknown;
}

function parseExperienceJson(raw: string | undefined): ExperienceItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const arr = Array.isArray(parsed) ? (parsed as ExperienceItem[]) : parsed && typeof parsed === 'object' ? [parsed as ExperienceItem] : [];
    return arr;
  } catch {
    return [];
  }
}

/** 取开始/结束时间（兼容 start_time 与 start_date） */
function getStartEnd(item: ExperienceItem): { start: string | undefined; end: string | undefined } {
  return {
    start: (item.start_time ?? item.start_date ?? '') || undefined,
    end: (item.end_time ?? item.end_date ?? '') || undefined,
  };
}

/** 工作经历表单项（提交时用 start_time/end_time 等） */
interface WorkItemForm {
  start_time?: string;
  end_time?: string;
  organization?: string;
  department?: string;
  job?: string;
  responsibilities?: string;
}

/** 教育经历表单项 */
interface EducationItemForm {
  start_time?: string;
  end_time?: string;
  school_name?: string;
  department?: string;
  major?: string;
  degree?: string;
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
  workExperienceItems?: WorkItemForm[];
  educationExperienceItems?: EducationItemForm[];
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
    const workItems = parseExperienceJson(detail.workExperience).map((item) => ({
      start_time: (item.start_time ?? item.start_date ?? '') || undefined,
      end_time: (item.end_time ?? item.end_date ?? '') || undefined,
      organization: (item.organization as string) || undefined,
      department: (item.department ?? item.faculty) as string | undefined,
      job: (item.job ?? item.position) as string | undefined,
      responsibilities: (item.responsibilities as string) || undefined,
    }));
    const eduItems = parseExperienceJson(detail.educationExperience).map((item) => ({
      start_time: (item.start_time ?? item.start_date ?? '') || undefined,
      end_time: (item.end_time ?? item.end_date ?? '') || undefined,
      school_name: (item.school_name as string) || undefined,
      department: (item.department ?? item.faculty) as string | undefined,
      major: (item.major as string) || undefined,
      degree: (item.degree as string) || undefined,
    }));
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
      workExperienceItems: workItems.length ? workItems : [{ start_time: '', end_time: '', organization: '', department: '', job: '', responsibilities: '' }],
      educationExperienceItems: eduItems.length ? eduItems : [{ start_time: '', end_time: '', school_name: '', department: '', major: '', degree: '' }],
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
      workExperience: (() => {
        const items = values.workExperienceItems ?? [];
        const valid = items.filter((i) => (i.organization ?? i.department ?? i.job ?? i.responsibilities ?? '').toString().trim());
        return valid.length ? JSON.stringify(valid) : undefined;
      })(),
      educationExperience: (() => {
        const items = values.educationExperienceItems ?? [];
        const valid = items.filter((i) => (i.school_name ?? i.department ?? i.major ?? i.degree ?? '').toString().trim());
        return valid.length ? JSON.stringify(valid) : undefined;
      })(),
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
                  {educationList.map((item, idx) => {
                    const { start, end } = getStartEnd(item);
                    const org = item.school_name ?? item.organization;
                    const dept = item.department ?? item.faculty;
                    return (
                      <div key={idx} className="person-detail-resume-exp-item person-detail-resume-exp-full">
                        <div className="person-detail-resume-exp-row">
                          <span className="person-detail-resume-exp-label">开始时间</span>
                          <span className="person-detail-resume-exp-value">{start || '—'}</span>
                        </div>
                        <div className="person-detail-resume-exp-row">
                          <span className="person-detail-resume-exp-label">结束时间</span>
                          <span className="person-detail-resume-exp-value">{end || '—'}</span>
                        </div>
                        {org && (
                          <div className="person-detail-resume-exp-row">
                            <span className="person-detail-resume-exp-label">学校</span>
                            <span className="person-detail-resume-exp-value">{org}</span>
                          </div>
                        )}
                        {dept && (
                          <div className="person-detail-resume-exp-row">
                            <span className="person-detail-resume-exp-label">院系</span>
                            <span className="person-detail-resume-exp-value">{dept}</span>
                          </div>
                        )}
                        {item.major && (
                          <div className="person-detail-resume-exp-row">
                            <span className="person-detail-resume-exp-label">专业</span>
                            <span className="person-detail-resume-exp-value">{item.major}</span>
                          </div>
                        )}
                        {item.degree && (
                          <div className="person-detail-resume-exp-row">
                            <span className="person-detail-resume-exp-label">学历</span>
                            <span className="person-detail-resume-exp-value">{item.degree}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  {workList.map((item, idx) => {
                    const { start, end } = getStartEnd(item);
                    const job = item.job ?? item.position;
                    return (
                      <div key={idx} className="person-detail-resume-exp-item person-detail-resume-exp-full">
                        <div className="person-detail-resume-exp-row">
                          <span className="person-detail-resume-exp-label">开始时间</span>
                          <span className="person-detail-resume-exp-value">{start || '—'}</span>
                        </div>
                        <div className="person-detail-resume-exp-row">
                          <span className="person-detail-resume-exp-label">结束时间</span>
                          <span className="person-detail-resume-exp-value">{end || '—'}</span>
                        </div>
                        {item.organization && (
                          <div className="person-detail-resume-exp-row">
                            <span className="person-detail-resume-exp-label">机构</span>
                            <span className="person-detail-resume-exp-value">{item.organization}</span>
                          </div>
                        )}
                        {item.department && (
                          <div className="person-detail-resume-exp-row">
                            <span className="person-detail-resume-exp-label">部门</span>
                            <span className="person-detail-resume-exp-value">{item.department}</span>
                          </div>
                        )}
                        {job && (
                          <div className="person-detail-resume-exp-row">
                            <span className="person-detail-resume-exp-label">职位</span>
                            <span className="person-detail-resume-exp-value">{job}</span>
                          </div>
                        )}
                        {item.responsibilities && (
                          <div className="person-detail-resume-exp-row">
                            <span className="person-detail-resume-exp-label">工作职责</span>
                            <span className="person-detail-resume-exp-value person-detail-resume-exp-multiline">{item.responsibilities}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
          <Form.List name="workExperienceItems">
            {(fields, { add, remove }) => (
              <div>
                <div className="person-detail-form-list-header">
                  <span>工作/实践经历</span>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})} size="small">添加</Button>
                </div>
                {fields.map(({ key, name }) => (
                  <div key={key} className="person-detail-form-list-item">
                    <Form.Item name={[name, 'start_time']} label="开始时间">
                      <Input placeholder="如 2018-07" />
                    </Form.Item>
                    <Form.Item name={[name, 'end_time']} label="结束时间">
                      <Input placeholder="如 2020-12 或 至今" />
                    </Form.Item>
                    <Form.Item name={[name, 'organization']} label="机构">
                      <Input placeholder="机构名称" />
                    </Form.Item>
                    <Form.Item name={[name, 'department']} label="部门">
                      <Input placeholder="部门" />
                    </Form.Item>
                    <Form.Item name={[name, 'job']} label="职位">
                      <Input placeholder="职位/岗位" />
                    </Form.Item>
                    <Form.Item name={[name, 'responsibilities']} label="工作职责">
                      <Input.TextArea rows={2} placeholder="工作职责描述" />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} className="person-detail-form-list-remove">删除</Button>
                  </div>
                ))}
              </div>
            )}
          </Form.List>
          <Form.List name="educationExperienceItems">
            {(fields, { add, remove }) => (
              <div>
                <div className="person-detail-form-list-header">
                  <span>教育背景</span>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})} size="small">添加</Button>
                </div>
                {fields.map(({ key, name }) => (
                  <div key={key} className="person-detail-form-list-item">
                    <Form.Item name={[name, 'start_time']} label="开始时间">
                      <Input placeholder="如 2008-09" />
                    </Form.Item>
                    <Form.Item name={[name, 'end_time']} label="结束时间">
                      <Input placeholder="如 2012-06" />
                    </Form.Item>
                    <Form.Item name={[name, 'school_name']} label="学校">
                      <Input placeholder="学校名称" />
                    </Form.Item>
                    <Form.Item name={[name, 'department']} label="院系">
                      <Input placeholder="院系" />
                    </Form.Item>
                    <Form.Item name={[name, 'major']} label="专业">
                      <Input placeholder="专业" />
                    </Form.Item>
                    <Form.Item name={[name, 'degree']} label="学历">
                      <Input placeholder="如 学士、硕士、博士" />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} className="person-detail-form-list-remove">删除</Button>
                  </div>
                ))}
              </div>
            )}
          </Form.List>
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
