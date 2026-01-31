import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag } from 'antd';
import { LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import { formatDateOnly } from '@/utils/date';
import './index.css';

/** 统一人物卡片数据（与后端 PersonCardDTO 对齐） */
export interface PersonCardData {
  personId: string;
  chineseName?: string;
  originalName?: string;
  /** 头像 URL（后端代理 /api/avatar?path= 或 SeaweedFS 路径） */
  avatarUrl?: string;
  idCardNumber?: string;
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
  /** 底部是否展示「查看详情」链接，默认 true */
  showActionLink?: boolean;
  actionLinkText?: string;
  /** 是否展示移除按钮（如重点人员从目录移除） */
  showRemove?: boolean;
  onRemove?: (e: React.MouseEvent, personId: string) => void;
  removing?: boolean;
}

const PersonCard: FC<PersonCardProps> = ({
  person,
  clickable = true,
  showActionLink = true,
  actionLinkText = '查看详情',
  showRemove = false,
  onRemove,
  removing = false,
}) => {
  const navigate = useNavigate();
  const displayName = person.chineseName || person.originalName || '—';
  const handleClick = () => {
    if (clickable) navigate(`/persons/${person.personId}`);
  };
  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickable) navigate(`/persons/${person.personId}`);
  };

  return (
    <Card className="person-card" onClick={handleClick}>
      <div className="person-card-avatar-wrap">
        {person.avatarUrl ? (
          <img src={person.avatarUrl} alt={displayName} className="person-card-avatar-img" />
        ) : (
          <div className="person-card-avatar">{displayName.charAt(0)}</div>
        )}
      </div>
      <div className="person-card-name">{displayName}</div>
      <div className="person-card-row">身份证: {person.idCardNumber || '—'}</div>
      <div className="person-card-row">籍贯: {person.householdAddress || '—'}</div>
      <div className="person-card-row">
        出生日期: {formatDateOnly(person.birthDate)}
      </div>
      <div className="person-card-row">电话: {person.phoneSummary || '—'}</div>
      <div className="person-card-tags">
        {(person.personTags || []).slice(0, 2).map((tag, idx) => (
          <Tag key={idx} className="person-card-tag">
            {tag}
          </Tag>
        ))}
      </div>
      {person.isKeyPerson && (
        <Tag color="red" className="person-card-key">
          重点人员
        </Tag>
      )}
      {showActionLink && (
        <div className="person-card-actions">
          <span className="person-card-link" onClick={handleLinkClick}>
            <LinkOutlined /> {actionLinkText}
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
          <DeleteOutlined /> 移除
        </button>
      )}
    </Card>
  );
};

export default PersonCard;
