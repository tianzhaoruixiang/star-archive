/** 人员详情（与后端 PersonDetailDTO 对应） */
export interface PersonDetailData {
  personId?: string;
  chineseName?: string;
  originalName?: string;
  aliasNames?: string[];
  avatarUrl?: string;
  gender?: string;
  birthDate?: string | null;
  nationality?: string;
  nationalityCode?: string;
  householdAddress?: string;
  organization?: string;
  highestEducation?: string;
  phoneNumbers?: string[];
  emails?: string[];
  passportNumbers?: string[];
  idCardNumber?: string;
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
  createdTime?: string;
  updatedTime?: string;
}

export interface PersonTravelItem {
  travelId?: string;
  eventTime?: string;
  travelType?: string;
  departure?: string;
  destination?: string;
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
