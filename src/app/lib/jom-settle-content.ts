import {
  Bell,
  Bot,
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
  Utensils,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SETU_CHINA_RESOURCES_DEFAULT_ROUTE } from './resources-routes';
import { setuMalaysiaShortcutIcons } from './setu-malaysia-icons';

export const JOM_SETTLE_ACCENT = '#E53935';

export const jomSettleQuickActions = [
  { label: 'Find Events', ms: 'Cari Events', route: '/vibe?section=events', icon: CalendarDays, image: setuMalaysiaShortcutIcons.events },
  { label: 'Settle Checklist', ms: 'Senarai', route: SETU_CHINA_RESOURCES_DEFAULT_ROUTE, icon: CheckSquare, image: setuMalaysiaShortcutIcons.arrival },
  { label: 'Play Games', ms: 'Main Games', route: '/games', icon: Gamepad2, image: setuMalaysiaShortcutIcons.games },
  { label: 'Safety Alerts', ms: 'Amaran', route: '/vibe?section=alerts', icon: Bell, image: setuMalaysiaShortcutIcons.alerts },
  { label: 'Compare Suburbs', ms: 'Banding Suburbs', route: '/vibe?section=vibe&vibe_tab=suburb-score', icon: MapPin, image: setuMalaysiaShortcutIcons.suburbs },
] as const;

export type JomSettleChecklistGuide = {
  summary: string;
  steps: string[];
  route?: string;
  routeLabel?: string;
  sourceLabel: string;
};

export type JomSettleChecklistItem = {
  id: string;
  title: string;
  defaultCompleted: boolean;
  icon: LucideIcon;
  guide: JomSettleChecklistGuide;
};

export type JomSettleChecklistSection = {
  id: string;
  title: string;
  items: JomSettleChecklistItem[];
};

export const jomSettleChecklistSections: JomSettleChecklistSection[] = [
  {
    id: 'first-week',
    title: 'Minggu pertama, settle dulu',
    items: [
      {
        id: 'activate-sim',
        title: 'Aktifkan SIM / eSIM',
        defaultCompleted: true,
        icon: FileText,
        guide: {
          summary: 'Pastikan data dan SMS berfungsi awal supaya bank, uni, MyGov, dan rental verification code tidak sangkut.',
          steps: ['Bawa passport dan student details.', 'Pilih plan dengan coverage dekat campus dan rumah.', 'Test calls, SMS, dan data sebelum keluar dari kedai.'],
          route: '/arrival',
          routeLabel: 'Tanya Sang Kancil',
          sourceLabel: 'Semak telco dan university IT guidance.',
        },
      },
      {
        id: 'open-bank-account',
        title: 'Buka Australian bank account',
        defaultCompleted: true,
        icon: Home,
        guide: {
          summary: 'Local account membantu untuk rent, gaji, refund, dan rekod bayaran yang jelas.',
          steps: ['Sediakan passport, CoE, visa details, Australian address, dan nombor telefon.', 'Guna official bank apps atau branch appointments.', 'Simpan receipts dan transfer references untuk rent.'],
          sourceLabel: 'Semak official bank onboarding guidance.',
        },
      },
      {
        id: 'apply-tfn',
        title: 'Apply TFN',
        defaultCompleted: true,
        icon: FileText,
        guide: {
          summary: 'Tax File Number diperlukan untuk kerja dan tax. Apply hanya melalui ATO selepas tiba di Australia.',
          steps: ['Pastikan anda sudah berada di Australia dengan valid visa.', 'Apply di ATO website.', 'Simpan TFN dengan selamat dan jangan hantar kepada orang tidak dikenali.'],
          route: '/arrival',
          routeLabel: 'Tanya pasal TFN',
          sourceLabel: 'Semak Australian Taxation Office guidance.',
        },
      },
      {
        id: 'transport-card',
        title: 'Set up Opal / Myki / Go Card',
        defaultCompleted: false,
        icon: Car,
        guide: {
          summary: 'Transport card berbeza ikut city. Selesaikan sebelum orientation week supaya trip ke campus lebih senang.',
          steps: ['Semak card atau app untuk city anda.', 'Link payment method jika supported.', 'Confirm sama ada student concession sesuai dengan course dan visa anda.'],
          route: '/dashboard?view=map',
          routeLabel: 'Buka map',
          sourceLabel: 'Semak state transport dan university student services.',
        },
      },
    ],
  },
  {
    id: 'student-life',
    title: 'Student life, jom',
    items: [
      {
        id: 'oshc',
        title: 'Confirm OSHC cover',
        defaultCompleted: false,
        icon: HeartPulse,
        guide: {
          summary: 'Kenal pasti provider, membership number, start date, claim process, dan clinics berdekatan sebelum perlu guna.',
          steps: ['Download OSHC provider app.', 'Simpan membership dan emergency details.', 'Semak direct billing clinics dekat campus.'],
          route: '/arrival',
          routeLabel: 'Tanya OSHC',
          sourceLabel: 'Semak OSHC provider dan university support pages.',
        },
      },
      {
        id: 'campus-systems',
        title: 'Aktifkan campus systems',
        defaultCompleted: false,
        icon: GraduationCap,
        guide: {
          summary: 'Student email, LMS, MFA, Wi-Fi, library, dan student card ialah basics untuk minggu pertama.',
          steps: ['Lengkapkan enrolment dan orientation steps.', 'Set up MFA dan campus Wi-Fi.', 'Simpan international student support contacts.'],
          sourceLabel: 'Semak university onboarding/orientation guidance.',
        },
      },
      {
        id: 'find-geng',
        title: 'Find your geng',
        defaultCompleted: false,
        icon: Users,
        guide: {
          summary: 'Cari Malaysian student associations, campus clubs, WhatsApp groups, dan verified community events.',
          steps: ['Mulakan dengan official uni clubs dan orientation booths.', 'Semak event details sebelum bayar deposit.', 'Jumpa di public places untuk first meetups.'],
          route: '/vibe?section=events',
          routeLabel: 'Lihat events',
          sourceLabel: 'Semak university clubs, student associations, dan official event pages.',
        },
      },
    ],
  },
  {
    id: 'housing-safety',
    title: 'Housing safety, steady lah',
    items: [
      {
        id: 'rental-check',
        title: 'Semak rental dan bond details',
        defaultCompleted: false,
        icon: Home,
        guide: {
          summary: 'Sebelum transfer duit, confirm address, landlord atau agent identity, lease terms, dan official bond process.',
          steps: ['Inspect in person atau verified video jika boleh.', 'Elakkan pressure untuk transfer duit cepat.', 'Simpan condition reports, receipts, dan messages.'],
          route: '/legal?section=prepare&prepare_tab=scam-checker',
          routeLabel: 'Semak scam risk',
          sourceLabel: 'Semak state tenancy authority dan Scamwatch guidance.',
        },
      },
      {
        id: 'emergency-contacts',
        title: 'Simpan emergency dan support contacts',
        defaultCompleted: false,
        icon: ShieldAlert,
        guide: {
          summary: 'Simpan 000, campus security, OSHC nurse lines, tenancy support, dan trusted contacts sebelum ada masalah.',
          steps: ['Simpan 000 untuk emergencies.', 'Simpan campus security dan student support.', 'Simpan tenancy dan consular support links.'],
          route: '/vibe?section=alerts',
          routeLabel: 'Buka alerts',
          sourceLabel: 'Semak official emergency, university, dan tenancy support pages.',
        },
      },
    ],
  },
];

export const jomSettleAlerts = [
  {
    id: 'bond-pressure',
    title: 'Pressure bayar bond cepat',
    body: 'Jika ada orang suruh bayar cepat sebelum lease atau inspection, pause dulu dan verify listing.',
    tag: 'Rental safety',
  },
  {
    id: 'job-scam',
    title: 'Part-time job terlalu best',
    body: 'Hati-hati dengan kerja yang minta bank access, crypto transfer, atau upfront training fee.',
    tag: 'Work',
  },
  {
    id: 'makan-meetups',
    title: 'Meetups dan makan plans',
    body: 'Jumpa di public places, semak organisers, dan beritahu kawan bila jumpa group baru.',
    tag: 'Social',
  },
] as const;

export const jomSettleEventHighlights = [
  {
    id: 'halal-food-crawl',
    title: 'Makan Meetup: Halal Food Crawl',
    time: '6:00 - 9:00 PM',
    location: 'Sydney CBD',
    tag: 'Makan',
  },
  {
    id: 'orientation-geng',
    title: 'Find Your Geng: Orientation Night',
    time: '5:30 - 8:00 PM',
    location: 'Campus hub',
    tag: 'Social',
  },
  {
    id: 'rental-basics',
    title: 'Rental Basics for New Students',
    time: 'Online',
    location: 'Verified community partner',
    tag: 'Safe',
  },
] as const;
