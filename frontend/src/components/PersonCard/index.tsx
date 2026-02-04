import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag } from 'antd';
import { formatDateOnly } from '@/utils/date';
import './index.css';

/** 统一人物卡片数据（与后端 PersonCardDTO 对齐），身份证式布局 */
export interface PersonCardData {
  personId: string;
  chineseName?: string;
  originalName?: string;
  /** 头像 URL（后端代理 /api/avatar?path= 或 SeaweedFS 路径） */
  avatarUrl?: string;
  /** 所属机构 */
  organization?: string;
  /** 所属群体 */
  belongingGroup?: string;
  /** 性别 */
  gender?: string;
  /** 国籍 */
  nationality?: string;
  /** 证件号码（单值） */
  idNumber?: string;
  idCardNumber?: string;
  /** 主护照号 */
  passportNumber?: string;
  /** 护照类型 */
  passportType?: string;
  birthDate?: string | number[] | unknown;
  personTags?: string[];
  isKeyPerson?: boolean;
  householdAddress?: string;
  phoneSummary?: string;
  remark?: string;
}

export interface PersonCardProps {
  person: PersonCardData;
  /** 点击卡片跳转详情，默认 true */
  clickable?: boolean;
  /** 底部是否展示「查看详情」链接（可选，身份证式布局下可不展示） */
  showActionLink?: boolean;
  actionLinkText?: string;
  /** 是否展示移除按钮（如重点人员从目录移除） */
  showRemove?: boolean;
  onRemove?: (e: React.MouseEvent, personId: string) => void;
  removing?: boolean;
  /** 卡片最小宽度（数字为 px，字符串如 '180px'） */
  minWidth?: number | string;
  /** 卡片最大宽度（数字为 px，字符串如 '320px'） */
  maxWidth?: number | string;
}

/** 人员类别：重点人员 / 普通人员 */
function getPersonCategory(isKeyPerson?: boolean): string {
  return isKeyPerson ? '重点人员' : '普通人员';
}

/** 显示姓名：中文名 或 英文名 或 首别名 */
function getDisplayName(person: PersonCardData): string {
  return person.chineseName || person.originalName || '—';
}

/** 显示所属：机构 或 群体 */
function getOrgOrGroup(person: PersonCardData): string {
  return person.organization || person.belongingGroup || '—';
}

/** 显示证件号：证件号码 或 身份证号 */
function getDisplayIdNumber(person: PersonCardData): string {
  return person.idNumber || person.idCardNumber || '—';
}

const PersonCard: FC<PersonCardProps> = ({
  person,
  clickable = true,
  showActionLink,
  actionLinkText = '查看详情',
  showRemove = false,
  onRemove,
  removing = false,
  minWidth,
  maxWidth,
}) => {
  const navigate = useNavigate();
  const displayName = getDisplayName(person);
  const handleClick = () => {
    if (clickable) navigate(`/persons/${person.personId}`);
  };
  const cardStyle: React.CSSProperties = {};
  if (minWidth != null) cardStyle.minWidth = typeof minWidth === 'number' ? `${minWidth}px` : minWidth;
  if (maxWidth != null) cardStyle.maxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  const tags = person.personTags || [];
  const birthStr = formatDateOnly(person.birthDate as Parameters<typeof formatDateOnly>[0]);

  return (
    <Card className="person-card person-card-id-style" style={cardStyle} onClick={handleClick}>
      <div className="person-card-id-layout">
        {/* 左侧：长方形头像 + 人员类别 */}
        <div className="person-card-id-left">
          <div className="person-card-id-photo-wrap">
            {person.avatarUrl ? (
              <img src={person.avatarUrl} alt={displayName} className="person-card-id-photo" />
            ) : (
              <div className="person-card-id-photo-placeholder">{displayName.charAt(0)}</div>
            )}
          </div>
          <div className="person-card-id-category">{getPersonCategory(person.isKeyPerson)}</div>
        </div>
        {/* 右侧：姓名、所属、性别、国籍、出生日期、证件号 */}
        <div className="person-card-id-right">
          <div className="person-card-id-name">{displayName}</div>
          <div className="person-card-id-row">{getOrgOrGroup(person)}</div>
          <div className="person-card-id-row">{person.gender || '—'}</div>
          <div className="person-card-id-row">{person.nationality || '—'}</div>
          <div className="person-card-id-row">{birthStr || '—'}</div>
          <div className="person-card-id-row person-card-id-idno">{getDisplayIdNumber(person)}</div>
        </div>
      </div>
      {/* 底部：标签，超出省略 */}
      {tags.length > 0 && (
        <div className="person-card-id-tags-wrap" title={tags.join('、')}>
          <div className="person-card-id-tags">
            {tags.map((tag, idx) => (
              <Tag key={idx} className="person-card-id-tag">
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      )}
      {showActionLink && clickable && (
        <div className="person-card-id-action">
          <span role="button" tabIndex={0} className="person-card-link" onClick={(e) => { e.stopPropagation(); navigate(`/persons/${person.personId}`); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/persons/${person.personId}`); } }}>
            {actionLinkText}
          </span>
        </div>
      )}
      {showRemove && onRemove && (
        <button
          type="button"
          className="person-card-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e, person.personId);
          }}
          disabled={removing}
        >
          {removing ? '移除中…' : '移除'}
        </button>
      )}
    </Card>
  );
};

export default PersonCard;
