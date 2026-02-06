import { type FC, type ReactNode } from 'react';

/** 从结构化档案 JSON（snake_case）中取值的键 */
const pick = (obj: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

const str = (v: unknown): string =>
  v === undefined || v === null ? '' : String(v).trim();

const arr = (v: unknown): string[] => {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean);
  const s = str(v);
  if (!s) return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    return Array.isArray(parsed) ? parsed.map((x) => str(x)).filter(Boolean) : [s];
  } catch {
    return [s];
  }
};

/** 工作/教育经历单项（兼容旧字段与基于 JSON Schema 的新字段） */
interface ExperienceItem {
  // 通用时间字段（旧：start_time/end_time；新：start_date/end_date）
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  // 工作：organization/company、department、job/position、location、description
  organization?: string;
  company?: string;
  department?: string;
  job?: string;
  position?: string;
  location?: string;
  description?: string;
  // 教育：school_name/school、degree、major
  school_name?: string;
  school?: string;
  degree?: string;
  major?: string;
}

const parseExperience = (v: unknown): ExperienceItem[] => {
  if (v === undefined || v === null) return [];
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (!s) return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    const toItem = (raw: unknown): ExperienceItem | null => {
      if (!raw || typeof raw !== 'object') return null;
      const obj = raw as ExperienceItem;
      const item: ExperienceItem = { ...obj };
      // 时间字段归一化
      if (!item.start_time && item.start_date) item.start_time = item.start_date;
      if (!item.end_time && item.end_date) item.end_time = item.end_date;
      // 工作：company -> organization，position -> job
      if (!item.organization && item.company) item.organization = item.company;
      if (!item.job && item.position) item.job = item.position;
      // 教育：school -> school_name
      if (!item.school_name && item.school) item.school_name = item.school;
      return item;
    };
    if (Array.isArray(parsed)) {
      return parsed
        .map(toItem)
        .filter((x): x is ExperienceItem => x !== null);
    }
    const one = toItem(parsed);
    return one ? [one] : [];
  } catch {
    // ignore
  }
  return [];
};

/** 关系人单项 */
interface RelatedPersonItem {
  name?: string;
  relation?: string;
  brief?: string;
}

const parseRelatedPersons = (v: unknown): RelatedPersonItem[] => {
  if (v === undefined || v === null) return [];
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (!s) return [];
  try {
    const parsed = JSON.parse(s) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x) => x && typeof x === 'object') as RelatedPersonItem[];
    }
    if (parsed && typeof parsed === 'object') return [parsed as RelatedPersonItem];
  } catch {
    // ignore
  }
  return [];
};

const joinNonEmpty = (parts: string[], sep = ' ') =>
  parts.filter(Boolean).join(sep);

export interface ArchiveResumeViewProps {
  /** 与 person 表一致的结构化档案对象（snake_case） */
  data: Record<string, unknown>;
  className?: string;
  /** 在「基本信息」标题下方、人物姓名上方渲染的内容（如照片） */
  renderAfterBasicInfoTitle?: ReactNode;
}

const resumeSectionStyle: React.CSSProperties = {
  marginBottom: 16,
};
const resumeTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#262626',
  marginBottom: 8,
  paddingBottom: 4,
  borderBottom: '1px solid #f0f0f0',
};
const resumeRowStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#595959',
  marginBottom: 4,
  display: 'flex',
  gap: 8,
};
const resumeLabelStyle: React.CSSProperties = {
  flex: '0 0 90px',
  color: '#8c8c8c',
};
const resumeBlockStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: 10,
  background: '#fafafa',
  borderRadius: 6,
  fontSize: 13,
  color: '#595959',
};

const ArchiveResumeView: FC<ArchiveResumeViewProps> = ({ data, className, renderAfterBasicInfoTitle }) => {
  const chineseName = str(pick(data, 'chinese_name', 'chineseName'));
  const originalName = str(pick(data, 'original_name', 'originalName'));
  const gender = str(pick(data, 'gender'));
  const birthDate = str(pick(data, 'birth_date', 'birthDate'));
  const nationality = str(pick(data, 'nationality'));
  const nationalityCode = str(pick(data, 'nationality_code', 'nationalityCode'));
  const householdAddress = str(pick(data, 'household_address', 'householdAddress'));
  const highestEducation = str(pick(data, 'highest_education', 'highestEducation'));
  const organization = str(pick(data, 'organization'));
  const belongingGroup = str(pick(data, 'belonging_group', 'belongingGroup'));
  const personType = str(pick(data, 'person_type', 'personType'));
  const idCardNumber = str(pick(data, 'id_card_number', 'idCardNumber'));
  const remark = str(pick(data, 'remark'));

  const aliasNames = arr(pick(data, 'alias_names', 'aliasNames'));
  const idNumber = str(pick(data, 'id_number', 'idNumber'));
  const phoneNumbers = arr(pick(data, 'phone_numbers', 'phoneNumbers'));
  const emails = arr(pick(data, 'emails'));
  const passportNumbers = arr(pick(data, 'passport_numbers', 'passportNumbers'));
  const visaType = str(pick(data, 'visa_type', 'visaType'));
  const visaNumber = str(pick(data, 'visa_number', 'visaNumber'));
  const twitterAccounts = arr(pick(data, 'twitter_accounts', 'twitterAccounts'));
  const linkedinAccounts = arr(pick(data, 'linkedin_accounts', 'linkedinAccounts'));
  const facebookAccounts = arr(pick(data, 'facebook_accounts', 'facebookAccounts'));
  const personTags = arr(pick(data, 'person_tags', 'personTags'));

  const workItems = parseExperience(pick(data, 'work_experience', 'workExperience'));
  const educationItems = parseExperience(
    pick(data, 'education_experience', 'educationExperience')
  );
  const relatedPersons = parseRelatedPersons(pick(data, 'related_persons', 'relatedPersons'));

  const displayName = chineseName || originalName || '—';
  const hasBasic =
    displayName !== '—' ||
    gender ||
    birthDate ||
    nationality ||
    nationalityCode ||
    householdAddress ||
    highestEducation ||
    organization ||
    belongingGroup ||
    personType;
  const hasContact =
    idCardNumber ||
    idNumber ||
    phoneNumbers.length > 0 ||
    emails.length > 0 ||
    passportNumbers.length > 0 ||
    visaType ||
    visaNumber;
  const hasSocial =
    twitterAccounts.length > 0 ||
    linkedinAccounts.length > 0 ||
    facebookAccounts.length > 0;
  const hasEducation = educationItems.length > 0;
  const hasWork = workItems.length > 0;
  const hasRelations = relatedPersons.length > 0;
  const hasOther = aliasNames.length > 0 || personTags.length > 0 || remark || hasRelations;

  if (
    !hasBasic &&
    !hasContact &&
    !hasSocial &&
    !hasEducation &&
    !hasWork &&
    !hasOther
  ) {
    return (
      <div className={className} style={{ color: '#8c8c8c', fontSize: 13 }}>
        暂无结构化档案内容
      </div>
    );
  }

  return (
    <div className={className} style={{ fontSize: 13 }}>
      {hasBasic && (
        <div style={resumeSectionStyle}>
          <div style={resumeTitleStyle}>基本信息</div>
          {renderAfterBasicInfoTitle}
          {(chineseName || originalName) && (
            <div style={{ ...resumeRowStyle, fontSize: 15, fontWeight: 600, color: '#262626', marginBottom: 8 }}>
              {displayName}
              {aliasNames.length > 0 && (
                <span style={{ fontWeight: 400, color: '#8c8c8c', marginLeft: 8 }}>
                  别名：{aliasNames.join('、')}
                </span>
              )}
            </div>
          )}
          {gender && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>性别</span>
              <span>{gender}</span>
            </div>
          )}
          {birthDate && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>出生日期</span>
              <span>{birthDate}</span>
            </div>
          )}
          {(nationality || nationalityCode) && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>国籍</span>
              <span>{joinNonEmpty([nationality, nationalityCode ? `(${nationalityCode})` : ''])}</span>
            </div>
          )}
          {householdAddress && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>户籍地址</span>
              <span>{householdAddress}</span>
            </div>
          )}
          {organization && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>所在机构</span>
              <span>{organization}</span>
            </div>
          )}
          {belongingGroup && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>所属群体</span>
              <span>{belongingGroup}</span>
            </div>
          )}
          {highestEducation && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>最高学历</span>
              <span>{highestEducation}</span>
            </div>
          )}
          {personType && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>人物类型</span>
              <span>{personType}</span>
            </div>
          )}
        </div>
      )}

      {hasContact && (
        <div style={resumeSectionStyle}>
          <div style={resumeTitleStyle}>证件与联系方式</div>
          {idCardNumber && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>身份证号</span>
              <span>{idCardNumber}</span>
            </div>
          )}
          {idNumber && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>证件号码</span>
              <span>{idNumber}</span>
            </div>
          )}
          {phoneNumbers.length > 0 && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>手机号码</span>
              <span>{phoneNumbers.join('、')}</span>
            </div>
          )}
          {emails.length > 0 && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>邮箱</span>
              <span>{emails.join('、')}</span>
            </div>
          )}
          {passportNumbers.length > 0 && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>护照号</span>
              <span>{passportNumbers.join('、')}</span>
            </div>
          )}
          {visaType && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>签证类型</span>
              <span>{visaType}</span>
            </div>
          )}
          {visaNumber && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>签证号码</span>
              <span>{visaNumber}</span>
            </div>
          )}
        </div>
      )}

      {hasSocial && (
        <div style={resumeSectionStyle}>
          <div style={resumeTitleStyle}>社交账号</div>
          {twitterAccounts.length > 0 && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>Twitter</span>
              <span>{twitterAccounts.join('、')}</span>
            </div>
          )}
          {linkedinAccounts.length > 0 && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>LinkedIn</span>
              <span>{linkedinAccounts.join('、')}</span>
            </div>
          )}
          {facebookAccounts.length > 0 && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>Facebook</span>
              <span>{facebookAccounts.join('、')}</span>
            </div>
          )}
        </div>
      )}

      {hasEducation && (
        <div style={resumeSectionStyle}>
          <div style={resumeTitleStyle}>教育经历</div>
          {educationItems.map((item, i) => (
            <div key={i} style={resumeBlockStyle}>
              <div>
                {joinNonEmpty([
                  str(item.start_time),
                  str(item.end_time),
                ].filter(Boolean), ' — ')}
              </div>
              <div style={{ fontWeight: 500, marginTop: 4 }}>
                {str(item.school_name)}
              </div>
              {(str(item.degree) || str(item.major)) && (
                <div style={{ marginTop: 2, color: '#8c8c8c' }}>
                  {joinNonEmpty([str(item.degree), str(item.major)], ' · ')}
                </div>
              )}
              {str(item.location) && (
                <div style={{ marginTop: 2 }}>
                  地点：{str(item.location)}
                </div>
              )}
              {str(item.description) && (
                <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>
                  说明：{str(item.description)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasWork && (
        <div style={resumeSectionStyle}>
          <div style={resumeTitleStyle}>工作经历</div>
          {workItems.map((item, i) => (
            <div key={i} style={resumeBlockStyle}>
              <div>
                {joinNonEmpty([
                  str(item.start_time),
                  str(item.end_time),
                ].filter(Boolean), ' — ')}
              </div>
              <div style={{ fontWeight: 500, marginTop: 4 }}>
                {str(item.organization)}
              </div>
              {(str(item.department) || str(item.job)) && (
                <div style={{ marginTop: 2, color: '#8c8c8c' }}>
                  {joinNonEmpty([str(item.department), str(item.job)], ' · ')}
                </div>
              )}
              {str(item.location) && (
                <div style={{ marginTop: 2 }}>
                  地点：{str(item.location)}
                </div>
              )}
              {str(item.description) && (
                <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>
                  说明：{str(item.description)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasOther && (
        <div style={resumeSectionStyle}>
          <div style={resumeTitleStyle}>其他</div>
          {personTags.length > 0 && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>标签</span>
              <span>{personTags.join('、')}</span>
            </div>
          )}
          {hasRelations && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ ...resumeRowStyle, marginBottom: 4 }}>
                <span style={resumeLabelStyle}>关系人</span>
                <span />
              </div>
              {relatedPersons.map((rp, idx) => (
                <div key={idx} style={{ ...resumeBlockStyle, marginBottom: 6 }}>
                  <div style={{ fontWeight: 500 }}>
                    {str(rp.name) || '（未提供姓名）'}
                  </div>
                  {str(rp.relation) && (
                    <div style={{ marginTop: 2, color: '#8c8c8c' }}>
                      关系：{str(rp.relation)}
                    </div>
                  )}
                  {str(rp.brief) && (
                    <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>
                      简介：{str(rp.brief)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {remark && (
            <div style={resumeRowStyle}>
              <span style={resumeLabelStyle}>备注</span>
              <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{remark}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchiveResumeView;
