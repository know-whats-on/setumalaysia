import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  Landmark,
  LockKeyhole,
  MapPin,
  Network,
  Printer,
  Radar,
  ShieldCheck,
  SignalHigh,
  Sparkles,
  Users,
} from 'lucide-react';
import MapGL, { Layer, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import './pitch-deck-page.css';

type SourceItem = {
  id: string;
  label: string;
  publisher: string;
  url: string;
  note: string;
};

type ProductClip = {
  id: string;
  label: string;
  src: string;
  poster: string;
  kind: 'phone' | 'desktop';
  startAt?: number;
};

type DeckSlide = {
  id: string;
  nav: 'Problem' | 'Product' | 'Market' | 'GTM' | 'Why Now';
  title: string;
  headline: string;
  support: string;
  visual:
    | 'hero'
    | 'insight'
    | 'problem'
    | 'struggle'
    | 'privacy'
    | 'solution'
    | 'phone'
    | 'dashboard'
    | 'engine'
    | 'market'
    | 'model'
    | 'gtm'
    | 'competitive'
    | 'why-now'
    | 'closing';
  sourceIds: string[];
  speakerNotes: string;
};

type SlideMetric = {
  label: string;
  value: string;
  detail?: string;
};

type BusinessPartner = {
  name: string;
  category: string;
};

type CorridorRoute = {
  id: string;
  label: string;
  origin: string;
  destination: string;
  color: string;
  status: string;
  from: [number, number];
  to: [number, number];
  arc: [number, number][];
};

type MapNode = {
  id: string;
  label: string;
  point: [number, number];
  kind: 'origin' | 'destination' | 'city';
  status?: string;
};

const sources: SourceItem[] = [
  {
    id: 'prisms-students',
    label: '145,012 Indian students and 851,780 total international students in Australia in 2025',
    publisher: 'Australian Government Department of Education',
    url: 'https://www.education.gov.au/download/14794/international-students-studying-australia-2005-2025/44649/document/pdf',
    note: 'PRISMS data; India is listed as the second-largest source country in the 2025 cohort.',
  },
  {
    id: 'mea-students',
    label: 'Nearly 1.25M Indian higher education students abroad',
    publisher: 'Ministry of External Affairs, Government of India',
    url: 'https://www.mea.gov.in/students-registration-portal',
    note: 'MEA student registration portal states the estimate and explains emergency contact utility.',
  },
  {
    id: 'mea-diaspora',
    label: '976,000 Overseas Indians in Australia; 34.36M globally',
    publisher: 'Ministry of External Affairs, Government of India',
    url: 'https://fsi.mea.gov.in/Images/CPV/LS196_A.pdf',
    note: 'Data on Indian Diaspora Abroad, as of January 2025.',
  },
  {
    id: 'vande-bharat',
    label: 'Vande Bharat brought back over 6.75 million people',
    publisher: 'Press Information Bureau, Government of India',
    url: 'https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1706443',
    note: 'Official March 2021 release describing the COVID-era evacuation programme.',
  },
  {
    id: 'oaic-emergency',
    label: 'Emergency disclosure requires purpose, limits, and planning',
    publisher: 'Office of the Australian Information Commissioner',
    url: 'https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/more-guidance/emergencies-and-disasters',
    note: 'Australian privacy guidance for emergencies and disasters.',
  },
  {
    id: 'oaic-consent',
    label: 'Consent must be informed, voluntary, current, and specific',
    publisher: 'Office of the Australian Information Commissioner',
    url: 'https://www.oaic.gov.au/privacy/your-privacy-rights/your-personal-information/consent-to-the-handling-of-personal-information',
    note: 'Guidance on consent for handling personal information.',
  },
  {
    id: 'student-safety',
    label: 'Prevention, early identification, support access, critical incidents',
    publisher: 'Australian Government International Education',
    url: 'https://internationaleducation.gov.au/news/latest-news/Pages/Report-on-International-Students%25E2%2580%2599-Mental-Health-and-Physical-Safety-.aspx',
    note: 'Student safety is a public-sector signal for broader overseas welfare and risk management.',
  },
  {
    id: 'govtech',
    label: 'GovTech: citizen-centric services and data-driven administration',
    publisher: 'World Bank Group',
    url: 'https://www.worldbank.org/ext/en/topic/governance/govtech',
    note: 'World Bank GovTech framing for public-sector modernization.',
  },
  {
    id: 'oecd-proactive',
    label: 'Proactive government anticipates and responds rapidly',
    publisher: 'OECD',
    url: 'https://www.oecd.org/en/publications/2019/11/the-path-to-becoming-a-data-driven-public-sector_9ed7e867/full-report/component-4.html',
    note: 'OECD data-driven public sector framework.',
  },
  {
    id: 'education-export',
    label: 'A$53.6B international education sector; India A$9.3B',
    publisher: 'Australian Government Department of Education',
    url: 'https://www.education.gov.au/international-education-data-and-research/education-export-income-financial-year',
    note: 'Education export income for 2024-25.',
  },
  {
    id: 'madad',
    label: 'MADAD handles consular grievance tracking and escalation',
    publisher: 'Ministry of External Affairs, Government of India',
    url: 'https://www.mea.gov.in/consular-complaints-and-grievances.htm',
    note: 'MEA describes MADAD as an online consular grievance management system.',
  },
  {
    id: 'step',
    label: 'STEP sends alerts and helps contact citizens in emergencies',
    publisher: 'U.S. Department of State',
    url: 'https://travel.state.gov/content/travel/en/international-travel/before-you-go/step.html',
    note: 'Travel registry benchmark for alerts and emergency contact.',
  },
  {
    id: 'smartraveller',
    label: 'Australia may open crisis registration portals',
    publisher: 'Smartraveller, Australian Government',
    url: 'https://www.smartraveller.gov.au/id/crisis-emergency',
    note: 'Crisis registration benchmark for citizens overseas.',
  },
];

const sourceById = new Map(sources.map((source) => [source.id, source]));

const clips: Record<string, ProductClip> = {
  'setu-yatri': {
    id: 'setu-yatri',
    label: 'Gendu scam check',
    src: '/pitch-deck/captures/setu-yatri.webm',
    poster: '/pitch-deck/captures/setu-yatri.png',
    kind: 'phone',
    startAt: 6,
  },
  'setu-map': {
    id: 'setu-map',
    label: 'SETU local safety map',
    src: '/pitch-deck/captures/setu-map.webm',
    poster: '/pitch-deck/captures/setu-map.png',
    kind: 'phone',
    startAt: 6,
  },
  'setu-profile': {
    id: 'setu-profile',
    label: 'Reviewer profile and consent',
    src: '/pitch-deck/captures/setu-profile.webm',
    poster: '/pitch-deck/captures/setu-profile.png',
    kind: 'phone',
    startAt: 6,
  },
  'setu-resources': {
    id: 'setu-resources',
    label: 'Legal and resources',
    src: '/pitch-deck/captures/setu-resources.webm',
    poster: '/pitch-deck/captures/setu-resources.png',
    kind: 'phone',
    startAt: 6,
  },
  'setu-vibe': {
    id: 'setu-vibe',
    label: 'SETU community signals',
    src: '/pitch-deck/captures/setu-vibe.webm',
    poster: '/pitch-deck/captures/setu-vibe.png',
    kind: 'phone',
    startAt: 6,
  },
  'gov-overview': {
    id: 'gov-overview',
    label: 'National overview',
    src: '/pitch-deck/captures/gov-overview.webm',
    poster: '/pitch-deck/captures/gov-overview.png',
    kind: 'desktop',
    startAt: 5,
  },
  'gov-map': {
    id: 'gov-map',
    label: 'Map and hotspots',
    src: '/pitch-deck/captures/gov-map.webm',
    poster: '/pitch-deck/captures/gov-map.png',
    kind: 'desktop',
    startAt: 5,
  },
  'gov-risk': {
    id: 'gov-risk',
    label: 'Risk escalation',
    src: '/pitch-deck/captures/gov-risk.webm',
    poster: '/pitch-deck/captures/gov-risk.png',
    kind: 'desktop',
    startAt: 5,
  },
  'gov-predictive': {
    id: 'gov-predictive',
    label: 'Predictive insights',
    src: '/pitch-deck/captures/gov-predictive.webm',
    poster: '/pitch-deck/captures/gov-predictive.png',
    kind: 'desktop',
    startAt: 5,
  },
  'gov-interventions': {
    id: 'gov-interventions',
    label: 'Interventions',
    src: '/pitch-deck/captures/gov-interventions.webm',
    poster: '/pitch-deck/captures/gov-interventions.png',
    kind: 'desktop',
    startAt: 5,
  },
};

const phoneClipIds = ['setu-yatri', 'setu-vibe', 'setu-resources', 'setu-profile'];
const dashboardClipIds = ['gov-overview', 'gov-map', 'gov-risk', 'gov-predictive', 'gov-interventions'];

const slides: DeckSlide[] = [
  {
    id: 'title',
    nav: 'Problem',
    title: 'GovTech Safety Platform',
    headline: 'Protect every citizen corridor.',
    support: 'A live safety layer for governments with people abroad.',
    visual: 'hero',
    sourceIds: ['mea-diaspora', 'prisms-students'],
    speakerNotes: 'Open with the wedge: India to Australia. This is not a student app pitch. It is infrastructure for governments with citizens outside their borders.',
  },
  {
    id: 'insight',
    nav: 'Problem',
    title: 'One-line insight',
    headline: 'Emergency data is too late.',
    support: 'COVID proved the scale: India repatriated 6.75M+ people from abroad.',
    visual: 'insight',
    sourceIds: ['vande-bharat', 'oaic-emergency'],
    speakerNotes: 'The core insight: trust, consent, and useful contact paths have to exist before an evacuation, assault, wage theft cluster, or welfare incident.',
  },
  {
    id: 'problem',
    nav: 'Problem',
    title: 'Problem',
    headline: 'Migrants are hard to reach. Risk arrives late.',
    support: 'Businesses need trusted access. Governments need triage intelligence. Today both happen after the signal is already scattered.',
    visual: 'problem',
    sourceIds: ['mea-diaspora', 'prisms-students'],
    speakerNotes: 'Make the two-sided wedge explicit: the same lifestyle engagement that attracts businesses also creates the consented signal layer governments need.',
  },
  {
    id: 'government-struggle',
    nav: 'Problem',
    title: 'Why governments struggle',
    headline: 'Governments are accountable without visibility.',
    support: 'By the time a registry, alert, or complaint appears, the weak signals are already late.',
    visual: 'struggle',
    sourceIds: ['madad', 'step', 'smartraveller'],
    speakerNotes: 'Respect current infrastructure. MADAD, STEP, and crisis portals matter. SETU sits earlier: daily engagement before formal escalation.',
  },
  {
    id: 'privacy-gap',
    nav: 'Problem',
    title: 'Privacy gap',
    headline: 'Privacy breaks last-minute crisis access.',
    support: 'Crisis response cannot rely on ad hoc data access. Purpose, limits, and consent need to exist beforehand.',
    visual: 'privacy',
    sourceIds: ['oaic-emergency', 'oaic-consent'],
    speakerNotes: 'This is why SETU is not surveillance. It is a consented operating layer that creates lawful, useful pathways ahead of the emergency.',
  },
  {
    id: 'solution',
    nav: 'Product',
    title: 'Solution',
    headline: 'Lifestyle engagement creates triage intelligence.',
    support: 'Businesses bring daily value. Citizens engage voluntarily. Governments receive privacy-safe risk signals.',
    visual: 'solution',
    sourceIds: ['govtech', 'oecd-proactive'],
    speakerNotes: 'The product insight is not just safety. The lifestyle layer gives migrants reasons to engage, gives businesses distribution, and gives governments consented intelligence.',
  },
  {
    id: 'citizen-app',
    nav: 'Product',
    title: 'Citizen product',
    headline: 'Everyday utility brings migrants back.',
    support: 'Gendu scam checks, Vibe alerts, Legal and Resources, partner services, local safety, and consent prompts.',
    visual: 'phone',
    sourceIds: ['student-safety'],
    speakerNotes: 'Show the actual app screens. Frame this as new-resident and migrant utility, not a panic button.',
  },
  {
    id: 'government-dashboard',
    nav: 'Product',
    title: 'Government product',
    headline: 'The dashboard turns signals into action.',
    support: 'Missions see posture, hotspots, risk queues, predictions, interventions, and audit trails.',
    visual: 'dashboard',
    sourceIds: ['govtech', 'oecd-proactive'],
    speakerNotes: 'This is the buyer interface: command-center clarity for welfare teams and consular operators.',
  },
  {
    id: 'engine',
    nav: 'Product',
    title: 'Predictive engine',
    headline: 'Predict risk before it becomes a case.',
    support: 'The model surfaces where officers should look. Humans decide what to do.',
    visual: 'engine',
    sourceIds: ['student-safety', 'oecd-proactive'],
    speakerNotes: 'Do not claim automated decisions. The engine creates earlier human judgment points.',
  },
  {
    id: 'market',
    nav: 'Market',
    title: 'Market opportunity',
    headline: 'Start India to Australia. Repeat corridor by corridor.',
    support: 'A 976K-person corridor, with 145,012 Indian students as a measurable high-need wedge.',
    visual: 'market',
    sourceIds: ['mea-diaspora', 'prisms-students', 'education-export'],
    speakerNotes: 'The market is corridor infrastructure. India to Australia is the proof corridor, not the ceiling.',
  },
  {
    id: 'business-model',
    nav: 'Market',
    title: 'Business model',
    headline: 'Government SaaS plus trusted business access.',
    support: 'Governments pay for corridor intelligence. Businesses join because SETU owns trusted migrant engagement.',
    visual: 'model',
    sourceIds: ['govtech'],
    speakerNotes: 'Keep numbers out until pricing is confirmed. The strategic point: one lifestyle network supports government SaaS and business partner distribution.',
  },
  {
    id: 'gtm',
    nav: 'GTM',
    title: 'Go to market',
    headline: 'Govtech GTM is proof-led.',
    support: 'Convert founder-provided pilot proof and paid EOIs into repeatable corridor references.',
    visual: 'gtm',
    sourceIds: [],
    speakerNotes: 'Pilot, EOI, and UK pipeline claims must remain founder-provided until documents are added to the evidence drawer.',
  },
  {
    id: 'competition',
    nav: 'GTM',
    title: 'Competitive landscape',
    headline: 'Registries alert. SETU stays connected.',
    support: 'Registries, university tools, chat groups, and risk platforms solve pieces. SETU is the operating layer.',
    visual: 'competitive',
    sourceIds: ['step', 'smartraveller', 'madad'],
    speakerNotes: 'The white space is daily utility plus government-grade intervention workflow.',
  },
  {
    id: 'why-now',
    nav: 'Why Now',
    title: 'Why now',
    headline: 'Mobility, privacy, and GovTech changed at once.',
    support: 'A$53.6B education exports, stricter consent expectations, and proactive GovTech are converging.',
    visual: 'why-now',
    sourceIds: ['education-export', 'oaic-consent', 'govtech', 'oecd-proactive'],
    speakerNotes: 'This is why a static registry is not enough now. Governments need live, consented, useful systems.',
  },
  {
    id: 'closing',
    nav: 'Why Now',
    title: 'Closing',
    headline: 'No citizen should disappear between systems.',
    support: 'A trusted safety rail for mobile citizens, built corridor by corridor before the next crisis.',
    visual: 'closing',
    sourceIds: ['mea-diaspora', 'vande-bharat'],
    speakerNotes: 'Close on ambition: a global civic infrastructure company, starting with India to Australia.',
  },
];

const navSections = ['Problem', 'Product', 'Market', 'GTM', 'Why Now'] as const;

function buildArc(from: [number, number], to: [number, number], bend = 18, steps = 80): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const lon = from[0] + (to[0] - from[0]) * t;
    const lat = from[1] + (to[1] - from[1]) * t + Math.sin(Math.PI * t) * bend;
    return [lon, lat];
  });
}

const corridorRoutes: CorridorRoute[] = [
  {
    id: 'india-australia',
    label: 'India to Australia',
    origin: 'India',
    destination: 'Australia',
    color: '#ffb548',
    status: 'First corridor',
    from: [78.9629, 20.5937],
    to: [133.7751, -25.2744],
    arc: buildArc([78.9629, 20.5937], [133.7751, -25.2744], 10),
  },
  {
    id: 'india-uk',
    label: 'India to UK',
    origin: 'India',
    destination: 'UK',
    color: '#6aa5ff',
    status: 'Planned expansion',
    from: [78.9629, 20.5937],
    to: [-3.436, 55.3781],
    arc: buildArc([78.9629, 20.5937], [-3.436, 55.3781], 28),
  },
  {
    id: 'malaysia-australia',
    label: 'Malaysia to Australia',
    origin: 'Malaysia',
    destination: 'Australia',
    color: '#5ed4c2',
    status: 'Expansion demand',
    from: [101.9758, 4.2105],
    to: [133.7751, -25.2744],
    arc: buildArc([101.9758, 4.2105], [133.7751, -25.2744], 9),
  },
  {
    id: 'indonesia-australia',
    label: 'Indonesia to Australia',
    origin: 'Indonesia',
    destination: 'Australia',
    color: '#f2c56b',
    status: 'Expansion demand',
    from: [113.9213, -0.7893],
    to: [133.7751, -25.2744],
    arc: buildArc([113.9213, -0.7893], [133.7751, -25.2744], 6),
  },
  {
    id: 'china-australia',
    label: 'China to Australia',
    origin: 'China',
    destination: 'Australia',
    color: '#7ca7df',
    status: 'Expansion demand',
    from: [104.1954, 35.8617],
    to: [133.7751, -25.2744],
    arc: buildArc([104.1954, 35.8617], [133.7751, -25.2744], 8),
  },
];

const destinationCities = [
  { city: 'Melbourne', point: [144.9631, -37.8136] as [number, number] },
  { city: 'Sydney', point: [151.2093, -33.8688] as [number, number] },
  { city: 'Brisbane', point: [153.0251, -27.4698] as [number, number] },
  { city: 'Perth', point: [115.8605, -31.9505] as [number, number] },
  { city: 'Adelaide', point: [138.6007, -34.9285] as [number, number] },
];

const mapNodes: MapNode[] = [
  { id: 'india', label: 'India', point: [78.9629, 20.5937], kind: 'origin', status: 'Origin' },
  { id: 'uk', label: 'United Kingdom', point: [-3.436, 55.3781], kind: 'origin', status: 'Next corridor' },
  { id: 'china', label: 'China', point: [104.1954, 35.8617], kind: 'origin', status: 'Expansion demand' },
  { id: 'malaysia', label: 'Malaysia', point: [101.9758, 4.2105], kind: 'origin', status: 'Expansion demand' },
  { id: 'indonesia', label: 'Indonesia', point: [113.9213, -0.7893], kind: 'origin', status: 'Expansion demand' },
  { id: 'australia', label: 'Australia', point: [133.7751, -25.2744], kind: 'destination', status: 'Active corridor' },
  ...destinationCities.map((city) => ({
    id: city.city.toLowerCase(),
    label: city.city,
    point: city.point,
    kind: 'city' as const,
    status: 'Protection node',
  })),
];

const heroMetrics: SlideMetric[] = [
  { label: 'overseas Indians', value: '34.36M' },
  { label: 'in Australia', value: '976K' },
  { label: 'corridor proof', value: 'Paid', detail: 'founder-provided' },
];

const businessPartners: BusinessPartner[] = [
  { name: 'HCF', category: 'health cover' },
  { name: 'Westpac', category: 'banking' },
  { name: 'Optus', category: 'connectivity' },
];

const urgencyMetrics: Record<string, SlideMetric[]> = {
  insight: [
    { value: '6.75M+', label: 'people repatriated in COVID-era Vande Bharat' },
    { value: 'Emergency', label: 'is the worst time to build consent' },
  ],
  problem: [
    { value: '34.36M', label: 'mobile Indian diaspora globally' },
    { value: '976K', label: 'people in the Australia corridor' },
    { value: '3 live partners', label: 'HCF, Westpac, Optus' },
  ],
  struggle: [
    { value: 'Late', label: 'registries depend on opt-in after travel' },
    { value: 'Manual', label: 'grievances start after someone files' },
    { value: 'Blind', label: 'weak signals sit outside government systems' },
  ],
  privacy: [
    { value: 'Purpose', label: 'must be clear' },
    { value: 'Consent', label: 'must be current and specific' },
    { value: 'Planning', label: 'must happen before crisis' },
  ],
  market: [
    { value: '976K', label: 'Overseas Indians in Australia' },
    { value: '145,012', label: 'Indian students in Australia' },
    { value: 'A$9.3B', label: 'India-linked education exports' },
  ],
  whyNow: [
    { value: 'A$53.6B', label: 'international education export income' },
    { value: '851,780', label: 'international students in Australia, 2025' },
    { value: 'Proactive', label: 'GovTech operating model' },
  ],
};

const pitchMapBounds = {
  west: -12,
  east: 160,
  north: 62,
  south: -46,
};

function mercatorY(latitude: number) {
  const rad = (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

function projectGeoPoint(point: [number, number]) {
  const [lon, lat] = point;
  const x = ((lon - pitchMapBounds.west) / (pitchMapBounds.east - pitchMapBounds.west)) * 100;
  const north = mercatorY(pitchMapBounds.north);
  const south = mercatorY(pitchMapBounds.south);
  const y = ((north - mercatorY(lat)) / (north - south)) * 100;
  return [
    Math.max(2, Math.min(98, x)),
    Math.max(4, Math.min(92, y)),
  ] as [number, number];
}

function buildGeoPath(points: [number, number][]) {
  return points
    .map((point, index) => {
      const [x, y] = projectGeoPoint(point);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function ringToPath(ring: [number, number][]) {
  return `${ring
    .map((point, index) => {
      const [x, y] = projectGeoPoint(point);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ')} Z`;
}

function geometryToPaths(geometry: { type: string; coordinates: unknown }) {
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as [number, number][][]).map((ring) => ringToPath(ring));
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as [number, number][][][]).flatMap((polygon) => polygon.map((ring) => ringToPath(ring)));
  }
  return [];
}

function useWorldMapPaths() {
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    void fetch('/pitch-deck/ne_110m_admin_0_countries.geojson')
      .then((response) => response.json())
      .then((geojson: { features?: Array<{ geometry?: { type: string; coordinates: unknown } }> }) => {
        if (!mounted) return;
        const nextPaths = (geojson.features || [])
          .flatMap((feature) => (feature.geometry ? geometryToPaths(feature.geometry) : []))
          .filter(Boolean);
        setPaths(nextPaths);
      })
      .catch(() => {
        if (mounted) setPaths([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return paths;
}

const pitchMapStyle = {
  version: 8,
  sources: {
    worldCountries: {
      type: 'geojson',
      data: '/pitch-deck/ne_110m_admin_0_countries.geojson',
    },
    esriWorldImagery: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community.',
    },
  },
  layers: [
    {
      id: 'pitch-map-background',
      type: 'background',
      paint: {
        'background-color': '#061017',
      },
    },
    {
      id: 'pitch-map-satellite',
      type: 'raster',
      source: 'esriWorldImagery',
      paint: {
        'raster-opacity': 0.62,
        'raster-saturation': -0.48,
        'raster-contrast': 0.32,
        'raster-brightness-min': 0.04,
        'raster-brightness-max': 0.82,
      },
    },
    {
      id: 'pitch-map-country-fill',
      type: 'fill',
      source: 'worldCountries',
      paint: {
        'fill-color': '#15252d',
        'fill-opacity': 0.58,
      },
    },
    {
      id: 'pitch-map-country-line',
      type: 'line',
      source: 'worldCountries',
      paint: {
        'line-color': '#5f7480',
        'line-opacity': 0.32,
        'line-width': 0.65,
      },
    },
  ],
};

function useAutoIndex(length: number, delay: number) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (length < 2) return undefined;
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, delay);
    return () => window.clearInterval(interval);
  }, [delay, length]);

  return [index, setIndex] as const;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const handleChange = () => setReduced(query.matches);
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return reduced;
}

function MediaClip({ clip, className = '' }: { clip: ProductClip; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startAt = clip.startAt || 0;

  const startVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (startAt > 0 && video.currentTime < startAt) {
      const targetTime = Number.isFinite(video.duration)
        ? Math.min(startAt, Math.max(0, video.duration - 0.4))
        : startAt;
      video.currentTime = targetTime;
    }
    void video.play().catch(() => {});
  };

  const loopVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = startAt;
    void video.play().catch(() => {});
  };

  if (reducedMotion || failed) {
    return <img className={`pitch-media ${className}`} src={clip.poster} alt={clip.label} />;
  }

  return (
    <video
      ref={videoRef}
      className={`pitch-media ${className}`}
      src={clip.src}
      poster={clip.poster}
      aria-label={clip.label}
      autoPlay
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={startVideo}
      onEnded={loopVideo}
      onError={() => setFailed(true)}
    />
  );
}

function SourceMarkers({
  sourceIds,
  onOpenEvidence,
}: {
  sourceIds: string[];
  onOpenEvidence: () => void;
}) {
  if (!sourceIds.length) {
    return <span className="pitch-source-founder">Founder-provided claim. Add documents before external fundraising.</span>;
  }

  return (
    <div className="pitch-source-markers" aria-label="Slide sources">
      {sourceIds.map((sourceId) => {
        const source = sourceById.get(sourceId);
        if (!source) return null;
        return (
          <button key={sourceId} type="button" onClick={onOpenEvidence}>
            <BookOpenCheck size={14} />
            {source.publisher}
          </button>
        );
      })}
    </div>
  );
}

function MetricStrip({ metrics, className = '' }: { metrics: SlideMetric[]; className?: string }) {
  return (
    <div className={`pitch-metric-strip ${className}`}>
      {metrics.map((metric) => (
        <div key={`${metric.value}-${metric.label}`}>
          <strong>{metric.value}</strong>
          <span>{metric.label}</span>
          {metric.detail ? <em>{metric.detail}</em> : null}
        </div>
      ))}
    </div>
  );
}

function MetricStack({ metrics }: { metrics: SlideMetric[] }) {
  return (
    <div className="pitch-metric-stack">
      {metrics.map((metric) => (
        <div key={`${metric.value}-${metric.label}`}>
          <strong>{metric.value}</strong>
          <span>{metric.label}</span>
        </div>
      ))}
    </div>
  );
}

function CorridorMap({
  compact = false,
  showCard = true,
  variant = 'default',
  hideLabels = false,
}: {
  compact?: boolean;
  showCard?: boolean;
  variant?: 'default' | 'hero' | 'market';
  hideLabels?: boolean;
}) {
  const [routeIndex, setRouteIndex] = useAutoIndex(corridorRoutes.length, variant === 'hero' ? 14000 : 9000);
  const [flow, setFlow] = useState(0);
  const activeRoute = corridorRoutes[routeIndex];
  const activePoint = activeRoute.arc[Math.min(activeRoute.arc.length - 1, Math.floor(flow * (activeRoute.arc.length - 1)))];
  const worldPaths = useWorldMapPaths();

  useEffect(() => {
    const started = performance.now();
    const interval = window.setInterval(() => {
      setFlow(((performance.now() - started) % 2800) / 2800);
    }, 50);
    return () => window.clearInterval(interval);
  }, []);

  const routeGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: corridorRoutes.map((route) => ({
        type: 'Feature',
        properties: {
          id: route.id,
          color: route.color,
          active: route.id === activeRoute.id ? 1 : 0,
        },
        geometry: {
          type: 'LineString',
          coordinates: route.arc,
        },
      })),
    }),
    [activeRoute.id],
  );

  const cityGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: destinationCities.map((city) => ({
        type: 'Feature',
        properties: { city: city.city },
        geometry: { type: 'Point', coordinates: city.point },
      })),
    }),
    [],
  );

  const viewState = variant === 'hero'
    ? { longitude: 100, latitude: 0, zoom: compact ? 1.82 : 1.95 }
    : variant === 'market'
      ? { longitude: 93, latitude: 8, zoom: compact ? 1.5 : 1.65 }
      : { longitude: 95, latitude: 3, zoom: compact ? 1.45 : 1.65 };

  return (
    <div className={`pitch-corridor-map pitch-corridor-map-${variant} ${compact ? 'pitch-corridor-map-compact' : ''}`}>
      <MapGL
        initialViewState={viewState}
        mapStyle={pitchMapStyle as never}
        attributionControl={false}
        interactive={false}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="pitch-corridor-routes" type="geojson" data={routeGeoJson as never}>
          <Layer
            id="pitch-corridor-routes-glow"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['case', ['==', ['get', 'active'], 1], 13, 4],
              'line-opacity': ['case', ['==', ['get', 'active'], 1], 0.22, 0.06],
              'line-blur': ['case', ['==', ['get', 'active'], 1], 6, 3],
            }}
          />
          <Layer
            id="pitch-corridor-routes-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['case', ['==', ['get', 'active'], 1], 3.6, 1.1],
              'line-opacity': ['case', ['==', ['get', 'active'], 1], 0.96, 0.22],
              'line-blur': ['case', ['==', ['get', 'active'], 1], 0.1, 0.8],
            }}
          />
        </Source>

        <Source id="pitch-destination-cities" type="geojson" data={cityGeoJson as never}>
          <Layer
            id="pitch-destination-city-rings"
            type="circle"
            paint={{
              'circle-radius': 8,
              'circle-color': '#5ed4c2',
              'circle-opacity': 0.2,
              'circle-stroke-width': 1.4,
              'circle-stroke-color': '#89f7e6',
              'circle-stroke-opacity': 0.75,
            }}
          />
        </Source>

      </MapGL>

      <div className="pitch-map-geo-overlay" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <g className="pitch-world-land">
            {worldPaths.map((path, index) => (
              <path key={`${index}-${path.length}`} d={path} />
            ))}
          </g>
          <g className="pitch-route-lines">
          {corridorRoutes.map((route) => (
            <path
              key={route.id}
              className={route.id === activeRoute.id ? 'is-active' : ''}
              d={buildGeoPath(route.arc)}
              style={{ '--route-color': route.color } as React.CSSProperties}
            />
          ))}
          </g>
        </svg>

        {mapNodes.map((node) => {
          if (variant === 'hero' && node.kind === 'origin' && !['india', 'uk'].includes(node.id)) return null;
          if (variant === 'hero' && node.kind === 'city' && !['melbourne', 'sydney', 'brisbane', 'perth', 'adelaide'].includes(node.id)) return null;
          const [x, y] = projectGeoPoint(node.point);
          return (
            <button
              key={node.id}
              type="button"
              className={`pitch-map-node pitch-map-node-${node.kind} ${hideLabels ? 'pitch-map-node-dot-only' : ''} ${node.id === 'india' || node.id === 'australia' ? 'is-primary' : ''}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => {
                const index = corridorRoutes.findIndex((route) => route.origin === node.label || route.destination === node.label);
                if (index >= 0) setRouteIndex(index);
              }}
              aria-label={`${node.label}: ${node.status || 'corridor node'}`}
            >
              <span />
              {!hideLabels ? <strong>{node.label}</strong> : null}
            </button>
          );
        })}

        {activePoint ? (
          <span
            className="pitch-map-live-dot"
            style={{
              left: `${projectGeoPoint(activePoint)[0]}%`,
              top: `${projectGeoPoint(activePoint)[1]}%`,
            }}
          />
        ) : null}
      </div>

      {!hideLabels ? (
        <div className="pitch-map-status">
          <strong>{activeRoute.label}</strong>
          <span>{activeRoute.status}</span>
        </div>
      ) : null}

      {showCard && (
        <div className="pitch-map-card">
          <span>{activeRoute.status}</span>
          <strong>{activeRoute.label}</strong>
          <p>Consented signals become corridor-level protection, local outreach, and human escalation.</p>
        </div>
      )}
    </div>
  );
}

function PhoneCinema() {
  const [clipIndex, setClipIndex] = useAutoIndex(phoneClipIds.length, 6500);
  const activeClip = clips[phoneClipIds[clipIndex]];

  return (
    <div className="pitch-phone-cinema">
      <div className="pitch-phone-frame">
        <span className="pitch-phone-speaker" />
        <MediaClip clip={activeClip} />
      </div>
      <div className="pitch-clip-rail" role="tablist" aria-label="SETU product clips">
        {phoneClipIds.map((clipId, index) => (
          <button
            key={clipId}
            type="button"
            className={index === clipIndex ? 'is-active' : ''}
            onClick={() => setClipIndex(index)}
          >
            {clips[clipId].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardCinema({ featured = false }: { featured?: boolean }) {
  const [clipIndex, setClipIndex] = useAutoIndex(dashboardClipIds.length, 4800);
  const activeClip = clips[dashboardClipIds[clipIndex]];

  return (
    <div className={`pitch-dashboard-cinema ${featured ? 'pitch-dashboard-featured' : ''}`}>
      <div className="pitch-dashboard-tabs">
        {dashboardClipIds.map((clipId, index) => (
          <button
            key={clipId}
            type="button"
            className={index === clipIndex ? 'is-active' : ''}
            onClick={() => setClipIndex(index)}
          >
            {clips[clipId].label}
          </button>
        ))}
      </div>
      <div className="pitch-desktop-frame">
        <div className="pitch-browser-bar">
          <span />
          <span />
          <span />
          <p>govt.knowwhatson.com/{activeClip.id.replace('gov-', '')}</p>
        </div>
        <MediaClip clip={activeClip} />
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="pitch-hero-visual">
      <CorridorMap compact showCard={false} variant="hero" hideLabels />
    </div>
  );
}

function InsightVisual() {
  return (
    <div className="pitch-timeline-visual pitch-cinematic-scene">
      <MetricStack metrics={urgencyMetrics.insight} />
      <div className="pitch-timeline-line">
        {[
          ['Before', 'trust and consent'],
          ['Weak signal', 'risk appears'],
          ['Officer action', 'targeted support'],
          ['Crisis', 'contact path exists'],
        ].map(([label, detail], index) => (
          <div key={label} className="pitch-timeline-node" style={{ '--delay': `${index * 120}ms` } as React.CSSProperties}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{label}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FragmentedVisual() {
  const cards = [
    ['Migrant', 'needs services, trust, support'],
    ['Businesses', 'need verified access, not cold ads'],
    ['Government', 'needs triage, not late complaints'],
  ];

  return (
    <div className="pitch-fragment-grid pitch-cinematic-scene">
      <MetricStack metrics={urgencyMetrics.problem} />
      <div className="pitch-fragment-network">
        {cards.map(([title, detail], index) => (
          <div key={title} style={{ '--node-index': index } as React.CSSProperties}>
            <CircleDot size={18} />
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        ))}
        <div className="pitch-fragment-center">
          <Network size={28} />
          <span>Lifestyle engagement is the missing bridge.</span>
        </div>
      </div>
    </div>
  );
}

function StruggleVisual() {
  return (
    <div className="pitch-workflow-visual pitch-cinematic-scene">
      <MetricStack metrics={urgencyMetrics.struggle} />
      <div className="pitch-workflow-rail">
        {[
          ['Registry', 'known users only'],
          ['Alert', 'broadcast'],
          ['Complaint', 'manual intake'],
          ['Officer', 'late escalation'],
        ].map(([title, detail], index) => (
          <div key={title}>
            <span>{index + 1}</span>
            <strong>{title}</strong>
            <p>{detail}</p>
          </div>
        ))}
        <ArrowRight className="pitch-workflow-arrow" />
      </div>
    </div>
  );
}

function PrivacyVisual() {
  return (
    <div className="pitch-consent-stack pitch-cinematic-scene">
      <MetricStack metrics={urgencyMetrics.privacy} />
      <div className="pitch-consent-layers">
        {[
          ['Daily services', 'low sensitivity'],
          ['Location context', 'purpose bound'],
          ['Wellbeing signal', 'citizen controlled'],
          ['Safety check', 'incident specific'],
          ['Emergency share', 'narrow and auditable'],
        ].map(([title, detail], index) => (
          <div key={title} style={{ '--stack-index': index } as React.CSSProperties}>
            <LockKeyhole size={18} />
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SolutionVisual() {
  return (
    <div className="pitch-ecosystem-visual pitch-cinematic-scene">
      <div className="pitch-ecosystem-core">
        <ShieldCheck size={28} />
        <strong>SETU lifestyle app</strong>
        <p>Trusted daily utility for migrants and new residents.</p>
      </div>
      <div className="pitch-partner-row">
        {businessPartners.map((partner) => (
          <div key={partner.name}>
            <span>Live partner</span>
            <strong>{partner.name}</strong>
            <p>{partner.category}</p>
          </div>
        ))}
      </div>
      <div className="pitch-ecosystem-flow">
        <div>
          <Users size={22} />
          <strong>Migrant engagement</strong>
          <p>services, offers, support, local trust</p>
        </div>
        <ArrowRight />
        <div>
          <SignalHigh size={22} />
          <strong>Consented signals</strong>
          <p>usage, support needs, risk clusters</p>
        </div>
        <ArrowRight />
        <div>
          <Landmark size={22} />
          <strong>Government triage</strong>
          <p>aggregate posture, outreach, escalation</p>
        </div>
      </div>
    </div>
  );
}

function EngineVisual() {
  return (
    <div className="pitch-engine-visual pitch-cinematic-scene">
      <div className="pitch-engine-core">
        <Radar size={44} />
        <strong>Human-led risk engine</strong>
        <p>Models surface where to look. Officers decide what to do.</p>
      </div>
      {[
        ['Watch', 'local cluster'],
        ['Nudge', 'targeted guidance'],
        ['Outreach', 'consented contact'],
        ['Escalate', 'case workflow'],
      ].map(([title, detail]) => (
        <div key={title} className="pitch-engine-orbit">
          <span>{title}</span>
          <p>{detail}</p>
        </div>
      ))}
    </div>
  );
}

function MarketVisual() {
  return (
    <div className="pitch-market-visual">
      <CorridorMap showCard={false} variant="market" />
      <div className="pitch-market-stats">
        {urgencyMetrics.market.map((metric) => (
          <div key={metric.value}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelVisual() {
  return (
    <div className="pitch-model-visual pitch-cinematic-scene">
      {[
        ['Government SaaS', 'annual corridor license for triage intelligence'],
        ['Safety modules', 'welfare, crisis, analytics, interventions'],
        ['Business access', 'trusted partner distribution through lifestyle utility'],
        ['Corridor platform', 'repeatable expansion by country pair'],
      ].map(([title, detail]) => (
        <div key={title}>
          <Building2 size={22} />
          <strong>{title}</strong>
          <p>{detail}</p>
        </div>
      ))}
    </div>
  );
}

function GtmVisual() {
  return (
    <div className="pitch-gtm-visual pitch-cinematic-scene">
      {[
        ['Paid pilot proof', 'founder-provided'],
        ['Government reference', 'document gate'],
        ['Community distribution', 'trusted channels'],
        ['Corridor expansion', 'Malaysia, Indonesia, China'],
        ['Regional platform', 'multi-country portfolio'],
      ].map(([item, detail], index) => (
        <div key={item}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{item}</strong>
          <p>{detail}</p>
        </div>
      ))}
    </div>
  );
}

function CompetitiveVisual() {
  return (
    <div className="pitch-competitive-visual pitch-cinematic-scene">
      <div className="pitch-axis pitch-axis-y">Proactive</div>
      <div className="pitch-axis pitch-axis-x">Daily utility</div>
      {[
        ['Travel registries', 'reactive alerts', 'low-x low-y'],
        ['University support tools', 'local fragments', 'mid-x low-y'],
        ['Corporate risk', 'traveller duty of care', 'low-x mid-y'],
        ['SETU', 'government-grade daily layer', 'high-x high-y'],
      ].map(([title, detail, className]) => (
        <div key={title} className={`pitch-competitor-dot ${className}`}>
          <strong>{title}</strong>
          <span>{detail}</span>
        </div>
      ))}
    </div>
  );
}

function WhyNowVisual() {
  return (
    <div className="pitch-why-now-visual pitch-cinematic-scene">
      <MetricStrip metrics={urgencyMetrics.whyNow} />
      {[
        ['Mobility', 'high-value, politically visible corridors'],
        ['Privacy', 'consent, purpose, minimisation'],
        ['GovTech', 'citizen-centric, data-driven services'],
      ].map(([title, detail], index) => (
        <div key={title} style={{ '--wave-index': index } as React.CSSProperties}>
          <Sparkles size={24} />
          <strong>{title}</strong>
          <p>{detail}</p>
        </div>
      ))}
    </div>
  );
}

function ClosingVisual() {
  return (
    <div className="pitch-closing-visual">
      <CorridorMap compact showCard={false} variant="hero" />
      <div className="pitch-closing-card">
        <ShieldCheck size={28} />
        <strong>Global safety rail</strong>
        <p>Consent before crisis. Corridor by corridor.</p>
      </div>
    </div>
  );
}

function VisualStage({ slide }: { slide: DeckSlide }) {
  switch (slide.visual) {
    case 'hero':
      return <HeroVisual />;
    case 'insight':
      return <InsightVisual />;
    case 'problem':
      return <FragmentedVisual />;
    case 'struggle':
      return <StruggleVisual />;
    case 'privacy':
      return <PrivacyVisual />;
    case 'solution':
      return <SolutionVisual />;
    case 'phone':
      return <PhoneCinema />;
    case 'dashboard':
      return <DashboardCinema featured />;
    case 'engine':
      return <EngineVisual />;
    case 'market':
      return <MarketVisual />;
    case 'model':
      return <ModelVisual />;
    case 'gtm':
      return <GtmVisual />;
    case 'competitive':
      return <CompetitiveVisual />;
    case 'why-now':
      return <WhyNowVisual />;
    case 'closing':
      return <ClosingVisual />;
    default:
      return <CorridorMap />;
  }
}

function Drawer({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="pitch-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="pitch-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="pitch-drawer-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function PitchDeckPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setEvidenceOpen(false);
        setNotesOpen(false);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(slides.length - 1, index + 1));
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
      }

      if (event.key === 'Home') setActiveIndex(0);
      if (event.key === 'End') setActiveIndex(slides.length - 1);
      if (event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setNotesOpen(false);
        setEvidenceOpen((open) => !open);
      }
      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setEvidenceOpen(false);
        setNotesOpen((open) => !open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const jumpToSection = (section: DeckSlide['nav']) => {
    const index = slides.findIndex((slide) => slide.nav === section);
    if (index >= 0) setActiveIndex(index);
  };

  return (
    <main className="pitch-deck-page">
      <div className="pitch-desktop-only">
        <header className="pitch-topbar">
          <button type="button" className="pitch-brand" onClick={() => setActiveIndex(0)}>
            <span>SETU</span>
            <strong>Protect every citizen corridor</strong>
          </button>

          <nav className="pitch-nav" aria-label="Deck sections">
            {navSections.map((section) => (
              <button
                key={section}
                type="button"
                className={activeSlide.nav === section ? 'is-active' : ''}
                onClick={() => jumpToSection(section)}
              >
                {section}
              </button>
            ))}
          </nav>

          <div className="pitch-actions">
            <button type="button" onClick={() => {
              setNotesOpen(false);
              setEvidenceOpen(true);
            }}>
              <BookOpenCheck size={18} />
              Evidence
            </button>
            <button type="button" onClick={() => {
              setEvidenceOpen(false);
              setNotesOpen(true);
            }}>
              <FileText size={18} />
              Notes
            </button>
            <button type="button" onClick={() => window.print()}>
              <Printer size={18} />
              Print
            </button>
          </div>
        </header>

        <div className="pitch-progress" aria-hidden="true">
          <span style={{ width: `${((activeIndex + 1) / slides.length) * 100}%` }} />
        </div>

        <section
          className={`pitch-slide-shell ${activeSlide.visual === 'hero' ? 'pitch-slide-shell-hero' : ''}`}
          aria-label={`${activeIndex + 1} of ${slides.length}: ${activeSlide.title}`}
        >
          <div className="pitch-copy-panel">
            <p className="pitch-slide-count">
              {String(activeIndex + 1).padStart(2, '0')} / {slides.length}
            </p>
            <p className="pitch-slide-title">{activeSlide.title}</p>
            <h1>{activeSlide.headline}</h1>
            <p className="pitch-support">{activeSlide.support}</p>
            {activeSlide.visual === 'hero' ? <MetricStrip metrics={heroMetrics} className="pitch-hero-metrics" /> : null}
            <SourceMarkers sourceIds={activeSlide.sourceIds} onOpenEvidence={() => {
              setNotesOpen(false);
              setEvidenceOpen(true);
            }} />
          </div>

          <div className="pitch-visual-panel">
            <VisualStage slide={activeSlide} />
          </div>
        </section>

        <footer className="pitch-controlbar">
          <button type="button" onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} disabled={activeIndex === 0}>
            <ChevronLeft size={18} />
            Previous
          </button>
          <div className="pitch-slide-dots" aria-label="Slide navigation">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className={index === activeIndex ? 'is-active' : ''}
                aria-label={`Open slide ${index + 1}: ${slide.title}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setActiveIndex((index) => Math.min(slides.length - 1, index + 1))}
            disabled={activeIndex === slides.length - 1}
          >
            Next
            <ChevronRight size={18} />
          </button>
        </footer>

        <Drawer open={evidenceOpen} title="Evidence Spine" onClose={() => setEvidenceOpen(false)}>
          <div className="pitch-evidence-list">
            {sources.map((source) => (
              <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                <div>
                  <strong>{source.label}</strong>
                  <p>{source.publisher}</p>
                  <span>{source.note}</span>
                </div>
                <ExternalLink size={16} />
              </a>
            ))}
          </div>
          <div className="pitch-assumption-box">
            <strong>Founder-provided until documents are added</strong>
            <p>Paid pilot results, paid EOIs from Malaysia, Indonesia, and China, and the planned India to UK paid pilot.</p>
          </div>
        </Drawer>

        <Drawer open={notesOpen} title="Speaker Notes" onClose={() => setNotesOpen(false)}>
          <div className="pitch-notes-card">
            <p className="pitch-slide-title">{activeSlide.title}</p>
            <h3>{activeSlide.headline}</h3>
            <p>{activeSlide.speakerNotes}</p>
          </div>
        </Drawer>
      </div>

      <div className="pitch-mobile-only">
        <div className="pitch-mobile-poster">
          <ShieldCheck size={36} />
          <h1>Open this deck on desktop.</h1>
          <p>SETU is designed here as a live investor product cinema with maps, dashboard motion, notes, and evidence drawers.</p>
        </div>
      </div>

      <div className="pitch-print-deck" aria-hidden="true">
        {slides.map((slide, index) => (
          <section key={slide.id}>
            <p>{String(index + 1).padStart(2, '0')} / {slides.length}</p>
            <h2>{slide.headline}</h2>
            <p>{slide.support}</p>
            <ul>
              {slide.sourceIds.map((sourceId) => {
                const source = sourceById.get(sourceId);
                if (!source) return null;
                return <li key={sourceId}>{source.label} - {source.publisher}</li>;
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
