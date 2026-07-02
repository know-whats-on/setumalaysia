export type SetuChinaEmbassyAlert = {
  id: string;
  date: string;
  title: string;
  zhTitle: string;
  summary: string;
  url: string;
};

export const SETU_CHINA_EMBASSY_NEWS_URL =
  'https://au.china-embassy.gov.cn/eng/zagx_0/sgxw/';

export const setuChinaEmbassyAlerts: SetuChinaEmbassyAlert[] = [
  {
    id: 'embassy-lantern-students-2026',
    date: '24 Mar 2026',
    title: 'China in My Eyes: 2026 Lantern Festival Celebration for ACT University Students',
    zhTitle: '2026 ACT 大学生元宵节活动动态',
    summary: '来自中国驻澳使馆的学生交流与社区活动更新。',
    url: 'https://au.china-embassy.gov.cn/eng/zagx_0/sgxw/202603/t20260324_11879789.htm',
  },
  {
    id: 'embassy-boundless-youth-2026',
    date: '11 Mar 2026',
    title: 'Boundless Youth, Galloping Abreast',
    zhTitle: '中国驻澳使馆 2026 元宵节学生活动',
    summary: '关注面向在澳学生和青年群体的官方活动信息。',
    url: 'https://au.china-embassy.gov.cn/eng/zagx_0/sgxw/202603/t20260311_11872606.htm',
  },
  {
    id: 'embassy-bomb-threat-remarks-2026',
    date: '25 Feb 2026',
    title: 'Remarks on bomb threat to Australian Prime Minister’s residence',
    zhTitle: '关于澳大利亚总理官邸炸弹威胁报道的回应',
    summary: '涉及公共安全报道的官方回应。遇到紧急情况请优先拨打 000。',
    url: 'https://au.china-embassy.gov.cn/eng/zagx_0/sgxw/202602/t20260225_11863521.htm',
  },
  {
    id: 'embassy-jimmy-lai-remarks-2026',
    date: '12 Feb 2026',
    title: 'Remarks on Australian Government statement on Jimmy Lai case',
    zhTitle: '关于澳方涉黎智英案声明的回应',
    summary: '中国驻澳使馆发布的最新官方表态之一。',
    url: 'https://au.china-embassy.gov.cn/eng/zagx_0/sgxw/202602/t20260212_11856980.htm',
  },
];
