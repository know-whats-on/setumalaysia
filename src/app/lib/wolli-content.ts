import { wolliShortcutIcons } from './wolli-icons';

export const BAYSIDE_HOME_URL = 'https://www.bayside.nsw.gov.au/';
export const BAYSIDE_NEWS_URL = 'https://www.bayside.nsw.gov.au/your-council/latest-news';
export const BAYSIDE_EVENTS_URL = 'https://www.bayside.nsw.gov.au/whats-on';
export const BAYSIDE_REPORT_ISSUE_URL = 'https://www.bayside.nsw.gov.au/report-it';
export const BAYSIDE_CONTACT_URL = 'https://www.bayside.nsw.gov.au/your-council/contact-us';
export const BAYSIDE_WARD_BOUNDARY_URL = 'https://baysidecouncil.maps.arcgis.com/apps/instant/lookup/index.html?appid=32bbfbf0d5f54f87af056b666f26e444';

export type WolliQuickAction = {
  title: string;
  body: string;
  icon: string;
  route?: string;
  url?: string;
};

export type WolliServiceLink = {
  title: string;
  body: string;
  icon: string;
  url: string;
  keywords: string[];
};

export const wolliQuickActions: WolliQuickAction[] = [
  {
    title: 'News & alerts',
    body: 'Latest Bayside Council updates.',
    icon: wolliShortcutIcons.alerts,
    route: '/vibe?section=alerts',
  },
  {
    title: "What's on",
    body: 'Events and local activities.',
    icon: wolliShortcutIcons.events,
    route: '/vibe?section=events',
  },
  {
    title: 'Play Games',
    body: 'Mini games for a local break.',
    icon: wolliShortcutIcons.games,
    route: '/games',
  },
  {
    title: 'Resources',
    body: 'Waste, parking, pets, rates and more.',
    icon: wolliShortcutIcons.resources,
    route: '/setu',
  },
  {
    title: 'Nearby map',
    body: 'Explore the Bayside area.',
    icon: wolliShortcutIcons.maps,
    route: '/dashboard?view=map',
  },
];

export const wolliServices: WolliServiceLink[] = [
  {
    title: 'Waste & recycling',
    body: 'Bins, clean-up, drop-offs, recycling, and waste service requests.',
    icon: wolliShortcutIcons.checklist,
    url: 'https://www.bayside.nsw.gov.au/services/waste-recycling',
    keywords: ['bins', 'rubbish', 'recycling', 'clean up', 'waste'],
  },
  {
    title: 'Report an issue',
    body: 'Report non-emergency local issues directly to Council.',
    icon: wolliShortcutIcons.alerts,
    url: BAYSIDE_REPORT_ISSUE_URL,
    keywords: ['report', 'issue', 'graffiti', 'parking issue', 'maintenance'],
  },
  {
    title: 'Rates & payments',
    body: 'Rates notices, due dates, payments, and pensioner rebates.',
    icon: wolliShortcutIcons.info,
    url: 'https://www.bayside.nsw.gov.au/services/rates/pay-my-rates',
    keywords: ['rates', 'payment', 'rebate'],
  },
  {
    title: 'Parking',
    body: 'Parking permits, fines, abandoned vehicles, and local parking info.',
    icon: wolliShortcutIcons.maps,
    url: 'https://www.bayside.nsw.gov.au/services/parking',
    keywords: ['parking', 'permit', 'fine', 'vehicle'],
  },
  {
    title: 'Boundaries & wards',
    body: 'Open Bayside Council ward boundaries, ward numbers, and lookup details.',
    icon: wolliShortcutIcons.maps,
    url: BAYSIDE_WARD_BOUNDARY_URL,
    keywords: ['map', 'maps', 'ward', 'wards', 'boundary', 'boundaries', 'zone'],
  },
  {
    title: 'Pets & animals',
    body: 'Pet registrations, off-leash areas, lost animals, and complaints.',
    icon: wolliShortcutIcons.health,
    url: 'https://www.bayside.nsw.gov.au/services/pets-animals',
    keywords: ['pets', 'animals', 'dogs', 'cats', 'registration'],
  },
  {
    title: 'Planning & DA tracker',
    body: 'Development applications, planning assistance, and DA tracking.',
    icon: wolliShortcutIcons.suburbs,
    url: 'https://www.bayside.nsw.gov.au/planning-and-development/da-tracker',
    keywords: ['da', 'development', 'planning', 'permit'],
  },
  {
    title: 'Libraries & museums',
    body: 'Library locations, collections, and local history resources.',
    icon: wolliShortcutIcons.info,
    url: 'https://www.bayside.nsw.gov.au/recreation/places/libraries-and-museum',
    keywords: ['library', 'libraries', 'museum', 'study'],
  },
  {
    title: 'Parks & facilities',
    body: 'Parks, beaches, sports grounds, venues, and recreation spaces.',
    icon: wolliShortcutIcons.suburbs,
    url: 'https://www.bayside.nsw.gov.au/recreation/places/sporting-facilities',
    keywords: ['parks', 'facilities', 'sport', 'recreation', 'hire'],
  },
  {
    title: 'Public toilets',
    body: 'Find local amenities through the map and Council place pages.',
    icon: wolliShortcutIcons.toilet,
    url: 'https://www.bayside.nsw.gov.au/recreation/places',
    keywords: ['toilet', 'bathroom', 'amenities'],
  },
  {
    title: 'Careers at Bayside',
    body: 'Council careers, current vacancies, and application guidance.',
    icon: wolliShortcutIcons.jobs,
    url: 'https://www.bayside.nsw.gov.au/jobsatbayside',
    keywords: ['jobs', 'careers', 'vacancies', 'work'],
  },
];

export const wolliNewResidentChecklist = [
  'Check your bin collection and clean-up options.',
  'Save the Report It page for non-emergency council issues.',
  'Review parking permit rules if your street is time restricted.',
  'Register pets and check nearby off-leash areas.',
  'Find nearby libraries, parks, sports fields, and community spaces.',
];
