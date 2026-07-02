import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Car,
  CheckSquare,
  FileText,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  MapPin,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SETU_CHINA_RESOURCES_DEFAULT_ROUTE } from './resources-routes';

export const SETU_CHINA_ACCENT = '#F04444';

export const setuChinaQuickActions = [
  { label: 'Events', zh: '活动', route: '/vibe?section=events', icon: CalendarDays },
  { label: 'Arrival Checklist', zh: '到达清单', route: SETU_CHINA_RESOURCES_DEFAULT_ROUTE, icon: CheckSquare },
  { label: 'Games', zh: '游戏', route: '/games', icon: Gamepad2 },
  { label: 'Alerts', zh: '通知', route: '/vibe?section=alerts', icon: Bell },
  { label: 'Suburbs', zh: '地区指南', route: '/vibe?section=vibe&vibe_tab=suburb-score', icon: MapPin },
] as const;

export const setuChinaEvents = [
  {
    id: 'dragon-boat',
    day: 'SAT',
    date: '31 MAY',
    title: 'Dragon Boat Festival Meetup',
    zh: '端午节龙舟聚会',
    organizer: 'UNSW Chinese Students Society (UNSW CSSA)',
    time: '2:00 - 5:30 PM',
    location: 'Darling Harbour',
    people: '128 going',
    category: 'Chinese Community',
    tone: 'from-[#FFE8DD] to-[#EAF7F2]',
    icon: Users,
  },
  {
    id: 'resume-review',
    day: 'WED',
    date: '4 JUN',
    title: 'Mandarin Resume Review',
    zh: '中文简历修改工作坊',
    organizer: 'USYD CSSA',
    time: '6:30 - 8:30 PM',
    location: 'Online (Zoom)',
    people: '86 going',
    category: 'Career',
    tone: 'from-[#F8FAFC] to-[#FFE8E3]',
    icon: FileText,
  },
  {
    id: 'film-night',
    day: 'FRI',
    date: '6 JUN',
    title: 'Chinese Film Night',
    zh: '中文电影之夜',
    organizer: 'UTS Chinese Students Society',
    time: '7:00 - 10:00 PM',
    location: 'UTS Building 10',
    people: '94 going',
    category: 'Social',
    tone: 'from-[#111827] to-[#7F1D1D]',
    icon: CalendarDays,
    dark: true,
  },
  {
    id: 'dumpling-workshop',
    day: 'SUN',
    date: '8 JUN',
    title: 'Dumpling Making Workshop',
    zh: '包饺子体验工作坊',
    organizer: 'MQ Chinese Students Association',
    time: '1:30 - 4:00 PM',
    location: 'Macquarie University',
    people: '72 going',
    category: 'Student Societies',
    tone: 'from-[#FFF7ED] to-[#FFE4E6]',
    icon: Users,
  },
  {
    id: 'tax-basics',
    day: 'WED',
    date: '21 MAY',
    title: 'Mandarin Tax Basics',
    zh: '个人报税基础讲解',
    organizer: 'Verified community partner',
    time: '7:00 - 8:30 PM',
    location: 'Online (Zoom)',
    people: '86 going',
    category: 'Study Support',
    tone: 'from-[#EFF6FF] to-[#FFE8E3]',
    icon: BriefcaseBusiness,
  },
  {
    id: 'welcome-mixer',
    day: 'TUE',
    date: '20 MAY',
    title: 'Chinese Students Welcome Mixer',
    zh: '中国留学生欢迎会',
    organizer: 'UTS Chinese Students Society',
    time: '6:30 - 9:30 PM',
    location: 'UTS Building 10, Level 5',
    people: '128 going',
    category: 'Social',
    tone: 'from-[#FEE2E2] to-[#FFF7ED]',
    icon: Users,
  },
] as const;

export const setuChinaEventCategories = [
  ['All', '全部'],
  ['Social', '社交'],
  ['Career', '求职'],
  ['Chinese Community', '华人社区'],
  ['Online', '线上'],
  ['Free', '免费'],
  ['Housing & Safety', '租房与安全'],
  ['Study Support', '学业支持'],
] as const;

export type SetuChinaChecklistGuide = {
  summary: string;
  steps: string[];
  route?: string;
  routeLabel?: string;
  sourceLabel: string;
};

export type SetuChinaChecklistItem = {
  id: string;
  title: string;
  zh: string;
  defaultCompleted: boolean;
  icon: LucideIcon;
  guide: SetuChinaChecklistGuide;
};

export type SetuChinaChecklistSection = {
  id: string;
  title: string;
  zh: string;
  items: SetuChinaChecklistItem[];
};

export const setuChinaChecklistSections: SetuChinaChecklistSection[] = [
  {
    id: 'first-48',
    title: 'First 48 Hours',
    zh: '抵达后 48 小时内',
    items: [
      {
        id: 'activate-sim-esim',
        title: 'Activate SIM / eSIM',
        zh: '激活 SIM / eSIM',
        defaultCompleted: true,
        icon: FileText,
        guide: {
          summary: '先确保手机可以接收银行、学校和租房平台验证码。机场、超市和电信门店通常都能办理 SIM 或 eSIM。',
          steps: ['准备护照、学生证或 CoE 信息。', '选择覆盖你学校和住处区域的运营商。', '开通后测试电话、短信和移动数据。'],
          route: '/arrival',
          routeLabel: '询问 Chat',
          sourceLabel: '参考运营商和学校 IT 支持说明。',
        },
      },
      {
        id: 'open-bank-account',
        title: 'Open a bank account',
        zh: '开设澳洲银行账户',
        defaultCompleted: true,
        icon: Home,
        guide: {
          summary: '尽早开设澳洲银行账户，方便收工资、支付租金和保存转账记录。',
          steps: ['带好护照、签证/CoE、澳洲地址和手机号。', '优先使用官方银行 App 或官网预约。', '租房付款尽量保留银行流水和收据。'],
          sourceLabel: '参考银行官方开户说明。',
        },
      },
      {
        id: 'apply-tfn',
        title: 'Apply for TFN',
        zh: '申请税号（TFN）',
        defaultCompleted: true,
        icon: FileText,
        guide: {
          summary: 'TFN 是澳洲税号，找兼职、报税和部分银行流程会用到。通过 ATO 官方渠道申请。',
          steps: ['确认已抵达澳洲并有有效签证。', '通过 ATO 官方网站提交申请。', '收到 TFN 后妥善保存，不要随意发给陌生人。'],
          route: '/arrival',
          routeLabel: '了解 TFN',
          sourceLabel: '参考 Australian Taxation Office (ATO)。',
        },
      },
      {
        id: 'transport-card',
        title: 'Set up Opal / Myki card',
        zh: '办理 Opal / Myki 交通卡',
        defaultCompleted: true,
        icon: Car,
        guide: {
          summary: '不同城市交通卡不同：Sydney 常用 Opal，Melbourne 常用 Myki，Brisbane 常用 Go Card。',
          steps: ['确认所在城市的交通系统。', '绑定银行卡或购买实体卡。', '查看学生 concession 是否适用于你的签证和学校。'],
          route: '/dashboard?view=map',
          routeLabel: '打开地图',
          sourceLabel: '参考州交通官网和学校学生服务说明。',
        },
      },
    ],
  },
  {
    id: 'first-2-weeks',
    title: 'First 2 Weeks',
    zh: '抵达后 2 周内',
    items: [
      {
        id: 'check-oshc',
        title: 'Check OSHC (Overseas Student Health Cover)',
        zh: '确认海外学生健康保险（OSHC）',
        defaultCompleted: true,
        icon: HeartPulse,
        guide: {
          summary: '确认 OSHC provider、保单号、覆盖日期和如何 claim。看 GP 前先查是否支持 direct billing。',
          steps: ['下载 OSHC provider App 或保存会员号。', '确认 cover 起止日期覆盖整个签证期。', '保存附近 GP、medical centre 和紧急电话 000。'],
          route: '/arrival',
          routeLabel: '询问 OSHC',
          sourceLabel: '参考 OSHC provider 和学校 international student support。',
        },
      },
      {
        id: 'student-id-campus',
        title: 'Register your student ID & campus systems',
        zh: '注册学生卡并激活校园系统',
        defaultCompleted: true,
        icon: GraduationCap,
        guide: {
          summary: '学生卡、邮箱、LMS、图书馆和校园 Wi-Fi 是开学前最重要的系统。',
          steps: ['完成 enrolment 和 orientation 要求。', '激活学校邮箱、LMS、MFA 和学生卡。', '保存学校 international student support 联系方式。'],
          sourceLabel: '参考学校 onboarding/orientation 页面。',
        },
      },
      {
        id: 'rental-bond-checklist',
        title: 'Rental inspection & bond checklist',
        zh: '租房入住检查与押金清单',
        defaultCompleted: false,
        icon: Home,
        guide: {
          summary: '入住前检查房屋状况并确认 bond 押金进入州官方租赁押金系统，避免私下转账风险。',
          steps: ['看房或视频看房，确认地址和房东/中介身份。', '拍照记录 condition report。', '确认 bond lodge 到州租房机构，不要只转给私人账户。'],
          route: '/vibe?section=alerts',
          routeLabel: '查看安全提醒',
          sourceLabel: '参考州 tenancy authority 和 Scamwatch。',
        },
      },
      {
        id: 'save-emergency-contacts',
        title: 'Save emergency contacts',
        zh: '保存紧急联系人与重要电话',
        defaultCompleted: false,
        icon: Bell,
        guide: {
          summary: '把紧急电话和学校支持渠道存到手机，遇到危险时先联系官方渠道。',
          steps: ['紧急情况拨打 000。', '非紧急警务联系本地 police assistance line。', '保存学校 security、international student support 和 OSHC helpline。'],
          route: '/vibe?section=alerts',
          routeLabel: '查看提醒',
          sourceLabel: '参考 emergency services、学校和 OSHC provider。',
        },
      },
      {
        id: 'join-cssa',
        title: 'Join Chinese Students Association',
        zh: '加入中国学生会 / 社团',
        defaultCompleted: false,
        icon: Users,
        guide: {
          summary: '学校中国学生会和国际学生社团可以帮助你认识同学、了解 campus 活动和本地生活信息。',
          steps: ['通过学校 clubs portal 查找 CSSA 或 Chinese Students Society。', '优先加入学校官方渠道列出的社团。', '不要在陌生群里泄露护照、银行卡或验证码。'],
          route: '/vibe?section=events',
          routeLabel: '查看活动',
          sourceLabel: '参考学校 clubs/societies 官方列表。',
        },
      },
      {
        id: 'learn-scam-red-flags',
        title: 'Learn scam red flags & safe tips',
        zh: '学习防骗知识与安全贴士',
        defaultCompleted: false,
        icon: ShieldAlert,
        guide: {
          summary: '留学生常见风险包括租房押金诈骗、假兼职、冒充使领馆/警察和 phishing 链接。',
          steps: ['不要向陌生人提供验证码、护照照片或银行登录信息。', '遇到威胁转账、保密、立即汇款的要求先暂停。', '保留截图和转账记录，必要时联系 Scamwatch、银行、学校或警方。'],
          route: '/vibe?section=alerts',
          routeLabel: '查看官方提醒',
          sourceLabel: '参考 Scamwatch、AFP 和中国驻澳使领馆信息。',
        },
      },
    ],
  },
  {
    id: 'first-month',
    title: 'First Month',
    zh: '抵达后 1 个月内',
    items: [
      {
        id: 'fair-work-basics',
        title: 'Understand Fair Work basics',
        zh: '了解打工合法时长和 Fair Work 基础权益',
        defaultCompleted: false,
        icon: BriefcaseBusiness,
        guide: {
          summary: '找兼职前了解最低工资、pay slip、trial shift 和学生签证工作时间限制。',
          steps: ['查看 Fair Work minimum wages 和 workplace rights。', '保留 roster、pay slip 和工作沟通记录。', '签证工作时间问题以 Home Affairs 最新规定为准。'],
          route: '/arrival',
          routeLabel: '询问打工规定',
          sourceLabel: '参考 Fair Work Ombudsman 和 Home Affairs。',
        },
      },
      {
        id: 'career-workshop',
        title: 'Prepare resume and career workshop',
        zh: '创建简历并参加 career workshop',
        defaultCompleted: false,
        icon: FileText,
        guide: {
          summary: '澳洲求职简历通常更简洁，重点写课程项目、技能、可工作时间和本地联系方式。',
          steps: ['预约学校 career service 修改简历。', '准备 LinkedIn 和一页简历。', '参加学校 career fair、networking night 或行业讲座。'],
          route: '/vibe?section=events&events_tab=networking',
          routeLabel: '查看 Networking',
          sourceLabel: '参考学校 career service。',
        },
      },
      {
        id: 'budget-plan',
        title: 'Set budget and living-cost plan',
        zh: '设置预算和生活成本计划',
        defaultCompleted: false,
        icon: CheckSquare,
        guide: {
          summary: '把房租、交通、电话、OSHC、教材、餐饮和应急金分开预算，减少开学第一个月压力。',
          steps: ['记录每周固定开销。', '预留 bond、搬家、教材和医疗应急费用。', '谨慎使用 BNPL 或高息借贷。'],
          sourceLabel: '参考学校 financial wellbeing/support 服务。',
        },
      },
      {
        id: 'official-links',
        title: 'Save official support channels',
        zh: '收藏常用官方网站和求助渠道',
        defaultCompleted: false,
        icon: ShieldAlert,
        guide: {
          summary: '把官方来源放在一起，遇到问题先核实来源，再行动。',
          steps: ['收藏 Scamwatch、Fair Work、ATO、Home Affairs。', '保存州 tenancy authority 和学校支持链接。', '关注中国驻澳使领馆官方更新。'],
          route: '/vibe?section=alerts',
          routeLabel: '查看 Embassy updates',
          sourceLabel: '参考澳洲政府、学校和中国驻澳使领馆官方渠道。',
        },
      },
    ],
  },
];

export const setuChinaAlerts = [
  {
    title: 'Rental scam warning',
    zh: '租房诈骗提醒',
    body: 'Never pay a deposit before inspecting the property or verifying the lease and bond process.',
    zhBody: '看房前不要支付押金或定金。确认房源、合同和 bond 押金流程后再付款。',
    level: 'Official reminder',
  },
  {
    title: 'Fake job offer warning',
    zh: '虚假兼职提醒',
    body: 'Be careful with jobs that ask you to transfer money, receive parcels, or share passport details too early.',
    zhBody: '如果兼职要求你转账、代收包裹或过早提供护照信息，请提高警惕。',
    level: 'Safety',
  },
  {
    title: 'Visa scam / impersonation warning',
    zh: '签证诈骗提醒',
    body: 'Government agencies will not threaten immediate arrest through calls, SMS, or social apps.',
    zhBody: '政府机构不会通过电话、短信或社交软件威胁你立即被逮捕或要求转账。',
    level: 'Scamwatch',
  },
] as const;

export const setuChinaSuburbs = [
  {
    suburb: 'Kensington',
    city: 'Sydney',
    campus: '距 UNSW 8 分钟步行',
    safety: '4.6',
    safetyLabel: 'Very Safe 很安全',
    rent: '$$$',
    rentLabel: 'Rent 租金水平 中等偏高',
    travel: '18 min',
    travelLabel: 'to City 中心 by Light Rail',
    note: '学生社区氛围好，靠近学校和超市，生活便利。',
  },
  {
    suburb: 'Burwood',
    city: 'Sydney',
    campus: '距 USYD 12 分钟公交',
    safety: '4.3',
    safetyLabel: 'Very Safe 很安全',
    rent: '$$',
    rentLabel: 'Rent 租金水平 中等',
    travel: '20 min',
    travelLabel: 'to City 中心 by Train',
    note: '华人社区成熟，餐饮购物方便，适合留学生生活。',
  },
  {
    suburb: 'Haymarket',
    city: 'Sydney',
    campus: '距 UTS 6 分钟步行',
    safety: '3.4',
    safetyLabel: 'Average 一般',
    rent: '$$',
    rentLabel: 'Rent 租金水平 中等',
    travel: '8 min',
    travelLabel: 'to City 中心 by Train',
    note: '市中心位置优越，夜间较繁杂，注意个人财物安全。',
  },
] as const;

export const setuChinaChatPrompts = [
  '我怎么避免租房诈骗？',
  '哪里可以找到会说中文的 GP？',
  '学生签证打工时间有什么规定？',
  'TFN 是什么，怎么申请？',
  'OSHC 怎么用？',
  '租房 bond 押金要注意什么？',
] as const;

export const setuChinaGuideCards = [
  ['Complete your arrival checklist', '完成到达清单', SETU_CHINA_RESOURCES_DEFAULT_ROUTE, CheckSquare],
  ['Ask the chatbot in Mandarin or English', '中英双语智能助手', '/arrival', Bot],
  ['Check suburb safety before renting', '租房前查看地区安全', '/vibe?section=vibe&vibe_tab=suburb-score', Home],
] as const;
