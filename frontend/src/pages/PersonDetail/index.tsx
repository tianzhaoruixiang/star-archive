import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Empty, Drawer, Form, Input, Select, DatePicker, Switch, message, Popconfirm, Upload, Spin, Tabs } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ArrowLeftOutlined, EditOutlined, UserOutlined, ReadOutlined, BankOutlined, HeartOutlined, HeartFilled, AuditOutlined, IdcardOutlined, PlusOutlined, DeleteOutlined, ShareAltOutlined, HistoryOutlined, SendOutlined, CarOutlined, CameraOutlined, TeamOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonDetail } from '@/store/slices/personSlice';
import { personAPI, favoriteAPI, systemConfigAPI, BASE_PATH, type PersonUpdatePayload, type PersonEditHistoryItem, type SystemConfigDTO } from '@/services/api';
import type { PersonTravelItem, SocialDynamicItem, RelatedPersonItem } from '@/types/person';
import { formatDateOnly, formatDateTime } from '@/utils/date';
import { PageDetailSkeleton, InlineSkeleton } from '@/components/SkeletonPresets';
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

/** 关系人 JSON 解析（每项含 name、relation、brief） */
function parseRelatedPersonsJson(raw: string | undefined): RelatedPersonItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const arr = Array.isArray(parsed) ? (parsed as RelatedPersonItem[]) : parsed && typeof parsed === 'object' ? [parsed as RelatedPersonItem] : [];
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
  maritalStatus?: string;
  birthDate?: Dayjs | null;
  nationality?: string;
  householdAddress?: string;
  highestEducation?: string;
  phoneNumbersText?: string;
  emailsText?: string;
  idCardNumber?: string;
  /** 证件号码 */
  idNumber?: string;
  /** 主护照号 */
  passportNumber?: string;
  /** 护照类型 */
  passportType?: string;
  visaType?: string;
  visaNumber?: string;
  personTags?: string[];
  workExperienceItems?: WorkItemForm[];
  educationExperienceItems?: EducationItemForm[];
  /** 关系人表单项（name、relation、brief） */
  relatedPersonItems?: { name?: string; relation?: string; brief?: string }[];
  remark?: string;
  isKeyPerson?: boolean;
  isPublic?: boolean;
}

const PersonDetail = () => {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { detail, loading } = useAppSelector((state) => state.person);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editHistory, setEditHistory] = useState<PersonEditHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfigDTO | null>(null);
  const [form] = Form.useForm<EditFormValues>();
  const user = useAppSelector((state) => state.auth?.user);
  const showPersonDetailEdit = systemConfig?.showPersonDetailEdit !== false;
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  /** 智能画像抽屉 */
  const [portraitDrawerOpen, setPortraitDrawerOpen] = useState(false);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [portraitText, setPortraitText] = useState('');
  const portraitTypingTimerRef = useRef<number | null>(null);
  /** 民航铁路信息默认只展示条数，更多需点开展示 */
  const TRAVEL_DEFAULT_SHOW = 10;
  const HISTORY_DEFAULT_SHOW = 20;
  const SOCIAL_DEFAULT_SHOW = 50;
  const [travelExpanded, setTravelExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [socialExpanded, setSocialExpanded] = useState(false);
  const canDelete =
    detail &&
    user?.username &&
    ((detail.isPublic !== false && user?.role === 'admin') ||
      (detail.isPublic === false && user.username === detail.createdBy));
  const showDelete = canDelete && detail && !detail.deleted;

  /** 收藏状态（仅登录用户） */
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  useEffect(() => {
    if (!personId || !user?.username) {
      setIsFavorited(false);
      return;
    }
    favoriteAPI.check(personId).then(setIsFavorited).catch(() => setIsFavorited(false));
  }, [personId, user?.username]);

  const toggleFavorite = useCallback(async () => {
    if (!personId || !user?.username) return;
    setFavoriteLoading(true);
    try {
      if (isFavorited) {
        await favoriteAPI.remove(personId);
        setIsFavorited(false);
        message.success('已取消收藏');
      } else {
        await favoriteAPI.add(personId);
        setIsFavorited(true);
        message.success('已加入收藏');
      }
    } catch (e) {
      message.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (isFavorited ? '取消收藏失败' : '收藏失败'));
    } finally {
      setFavoriteLoading(false);
    }
  }, [personId, user?.username, isFavorited]);

  useEffect(() => {
    if (personId) dispatch(fetchPersonDetail(personId));
  }, [dispatch, personId]);

  useEffect(() => {
    setTravelExpanded(false);
    setHistoryExpanded(false);
    setSocialExpanded(false);
  }, [personId]);

  /** 人物切换时清空智能画像结果 */
  useEffect(() => {
    setPortraitText('');
  }, [personId]);

  useEffect(() => {
    const loadConfig = () => {
      systemConfigAPI
        .getPublicConfig()
        .then((res: { data?: SystemConfigDTO }) => {
          const data = res?.data ?? res;
          setSystemConfig(data && typeof data === 'object' ? (data as SystemConfigDTO) : null);
        })
        .catch(() => setSystemConfig(null));
    };
    loadConfig();
    window.addEventListener('system-config-updated', loadConfig);
    return () => window.removeEventListener('system-config-updated', loadConfig);
  }, []);

  useEffect(() => {
    if (!personId) return;
    setHistoryLoading(true);
    personAPI
      .getEditHistory(personId)
      .then((res: { data?: PersonEditHistoryItem[] }) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setEditHistory(list);
      })
      .catch(() => setEditHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [personId]);

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
    const relatedItems = parseRelatedPersonsJson(detail.relatedPersons).map((item) => ({
      name: (item.name as string) || undefined,
      relation: (item.relation as string) || undefined,
      brief: (item.brief as string) || undefined,
    }));
    form.setFieldsValue({
      chineseName: detail.chineseName ?? '',
      originalName: detail.originalName ?? '',
      organization: detail.organization ?? '',
      belongingGroup: detail.belongingGroup ?? '',
      gender: detail.gender ?? undefined,
      maritalStatus: detail.maritalStatus ?? '',
      birthDate: birth ?? undefined,
      nationality: detail.nationality ?? '',
      householdAddress: detail.householdAddress ?? '',
      highestEducation: detail.highestEducation ?? '',
      phoneNumbersText: (detail.phoneNumbers ?? []).join('\n'),
      emailsText: (detail.emails ?? []).join('\n'),
      idCardNumber: detail.idCardNumber ?? '',
      idNumber: detail.idNumber ?? '',
      passportNumber: detail.passportNumber ?? '',
      passportType: detail.passportType ?? '',
      visaType: detail.visaType ?? '',
      visaNumber: detail.visaNumber ?? '',
      personTags: detail.personTags ?? [],
      workExperienceItems: workItems.length ? workItems : [{ start_time: '', end_time: '', organization: '', department: '', job: '', responsibilities: '' }],
      educationExperienceItems: eduItems.length ? eduItems : [{ start_time: '', end_time: '', school_name: '', department: '', major: '', degree: '' }],
      relatedPersonItems: relatedItems.length ? relatedItems : [{ name: '', relation: '', brief: '' }],
      remark: detail.remark ?? '',
      isKeyPerson: detail.isKeyPerson ?? false,
      isPublic: detail.isPublic !== false,
    });
    setEditOpen(true);
  }, [detail, form]);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    form.resetFields();
  }, [form]);

  /** 请求智能画像（抽屉内调用或打开抽屉时自动调用） */
  const fetchPortraitAnalysis = useCallback(async () => {
    if (!personId) return;
    if (portraitTypingTimerRef.current) {
      window.clearTimeout(portraitTypingTimerRef.current);
      portraitTypingTimerRef.current = null;
    }
    setPortraitText('');
    setPortraitLoading(true);
    try {
      const text = await personAPI.getPortraitAnalysis(personId);
      const full = (text ?? '').toString();
      if (!full) {
        setPortraitText('');
      } else {
        let index = 0;
        const typeNext = () => {
          index += 1;
          setPortraitText(full.slice(0, index));
          if (index < full.length) {
            portraitTypingTimerRef.current = window.setTimeout(typeNext, 30);
          } else {
            portraitTypingTimerRef.current = null;
          }
        };
        typeNext();
      }
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? '智能画像请求失败');
      setPortraitText('');
    } finally {
      setPortraitLoading(false);
    }
  }, [personId]);

  /** 打开智能画像抽屉：若当前无结果则自动请求 */
  const openPortraitDrawer = useCallback(() => {
    setPortraitDrawerOpen(true);
    if (!portraitText && personId) {
      fetchPortraitAnalysis();
    }
  }, [personId, portraitText, fetchPortraitAnalysis]);

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
      maritalStatus: values.maritalStatus || undefined,
      birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
      nationality: values.nationality || undefined,
      householdAddress: values.householdAddress || undefined,
      highestEducation: values.highestEducation || undefined,
      phoneNumbers: phones.length ? phones : undefined,
      emails: emails.length ? emails : undefined,
      idCardNumber: values.idCardNumber || undefined,
      idNumber: values.idNumber || undefined,
      passportNumber: values.passportNumber || undefined,
      passportType: values.passportType || undefined,
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
      relatedPersons: (() => {
        const items = values.relatedPersonItems ?? [];
        const valid = items.filter((i) => (i.name ?? i.relation ?? i.brief ?? '').toString().trim());
        return valid.length ? JSON.stringify(valid) : undefined;
      })(),
      remark: values.remark || undefined,
      isKeyPerson: values.isKeyPerson,
      isPublic: values.isPublic,
    };
    setSubmitting(true);
    try {
      await personAPI.updatePerson(personId, payload, user?.username);
      message.success('保存成功');
      closeEdit();
      dispatch(fetchPersonDetail(personId));
      personAPI.getEditHistory(personId).then((res: { data?: PersonEditHistoryItem[] }) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        setEditHistory(list);
      });
    } catch (e) {
      message.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '保存失败');
    } finally {
      setSubmitting(false);
    }
  }, [form, personId, closeEdit, dispatch, user?.username]);

  const educationList = useMemo(
    () => parseExperienceJson(detail?.educationExperience),
    [detail?.educationExperience]
  );
  const workList = useMemo(
    () => parseExperienceJson(detail?.workExperience),
    [detail?.workExperience]
  );
  const relatedPersonList = useMemo(
    () => parseRelatedPersonsJson(detail?.relatedPersons),
    [detail?.relatedPersons]
  );

  const phoneStr = detail?.phoneNumbers?.length
    ? detail.phoneNumbers.join('、')
    : '—';
  const emailStr = detail?.emails?.length
    ? detail.emails.join('、')
    : '—';
  const aliasStr = detail?.aliasNames?.length
    ? detail.aliasNames.join('、')
    : '—';
  const passportStr = detail?.passportNumbers?.length
    ? detail.passportNumbers.join('、')
    : '—';
  const twitterStr = detail?.twitterAccounts?.length
    ? detail.twitterAccounts.join('、')
    : '—';
  const linkedinStr = detail?.linkedinAccounts?.length
    ? detail.linkedinAccounts.join('、')
    : '—';
  const facebookStr = detail?.facebookAccounts?.length
    ? detail.facebookAccounts.join('、')
    : '—';
  const tags = detail?.personTags ?? [];
  const occupationOrOrg = detail?.organization || tags[0] || detail?.highestEducation || '—';

  if (loading && !detail) {
    return (
      <div className="page-wrapper person-detail-page">
        <div className="person-detail-loading">
          <PageDetailSkeleton />
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
          type="default"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/persons')}
          className="person-detail-header-btn"
        >
          返回
        </Button>
        {showPersonDetailEdit && !detail.deleted && (
          <Button
            type="default"
            icon={<EditOutlined />}
            onClick={openEdit}
            className="person-detail-header-btn"
          >
            编辑
          </Button>
        )}
        {showDelete && personId && (
          <Popconfirm
            title="确定删除该人员档案？"
            description="删除后仅管理员（公开档案）或创建人（个人档案）可查看，列表中将不再展示。"
            onConfirm={async () => {
              setDeleting(true);
              try {
                await personAPI.deletePerson(personId);
                message.success('已删除');
                navigate('/persons');
              } catch (e) {
                message.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '删除失败');
              } finally {
                setDeleting(false);
              }
            }
            }
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="default"
              danger
              icon={<DeleteOutlined />}
              loading={deleting}
              className="person-detail-header-btn"
            >
              删除
            </Button>
          </Popconfirm>
        )}
        {!detail.deleted && (
          <Button
            type="default"
            icon={<FileTextOutlined />}
            onClick={openPortraitDrawer}
            className="person-detail-header-btn"
          >
            智能画像
          </Button>
        )}
        {user?.username && !detail.deleted && (
          <Button
            type={isFavorited ? 'primary' : 'default'}
            icon={isFavorited ? <HeartFilled /> : <HeartOutlined />}
            onClick={toggleFavorite}
            loading={favoriteLoading}
            className="person-detail-header-btn"
          >
            {isFavorited ? '已收藏' : '收藏'}
          </Button>
        )}
      </div>

      {/* 简历式主体：顶带 + 双栏 */}
      <div className="person-detail-resume">
        {/* 顶带：RESUME 角标 + 姓名 + 身份/意向 */}
        <div className="person-detail-resume-head">
          {detail.deleted && (
            <Tag color="default" className="person-detail-deleted-tag">已删除</Tag>
          )}
          <div className="person-detail-resume-head-right">
            <h1 className="person-detail-resume-name">{displayName}</h1>
            <p className="person-detail-resume-intent">{occupationOrOrg}</p>
          </div>
        </div>

        <Tabs defaultActiveKey="info" destroyInactiveTabPane className="person-detail-tabs">
          <Tabs.TabPane tab={<span><UserOutlined /> 人物信息</span>} key="info">
            <div className="person-detail-resume-body">
          {/* 左栏：多头像（一大图 + 下方小图）、人物备注、技能标签等 */}
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
                  <img
                    src={`${BASE_PATH}/default-avatar.svg`}
                    alt="默认头像"
                    className="person-detail-resume-avatar-img person-detail-default-avatar"
                  />
                </div>
              )}
              {showPersonDetailEdit && !detail.deleted && personId && (
                <Upload
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    const formData = new FormData();
                    formData.append('file', file);
                    setAvatarUploading(true);
                    personAPI
                      .uploadAvatar(personId, formData, user?.username)
                      .then(() => {
                        message.success('头像上传成功');
                        dispatch(fetchPersonDetail(personId));
                      })
                      .catch((err: { response?: { data?: { message?: string } } }) => {
                        message.error(err?.response?.data?.message ?? '头像上传失败');
                      })
                      .finally(() => setAvatarUploading(false));
                    return false;
                  }}
                >
                  <Button
                    type="default"
                    size="small"
                    icon={<CameraOutlined />}
                    loading={avatarUploading}
                    className="person-detail-avatar-upload-btn"
                  >
                    上传头像
                  </Button>
                </Upload>
              )}
            </div>

            {detail.remark && (
              <div className="person-detail-resume-block">
                <div className="person-detail-resume-block-title">
                  <UserOutlined />
                  <span>人物备注</span>
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

            <div className="person-detail-resume-block">
              <div className="person-detail-resume-block-title">
                <ReadOutlined />
                <span>档案可见性</span>
              </div>
              <div className="person-detail-resume-info-grid" style={{ display: 'block' }}>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">是否公开档案</span>
                  <span className="info-value">{detail.isPublic !== false ? '公开（所有人可见）' : '私有（仅创建人可见）'}</span>
                </div>
                {detail.createdBy && (
                  <div className="person-detail-resume-info-item">
                    <span className="info-label">创建人</span>
                    <span className="info-value">{detail.createdBy}</span>
                  </div>
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
                  <span className="info-label">人物编号</span>
                  <span className="info-value">{detail.personId || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">中文姓名</span>
                  <span className="info-value">{detail.chineseName || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">外文姓名</span>
                  <span className="info-value">{detail.originalName || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">别名</span>
                  <span className="info-value">{aliasStr}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">性别</span>
                  <span className="info-value">{detail.gender || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">婚姻现状</span>
                  <span className="info-value">{detail.maritalStatus || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">出生日期</span>
                  <span className="info-value">{formatDateOnly(detail.birthDate)}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">国籍</span>
                  <span className="info-value">{detail.nationality || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">国籍代码</span>
                  <span className="info-value">{detail.nationalityCode || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">户籍地址</span>
                  <span className="info-value">{detail.householdAddress || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">最高学历</span>
                  <span className="info-value">{detail.highestEducation || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">所属机构</span>
                  <span className="info-value">{detail.organization || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">所属群体</span>
                  <span className="info-value">{detail.belongingGroup || '—'}</span>
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
                  <span className="info-label">身份证号</span>
                  <span className="info-value">{detail.idCardNumber || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">证件号码</span>
                  <span className="info-value">{detail.idNumber || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">主护照号</span>
                  <span className="info-value">{detail.passportNumber || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">护照号</span>
                  <span className="info-value">{passportStr}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">护照类型</span>
                  <span className="info-value">{detail.passportType || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">签证类型</span>
                  <span className="info-value">{detail.visaType || '—'}</span>
                </div>
                <div className="person-detail-resume-info-item">
                  <span className="info-label">签证号码</span>
                  <span className="info-value">{detail.visaNumber || '—'}</span>
                </div>
              </div>
            </div>

            {(twitterStr !== '—' || linkedinStr !== '—' || facebookStr !== '—') && (
              <div className="person-detail-resume-block">
                <div className="person-detail-resume-block-title">
                  <ShareAltOutlined />
                  <span>社交账号</span>
                </div>
                <div className="person-detail-resume-social-list">
                  {twitterStr !== '—' && (
                    <div className="person-detail-resume-social-item">
                      <span className="person-detail-resume-social-label">Twitter / X</span>
                      <span className="person-detail-resume-social-value">{twitterStr}</span>
                    </div>
                  )}
                  {linkedinStr !== '—' && (
                    <div className="person-detail-resume-social-item">
                      <span className="person-detail-resume-social-label">领英</span>
                      <span className="person-detail-resume-social-value">{linkedinStr}</span>
                    </div>
                  )}
                  {facebookStr !== '—' && (
                    <div className="person-detail-resume-social-item">
                      <span className="person-detail-resume-social-label">Facebook</span>
                      <span className="person-detail-resume-social-value">{facebookStr}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {educationList.length > 0 && (
              <div className="person-detail-resume-block">
                <div className="person-detail-resume-block-title">
                  <ReadOutlined />
                  <span>教育背景</span>
                </div>
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
              </div>
            )}

            {workList.length > 0 && (
              <div className="person-detail-resume-block">
                <div className="person-detail-resume-block-title">
                  <BankOutlined />
                  <span>工作/实践经历</span>
                </div>
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
              </div>
            )}

            {relatedPersonList.length > 0 && (
              <div className="person-detail-resume-block">
                <div className="person-detail-resume-block-title">
                  <TeamOutlined />
                  <span>关系人</span>
                </div>
                <div className="person-detail-resume-exp-list">
                  {relatedPersonList.map((item, idx) => (
                    <div key={idx} className="person-detail-resume-exp-item person-detail-resume-exp-full">
                      {item.name && (
                        <div className="person-detail-resume-exp-row">
                          <span className="person-detail-resume-exp-label">关系人名称</span>
                          <span className="person-detail-resume-exp-value">{item.name}</span>
                        </div>
                      )}
                      {item.relation && (
                        <div className="person-detail-resume-exp-row">
                          <span className="person-detail-resume-exp-label">关系名称</span>
                          <span className="person-detail-resume-exp-value">{item.relation}</span>
                        </div>
                      )}
                      {item.brief && (
                        <div className="person-detail-resume-exp-row">
                          <span className="person-detail-resume-exp-label">关系人简介</span>
                          <span className="person-detail-resume-exp-value person-detail-resume-exp-multiline">{item.brief}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="person-detail-resume-block">
              <div className="person-detail-resume-block-title">
                <HistoryOutlined />
                <span>编辑历史</span>
              </div>
              {historyLoading ? (
                <div className="person-detail-history-loading">
                  <InlineSkeleton lines={3} />
                </div>
              ) : editHistory.length === 0 ? (
                <div className="person-detail-resume-empty">
                  <span>暂无编辑记录</span>
                </div>
              ) : (
                <div className="person-detail-history-list">
                  {(historyExpanded ? editHistory : editHistory.slice(0, HISTORY_DEFAULT_SHOW)).map((h) => (
                    <div key={h.historyId} className="person-detail-history-item">
                      <div className="person-detail-history-meta">
                        <span className="person-detail-history-time">
                          {formatDateTime(h.editTime, '')}
                        </span>
                        {h.editor && (
                          <span className="person-detail-history-editor">{h.editor}</span>
                        )}
                      </div>
                      <ul className="person-detail-history-changes">
                        {(h.changes ?? []).map((c, i) => (
                          <li key={i}>
                            <span className="person-detail-history-label">{c.label}</span>
                            <span className="person-detail-history-old">{c.oldVal}</span>
                            <span className="person-detail-history-arrow">→</span>
                            <span className="person-detail-history-new">{c.newVal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {editHistory.length > HISTORY_DEFAULT_SHOW && (
                    <Button
                      type="link"
                      size="small"
                      className="person-detail-history-expand-btn"
                      onClick={() => setHistoryExpanded((prev) => !prev)}
                    >
                      {historyExpanded ? '收起编辑记录' : `展开更多编辑记录（共 ${editHistory.length} 条）`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </main>
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab={<span><SendOutlined /> 行程轨迹</span>} key="travel">
            <div className="person-detail-tab-panel">
              {(detail.recentTravels?.length ?? 0) > 0 ? (
                <Card className="person-detail-resume-extra-card" title="民航铁路信息" size="small">
                  <ul className="person-detail-travel-list">
                    {(travelExpanded ? detail.recentTravels! : detail.recentTravels!.slice(0, TRAVEL_DEFAULT_SHOW)).map((t: PersonTravelItem) => (
                      <li key={t.travelId ?? t.eventTime}>
                        <span className="time">{formatDateTime(t.eventTime, '')}</span>
                        {t.travelType === 'FLIGHT' ? (
                          <><SendOutlined className="person-detail-travel-icon person-detail-travel-icon-flight" /> 航班</>
                        ) : (
                          <><CarOutlined className="person-detail-travel-icon person-detail-travel-icon-train" /> 火车</>
                        )}：{(t.departureCity && t.destinationCity) ? `${t.departureCity} → ${t.destinationCity}` : `${t.departure ?? ''} → ${t.destination ?? ''}`}
                        {t.ticketNumber && ` · 票号 ${t.ticketNumber}`}
                        {t.visaType && ` · 签证 ${t.visaType}`}
                      </li>
                    ))}
                  </ul>
                  {detail.recentTravels!.length > TRAVEL_DEFAULT_SHOW && (
                    <Button type="link" size="small" className="person-detail-travel-expand-btn" onClick={() => setTravelExpanded((prev) => !prev)}>
                      {travelExpanded ? '收起' : `展开更多（共 ${detail.recentTravels!.length} 条）`}
                    </Button>
                  )}
                </Card>
              ) : (
                <Empty description="暂无行程轨迹" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Tabs.TabPane>
          <Tabs.TabPane tab={<span><ShareAltOutlined /> 社交动态</span>} key="social">
            <div className="person-detail-tab-panel">
              {(detail.recentSocialDynamics?.length ?? 0) > 0 ? (
                <Card className="person-detail-resume-extra-card" title="社交媒体动态" size="small">
                  <ul className="person-detail-social-list">
                    {(socialExpanded
                      ? detail.recentSocialDynamics!
                      : detail.recentSocialDynamics!.slice(0, SOCIAL_DEFAULT_SHOW)
                    ).map((s: SocialDynamicItem) => (
                      <li key={s.dynamicId}>
                        <Tag color="blue">{s.socialAccountType}</Tag> {s.socialAccount}
                        <div className="content">{s.content?.substring(0, 200)}</div>
                        <div className="time">{formatDateTime(s.publishTime, '')}</div>
                      </li>
                    ))}
                  </ul>
                  {detail.recentSocialDynamics!.length > SOCIAL_DEFAULT_SHOW && (
                    <Button
                      type="link"
                      size="small"
                      className="person-detail-social-expand-btn"
                      onClick={() => setSocialExpanded((prev) => !prev)}
                    >
                      {socialExpanded ? '收起' : `展开更多（共 ${detail.recentSocialDynamics!.length} 条）`}
                    </Button>
                  )}
                </Card>
              ) : (
                <Empty description="暂无社交动态" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </Tabs.TabPane>
        </Tabs>
      </div>

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
          <Form.Item label="婚姻现状" name="maritalStatus">
            <Select
              placeholder="请选择"
              allowClear
              options={[
                { value: '未婚', label: '未婚' },
                { value: '已婚', label: '已婚' },
                { value: '离异', label: '离异' },
                { value: '丧偶', label: '丧偶' },
                { value: '其他', label: '其他' },
              ]}
            />
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
          <Form.Item label="证件号码" name="idNumber">
            <Input placeholder="请输入证件号码" />
          </Form.Item>
          <Form.Item label="主护照号" name="passportNumber">
            <Input placeholder="请输入主护照号" />
          </Form.Item>
          <Form.Item label="护照类型" name="passportType">
            <Input placeholder="如：普通护照、外交护照、公务护照、旅行证" />
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
          <Form.List name="relatedPersonItems">
            {(fields, { add, remove }) => (
              <div>
                <div className="person-detail-form-list-header">
                  <span>关系人</span>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})} size="small">添加</Button>
                </div>
                {fields.map(({ key, name }) => (
                  <div key={key} className="person-detail-form-list-item">
                    <Form.Item name={[name, 'name']} label="关系人名称">
                      <Input placeholder="关系人姓名或称呼" />
                    </Form.Item>
                    <Form.Item name={[name, 'relation']} label="关系名称">
                      <Input placeholder="如：配偶、同事、朋友" />
                    </Form.Item>
                    <Form.Item name={[name, 'brief']} label="关系人简介">
                      <Input.TextArea rows={2} placeholder="关系人简介（可选）" />
                    </Form.Item>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} className="person-detail-form-list-remove">删除</Button>
                  </div>
                ))}
              </div>
            )}
          </Form.List>
          <Form.Item label="人物备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入人物备注" />
          </Form.Item>
          <Form.Item label="重点人员" name="isKeyPerson" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item label="是否公开档案" name="isPublic" valuePropName="checked" extra="公开：所有人可见；私有：仅创建人可见">
            <Switch checkedChildren="公开" unCheckedChildren="私有" />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 智能画像抽屉：右侧展示大模型生成的智能画像（与档案融合使用同一大模型配置） */}
      <Drawer
        title="智能画像"
        placement="right"
        width={480}
        open={portraitDrawerOpen}
        onClose={() => setPortraitDrawerOpen(false)}
        className="person-detail-portrait-drawer"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            loading={portraitLoading}
            onClick={fetchPortraitAnalysis}
          >
            重新生成
          </Button>
        }
      >
        {portraitLoading && !portraitText ? (
          <div className="person-detail-portrait-loading">
            <Spin size="large" tip="正在生成智能画像…" />
          </div>
        ) : (
          <div className="person-detail-portrait-content">
            <pre className="person-detail-portrait-text">{portraitText || '暂无分析内容，请点击「重新生成」获取智能画像。'}</pre>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PersonDetail;
