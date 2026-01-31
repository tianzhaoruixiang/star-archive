/** 人员详情（与后端 PersonDetailDTO 对应） */
export interface PersonDetailData {
  personId?: string;
  chineseName?: string;
  originalName?: string;
  aliasNames?: string[];
  avatarUrl?: string;
  /** 全部头像 URL 列表（第一张大头像，其余小头像） */
  avatarUrls?: string[];
  gender?: string;
  birthDate?: string | null;
  nationality?: string;
  nationalityCode?: string;
  householdAddress?: string;
  organization?: string;
  belongingGroup?: string;
  highestEducation?: string;
  phoneNumbers?: string[];
  emails?: string[];
  passportNumbers?: string[];
  idCardNumber?: string;
  /** 签证类型：公务签证/外交签证/记者签证/旅游签证/其他 */
  visaType?: string;
  /** 签证号码 */
  visaNumber?: string;
  twitterAccounts?: string[];
  linkedinAccounts?: string[];
  facebookAccounts?: string[];
  personTags?: string[];
  workExperience?: string;
  educationExperience?: string;
  remark?: string;
  recentTravels?: PersonTravelItem[];
  recentSocialDynamics?: SocialDynamicItem[];
  isKeyPerson?: boolean;
  /** 是否公开档案：true 所有人可见，false 仅创建人可见 */
  isPublic?: boolean;
  /** 创建人用户名（私有档案仅此人可见） */
  createdBy?: string;
  createdTime?: string;
  updatedTime?: string;
}

export interface PersonTravelItem {
  travelId?: string;
  eventTime?: string;
  travelType?: string;
  departure?: string;
  destination?: string;
  /** 出发城市 */
  departureCity?: string;
  /** 到达城市 */
  destinationCity?: string;
  ticketNumber?: string;
  visaType?: string;
}

export interface SocialDynamicItem {
  dynamicId?: string;
  socialAccount?: string;
  socialAccountType?: string;
  content?: string;
  publishTime?: string;
}
