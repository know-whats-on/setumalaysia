export type AustralianStateCode = 'ACT' | 'NSW' | 'SA' | 'VIC' | 'TAS' | 'WA' | 'NT' | 'QLD';

export type IndianStudentWelfareMissionId = 'hci-canberra' | 'cgi-sydney' | 'cgi-melbourne' | 'cgi-perth' | 'cgi-brisbane';

export type IndianStudentWelfareMission = {
  id: IndianStudentWelfareMissionId;
  name: string;
  states: AustralianStateCode[];
  studentWelfareContactName: string;
  phone: string;
  mobile?: string;
  email: string;
  website: string;
};

export type IndianStudentWelfareReply = {
  text: string;
  mission?: IndianStudentWelfareMission;
  stateCode?: AustralianStateCode;
  sources: Array<{
    label: string;
    url: string;
  }>;
};

const AUSTRALIAN_STATE_NAMES: Record<AustralianStateCode, string> = {
  ACT: 'Australian Capital Territory',
  NSW: 'New South Wales',
  SA: 'South Australia',
  VIC: 'Victoria',
  TAS: 'Tasmania',
  WA: 'Western Australia',
  NT: 'Northern Territory',
  QLD: 'Queensland',
};

export const INDIAN_STUDENT_WELFARE_MISSIONS: IndianStudentWelfareMission[] = [
  {
    id: 'hci-canberra',
    name: 'High Commission of India, Canberra',
    states: ['ACT'],
    studentWelfareContactName: 'Ms. Sweety Agarwal',
    phone: '02 6225 4924',
    email: 'cons.canberra@mea.gov.in',
    website: 'https://www.hcicanberra.gov.in',
  },
  {
    id: 'cgi-sydney',
    name: 'Consulate General of India, Sydney',
    states: ['NSW', 'SA'],
    studentWelfareContactName: 'Mr. Kashmiri Lal',
    phone: '02 9223 2791 / 02 9223 2702',
    email: 'cons.sydney@mea.gov.in',
    website: 'https://www.cgisydney.gov.in',
  },
  {
    id: 'cgi-melbourne',
    name: 'Consulate General of India, Melbourne',
    states: ['VIC', 'TAS'],
    studentWelfareContactName: 'Mr. H.K. Pandey',
    phone: '03 8638 0546 / 03 8638 0547',
    email: 'com1.melbourne@mea.gov.in',
    website: 'https://www.cgimelbourne.gov.in',
  },
  {
    id: 'cgi-perth',
    name: 'Consulate General of India, Perth',
    states: ['WA', 'NT'],
    studentWelfareContactName: 'Mr. Naresh Sharma',
    phone: '08 9221 4205',
    mobile: '0452 528 100',
    email: 'cons.perth@mea.gov.in',
    website: 'https://www.cgiperth.gov.in',
  },
  {
    id: 'cgi-brisbane',
    name: 'Consulate General of India, Brisbane',
    states: ['QLD'],
    studentWelfareContactName: 'Sushil Kumar Goel',
    phone: '07 3367 8590',
    email: 'cgibrisbane@mea.gov.in',
    website: 'https://www.cgibrisbane.gov.in',
  },
];

const STATE_ALIASES: Array<{ code: AustralianStateCode; patterns: string[] }> = [
  { code: 'ACT', patterns: ['act', 'a.c.t', 'australian capital territory', 'canberra'] },
  { code: 'NSW', patterns: ['nsw', 'new south wales', 'sydney', 'newcastle', 'wollongong'] },
  { code: 'SA', patterns: ['sa', 'south australia', 'adelaide'] },
  { code: 'VIC', patterns: ['vic', 'victoria', 'melbourne', 'geelong'] },
  { code: 'TAS', patterns: ['tas', 'tasmania', 'hobart', 'launceston'] },
  { code: 'WA', patterns: ['wa', 'western australia', 'perth'] },
  { code: 'NT', patterns: ['nt', 'northern territory', 'darwin'] },
  { code: 'QLD', patterns: ['qld', 'queensland', 'brisbane', 'gold coast', 'cairns'] },
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAustralianStateCode(value: unknown): AustralianStateCode | null {
  const normalized = normalizeSearchText(String(value || ''));
  if (!normalized) return null;

  for (const { code, patterns } of STATE_ALIASES) {
    if (patterns.some((pattern) => normalizeSearchText(pattern) === normalized)) {
      return code;
    }
  }

  return null;
}

export function detectAustralianStateInText(text: string): AustralianStateCode | null {
  const normalized = ` ${normalizeSearchText(text)} `;
  if (!normalized.trim()) return null;

  for (const { code, patterns } of STATE_ALIASES) {
    for (const pattern of patterns) {
      const patternText = normalizeSearchText(pattern);
      if (!patternText) continue;
      const regex = new RegExp(`\\b${escapeRegex(patternText)}\\b`, 'i');
      if (regex.test(normalized)) {
        return code;
      }
    }
  }

  return null;
}

export function getIndianStudentWelfareMissionForState(
  stateCode: AustralianStateCode | string | null | undefined,
) {
  const normalizedState = normalizeAustralianStateCode(stateCode);
  if (!normalizedState) return null;
  return INDIAN_STUDENT_WELFARE_MISSIONS.find((mission) => mission.states.includes(normalizedState)) || null;
}

export function looksLikeIndianMissionQuestion(text: string) {
  const normalized = normalizeSearchText(text);
  if (!normalized) return false;

  const hasStrongMissionTerm = /\b(hci|cgi|consulate|consular|embassy|high commission|student welfare|mea|madad|oci|pcc)\b/i.test(normalized);
  const hasIndianContext = /\b(india|indian|hci|cgi|mea|madad|consulate|consular|embassy|high commission)\b/i.test(normalized);
  const hasPassportOrVisaTerm = /\b(passport|visa)\b/i.test(normalized);

  return hasStrongMissionTerm || (hasIndianContext && hasPassportOrVisaTerm);
}

function formatMissionLine(mission: IndianStudentWelfareMission) {
  return [
    `Student welfare contact: ${mission.studentWelfareContactName}.`,
    `Phone: ${mission.phone}.`,
    mission.mobile ? `Mobile: ${mission.mobile}.` : '',
    `Email: ${mission.email}.`,
    `Website: ${mission.website}.`,
  ].filter(Boolean).join(' ');
}

function buildJurisdictionSummary() {
  return [
    'ACT: High Commission of India, Canberra',
    'NSW/SA: Consulate General of India, Sydney',
    'VIC/TAS: Consulate General of India, Melbourne',
    'WA/NT: Consulate General of India, Perth',
    'QLD: Consulate General of India, Brisbane',
  ].join('\n');
}

export function buildIndianStudentWelfareReply(
  text: string,
  fallbackState?: string | null,
): IndianStudentWelfareReply | null {
  if (!looksLikeIndianMissionQuestion(text)) return null;

  const explicitState = detectAustralianStateInText(text);
  const stateCode = explicitState || normalizeAustralianStateCode(fallbackState);
  const mission = stateCode ? getIndianStudentWelfareMissionForState(stateCode) : null;

  if (stateCode && mission) {
    const stateName = AUSTRALIAN_STATE_NAMES[stateCode];
    return {
      text: `For ${stateName}, use the ${mission.name}. ${formatMissionLine(mission)}`,
      mission,
      stateCode,
      sources: [{ label: mission.name, url: mission.website }],
    };
  }

  return {
    text: `Which Australian state are you in? Jurisdiction for Indian student welfare contacts:\n${buildJurisdictionSummary()}`,
    sources: INDIAN_STUDENT_WELFARE_MISSIONS.map((mission) => ({
      label: mission.name,
      url: mission.website,
    })),
  };
}
