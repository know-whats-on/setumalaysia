export type SuburbDemographic = {
  name: string;
  total: number;
  students: number;
};

export type SuburbDemographicRecord = {
  suburb: string;
  state: string;
  totalStudents: number;
  demographics: SuburbDemographic[];
  demographicView?: 'population_vs_students' | 'student_residents';
  maxVisibleDemographics?: number;
};

const WOLLI_CREEK_COUNTRY_ORDER = [
  'China',
  'Nepal',
  'Vietnam',
  'Indonesia',
  'Hong Kong',
  'Mongolia',
  'India',
  'Malaysia',
  'Bangladesh',
  'Philippines',
  'Taiwan',
  'Singapore',
] as const;

type WolliCreekCountry = (typeof WOLLI_CREEK_COUNTRY_ORDER)[number];

const WOLLI_CREEK_STUDENT_COUNTS: Record<WolliCreekCountry, number> = {
  China: 517,
  Nepal: 70,
  Vietnam: 65,
  Indonesia: 49,
  'Hong Kong': 43,
  Mongolia: 42,
  India: 27,
  Malaysia: 24,
  Bangladesh: 19,
  Philippines: 15,
  Taiwan: 11,
  Singapore: 8,
};

const WOLLI_CREEK_SUBURB_COUNTRY_TOTALS: Partial<Record<WolliCreekCountry, number>> = {
  China: 2155,
  Nepal: 245,
  Vietnam: 250,
  Indonesia: 457,
  'Hong Kong': 282,
  India: 262,
  Malaysia: 226,
  Bangladesh: 80,
  Philippines: 278,
  Taiwan: 112,
  Singapore: 81,
};

const WOLLI_CREEK_QUICKSTATS_COUNTRY_TOTALS: Partial<Record<WolliCreekCountry, number>> = {
  Mongolia: 511,
};

const BAYSIDE_LGA_COUNTRY_TOTALS: Partial<Record<WolliCreekCountry, number>> = {
  China: 11831,
  Nepal: 4683,
  Vietnam: 1942,
  Indonesia: 4460,
  'Hong Kong': 1905,
  India: 2910,
  Malaysia: 1455,
  Bangladesh: 2498,
  Philippines: 3558,
  Taiwan: 559,
  Singapore: 447,
};

const WOLLI_CREEK_DEMOGRAPHICS: SuburbDemographic[] = WOLLI_CREEK_COUNTRY_ORDER.map((name) => ({
  name,
  total:
    WOLLI_CREEK_SUBURB_COUNTRY_TOTALS[name] ??
    WOLLI_CREEK_QUICKSTATS_COUNTRY_TOTALS[name] ??
    BAYSIDE_LGA_COUNTRY_TOTALS[name] ??
    0,
  students: WOLLI_CREEK_STUDENT_COUNTS[name],
}));

export const suburbDemographics: SuburbDemographicRecord[] = [
  {
    suburb: 'Adelaide CBD',
    state: 'SA',
    totalStudents: 4471,
    demographics: [
      { name: 'Chinese', total: 2865, students: 1541 },
      { name: 'Indian', total: 681, students: 222 },
      { name: 'Nepalese', total: 65, students: 18 },
      { name: 'Vietnamese', total: 367, students: 172 },
      { name: 'Philippino', total: 250, students: 38 },
    ],
  },
  {
    suburb: 'Armidale CBD',
    state: 'NSW',
    totalStudents: 2027,
    demographics: [
      { name: 'Chinese', total: 137, students: 25 },
      { name: 'Indian', total: 266, students: 66 },
      { name: 'Nepalese', total: 262, students: 74 },
      { name: 'Vietnamese', total: 74, students: 14 },
      { name: 'Philippino', total: 160, students: 27 },
    ],
  },
  {
    suburb: 'Birmingham Gardens',
    state: 'NSW',
    totalStudents: 500,
    demographics: [
      { name: 'Chinese', total: 120, students: 34 },
      { name: 'Indian', total: 73, students: 22 },
      { name: 'Nepalese', total: 16, students: 4 },
      { name: 'Vietnamese', total: 38, students: 14 },
      { name: 'Philippino', total: 25, students: 4 },
    ],
  },
  {
    suburb: 'Broadway',
    state: 'NSW',
    totalStudents: 2243,
    demographics: [
      { name: 'Chinese', total: 1325, students: 723 },
      { name: 'Indian', total: 251, students: 65 },
      { name: 'Nepalese', total: 58, students: 16 },
      { name: 'Vietnamese', total: 146, students: 42 },
      { name: 'Philippino', total: 93, students: 15 },
    ],
  },
  {
    suburb: 'Buderim',
    state: 'QLD',
    totalStudents: 1428,
    demographics: [
      { name: 'Chinese', total: 73, students: 4 },
      { name: 'Indian', total: 162, students: 7 },
      { name: 'Nepalese', total: 89, students: 34 },
      { name: 'Vietnamese', total: 28, students: 6 },
      { name: 'Philippino', total: 118, students: 11 },
    ],
  },
  {
    suburb: 'Campbelltown',
    state: 'NSW',
    totalStudents: 786,
    demographics: [
      { name: 'Chinese', total: 205, students: 15 },
      { name: 'Indian', total: 584, students: 46 },
      { name: 'Nepalese', total: 269, students: 34 },
      { name: 'Vietnamese', total: 87, students: 7 },
      { name: 'Philippino', total: 551, students: 24 },
    ],
  },
  {
    suburb: 'Chippendale',
    state: 'NSW',
    totalStudents: 2084,
    demographics: [
      { name: 'Chinese', total: 1531, students: 858 },
      { name: 'Indian', total: 185, students: 39 },
      { name: 'Nepalese', total: 25, students: 5 },
      { name: 'Vietnamese', total: 131, students: 36 },
      { name: 'Philippino', total: 103, students: 10 },
    ],
  },
  {
    suburb: 'Crawley',
    state: 'WA',
    totalStudents: 2006,
    demographics: [
      { name: 'Chinese', total: 409, students: 269 },
      { name: 'Indian', total: 132, students: 65 },
      { name: 'Nepalese', total: 13, students: 13 },
      { name: 'Vietnamese', total: 72, students: 27 },
      { name: 'Philippino', total: 23, students: 15 },
    ],
  },
  {
    suburb: 'Daglish',
    state: 'WA',
    totalStudents: 158,
    demographics: [
      { name: 'Chinese', total: 31, students: 0 },
      { name: 'Indian', total: 20, students: 0 },
      { name: 'Nepalese', total: 0, students: 0 },
      { name: 'Vietnamese', total: 10, students: 0 },
      { name: 'Philippino', total: 12, students: 3 },
    ],
  },
  {
    suburb: 'Darling Heights',
    state: 'QLD',
    totalStudents: 634,
    demographics: [
      { name: 'Chinese', total: 50, students: 5 },
      { name: 'Indian', total: 352, students: 145 },
      { name: 'Nepalese', total: 162, students: 94 },
      { name: 'Vietnamese', total: 19, students: 0 },
      { name: 'Philippino', total: 103, students: 14 },
    ],
  },
  {
    suburb: 'Darlington',
    state: 'NSW',
    totalStudents: 903,
    demographics: [
      { name: 'Chinese', total: 237, students: 186 },
      { name: 'Indian', total: 50, students: 38 },
      { name: 'Nepalese', total: 0, students: 0 },
      { name: 'Vietnamese', total: 27, students: 9 },
      { name: 'Philippino', total: 17, students: 4 },
    ],
  },
  {
    suburb: 'Dutton Park',
    state: 'QLD',
    totalStudents: 299,
    demographics: [
      { name: 'Chinese', total: 38, students: 10 },
      { name: 'Indian', total: 39, students: 6 },
      { name: 'Nepalese', total: 15, students: 4 },
      { name: 'Vietnamese', total: 39, students: 0 },
      { name: 'Philippino', total: 30, students: 0 },
    ],
  },
  {
    suburb: 'Dynnyrne',
    state: 'TAS',
    totalStudents: 378,
    demographics: [
      { name: 'Chinese', total: 237, students: 80 },
      { name: 'Indian', total: 26, students: 16 },
      { name: 'Nepalese', total: 15, students: 0 },
      { name: 'Vietnamese', total: 23, students: 11 },
      { name: 'Philippino', total: 14, students: 0 },
    ],
  },
  {
    suburb: 'Footscray',
    state: 'VIC',
    totalStudents: 1682,
    demographics: [
      { name: 'Chinese', total: 374, students: 35 },
      { name: 'Indian', total: 800, students: 100 },
      { name: 'Nepalese', total: 255, students: 54 },
      { name: 'Vietnamese', total: 1460, students: 103 },
      { name: 'Philippino', total: 253, students: 16 },
    ],
  },
  {
    suburb: 'Forest Lodge',
    state: 'NSW',
    totalStudents: 615,
    demographics: [
      { name: 'Chinese', total: 350, students: 84 },
      { name: 'Indian', total: 65, students: 6 },
      { name: 'Nepalese', total: 9, students: 0 },
      { name: 'Vietnamese', total: 37, students: 0 },
      { name: 'Philippino', total: 52, students: 4 },
    ],
  },
  {
    suburb: 'Glebe',
    state: 'NSW',
    totalStudents: 1282,
    demographics: [
      { name: 'Chinese', total: 464, students: 188 },
      { name: 'Indian', total: 161, students: 33 },
      { name: 'Nepalese', total: 16, students: 3 },
      { name: 'Vietnamese', total: 258, students: 18 },
      { name: 'Philippino', total: 87, students: 14 },
    ],
  },
  {
    suburb: 'Gwynneville',
    state: 'NSW',
    totalStudents: 711,
    demographics: [
      { name: 'Chinese', total: 109, students: 50 },
      { name: 'Indian', total: 211, students: 87 },
      { name: 'Nepalese', total: 26, students: 13 },
      { name: 'Vietnamese', total: 39, students: 21 },
      { name: 'Philippino', total: 13, students: 0 },
    ],
  },
  {
    suburb: 'Haymarket',
    state: 'NSW',
    totalStudents: 1168,
    demographics: [
      { name: 'Chinese', total: 1775, students: 547 },
      { name: 'Indian', total: 162, students: 28 },
      { name: 'Nepalese', total: 43, students: 13 },
      { name: 'Vietnamese', total: 179, students: 54 },
      { name: 'Philippino', total: 87, students: 3 },
    ],
  },
  {
    suburb: 'Indooroopilly',
    state: 'QLD',
    totalStudents: 1760,
    demographics: [
      { name: 'Chinese', total: 950, students: 183 },
      { name: 'Indian', total: 719, students: 51 },
      { name: 'Nepalese', total: 153, students: 23 },
      { name: 'Vietnamese', total: 95, students: 8 },
      { name: 'Philippino', total: 122, students: 9 },
    ],
  },
  {
    suburb: 'Kensington',
    state: 'NSW',
    totalStudents: 1980,
    demographics: [
      { name: 'Chinese', total: 824, students: 465 },
      { name: 'Indian', total: 193, students: 61 },
      { name: 'Nepalese', total: 44, students: 12 },
      { name: 'Vietnamese', total: 67, students: 17 },
      { name: 'Philippino', total: 84, students: 9 },
    ],
  },
  {
    suburb: 'Mawson Lakes',
    state: 'SA',
    totalStudents: 892,
    demographics: [
      { name: 'Chinese', total: 495, students: 162 },
      { name: 'Indian', total: 246, students: 74 },
      { name: 'Nepalese', total: 15, students: 4 },
      { name: 'Vietnamese', total: 38, students: 5 },
      { name: 'Philippino', total: 50, students: 7 },
    ],
  },
  {
    suburb: 'North Wollongong',
    state: 'NSW',
    totalStudents: 1031,
    demographics: [
      { name: 'Chinese', total: 354, students: 181 },
      { name: 'Indian', total: 114, students: 49 },
      { name: 'Nepalese', total: 11, students: 4 },
      { name: 'Vietnamese', total: 25, students: 11 },
      { name: 'Philippino', total: 31, students: 8 },
    ],
  },
  {
    suburb: 'Ultimo',
    state: 'NSW',
    totalStudents: 2243,
    demographics: [
      { name: 'Chinese', total: 1325, students: 723 },
      { name: 'Indian', total: 251, students: 65 },
      { name: 'Nepalese', total: 58, students: 16 },
      { name: 'Vietnamese', total: 146, students: 42 },
      { name: 'Philippino', total: 93, students: 15 },
    ],
  },
  // Wolli Creek keeps the user-supplied student counts for the requested countries and
  // pairs them with 2021 ABS suburb-level country-of-birth totals. Mongolia is sourced
  // from ABS QuickStats because the NSW short-header GCP datapack omits it, while the
  // Bayside LGA totals remain as a fallback if a suburb-level total is unavailable.
  {
    suburb: 'Wolli Creek',
    state: 'NSW',
    totalStudents: 1297,
    maxVisibleDemographics: WOLLI_CREEK_DEMOGRAPHICS.length,
    demographics: WOLLI_CREEK_DEMOGRAPHICS,
  },
];

export function hasBrokenSuburbDemographics(suburb: {
  totalStudents?: number;
  demographics?: Array<{ total?: number; students?: number }>;
}) {
  const totalStudents = Number(suburb?.totalStudents || 0);
  const demographics = Array.isArray(suburb?.demographics) ? suburb.demographics : [];
  const hasPopulation = demographics.some((item) => Number(item?.total || 0) > 0 || Number(item?.students || 0) > 0);
  return totalStudents <= 0 && !hasPopulation;
}
