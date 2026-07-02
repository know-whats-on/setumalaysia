import {
  Bell,
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
import { SETU_INDIA_RESOURCES_DEFAULT_ROUTE } from './resources-routes';

export const SETU_INDIA_ACCENT = '#F04444';

export const setuIndiaQuickActions = [
  { label: 'Find Events', zh: 'Student life', route: '/vibe?section=events', icon: CalendarDays },
  { label: 'Settle Checklist', zh: 'First steps', route: SETU_INDIA_RESOURCES_DEFAULT_ROUTE, icon: CheckSquare },
  { label: 'Play Games', zh: 'Mini games', route: '/games', icon: Gamepad2 },
  { label: 'Safety Alerts', zh: 'Updates', route: '/vibe?section=alerts', icon: Bell },
  { label: 'Compare Suburbs', zh: 'Where to live', route: '/vibe?section=vibe&vibe_tab=suburb-score', icon: MapPin },
] as const;

export type SetuIndiaChecklistGuide = {
  summary: string;
  steps: string[];
  route?: string;
  routeLabel?: string;
  sourceLabel: string;
};

export type SetuIndiaChecklistItem = {
  id: string;
  title: string;
  zh: string;
  defaultCompleted: boolean;
  icon: LucideIcon;
  guide: SetuIndiaChecklistGuide;
};

export type SetuIndiaChecklistSection = {
  id: string;
  title: string;
  zh: string;
  items: SetuIndiaChecklistItem[];
};

export const setuIndiaChecklistSections: SetuIndiaChecklistSection[] = [
  {
    id: 'first-48',
    title: 'First 48 Hours',
    zh: 'Essentials after landing',
    items: [
      {
        id: 'activate-sim-esim',
        title: 'Activate SIM / eSIM',
        zh: 'Keep OTPs and university logins working',
        defaultCompleted: true,
        icon: FileText,
        guide: {
          summary: 'Set up an Australian number early so banks, your university, rental platforms, and government services can verify you.',
          steps: ['Keep your passport and CoE handy.', 'Choose coverage that works near campus and your suburb.', 'Test calls, SMS, mobile data, and OTP delivery before leaving the store.'],
          route: '/arrival',
          routeLabel: 'Ask Gendu',
          sourceLabel: 'Check telco and university IT support pages.',
        },
      },
      {
        id: 'open-bank-account',
        title: 'Open a bank account',
        zh: 'Rent, wages, and records',
        defaultCompleted: true,
        icon: Home,
        guide: {
          summary: 'An Australian bank account makes rent, wages, refunds, and transaction records easier to manage.',
          steps: ['Bring passport, visa/CoE details, Australian address, and phone number.', 'Use official bank websites or branches.', 'Keep receipts and bank records for rent, bond, and shared bills.'],
          sourceLabel: 'Check official bank onboarding pages.',
        },
      },
      {
        id: 'apply-tfn',
        title: 'Apply for TFN',
        zh: 'Tax File Number',
        defaultCompleted: true,
        icon: FileText,
        guide: {
          summary: 'A TFN is needed for work and tax. Apply only through the Australian Taxation Office after you arrive in Australia.',
          steps: ['Confirm you are in Australia with a valid visa.', 'Apply through the ATO official website.', 'Store the TFN securely and do not share it in chat groups or with strangers.'],
          route: '/arrival',
          routeLabel: 'Ask about TFN',
          sourceLabel: 'Australian Taxation Office (ATO).',
        },
      },
      {
        id: 'transport-card',
        title: 'Set up transport',
        zh: 'Opal, Myki, Go Card, MetroCARD',
        defaultCompleted: true,
        icon: Car,
        guide: {
          summary: 'Transport systems vary by city. Set up the right card or app before orientation and inspections.',
          steps: ['Check the card used in your city.', 'Add payment or buy a physical card.', 'Confirm whether your visa and institution qualify for concession fares.'],
          route: '/dashboard?view=map',
          routeLabel: 'Open map',
          sourceLabel: 'State transport websites and university student services.',
        },
      },
    ],
  },
  {
    id: 'first-2-weeks',
    title: 'First 2 Weeks',
    zh: 'Health, campus, housing, safety',
    items: [
      {
        id: 'check-oshc',
        title: 'Check OSHC and GP access',
        zh: 'Health cover and local care',
        defaultCompleted: true,
        icon: HeartPulse,
        guide: {
          summary: 'Know your OSHC provider, policy number, cover dates, claim process, and how to find a GP near campus or home.',
          steps: ['Download the OSHC provider app or save your membership details.', 'Check cover dates for your full visa period.', 'Save nearby GP, medical centre, emergency, and mental health contacts.'],
          route: '/arrival',
          routeLabel: 'Ask about OSHC',
          sourceLabel: 'OSHC provider and university international student support.',
        },
      },
      {
        id: 'student-id-campus',
        title: 'Activate campus systems',
        zh: 'Student ID, LMS, email, Wi-Fi',
        defaultCompleted: true,
        icon: GraduationCap,
        guide: {
          summary: 'Student ID, university email, LMS, library access, and MFA are essential before classes start.',
          steps: ['Complete enrolment and orientation tasks.', 'Activate university email, LMS, MFA, Wi-Fi, and student card.', 'Save your international student support contact.'],
          sourceLabel: 'University onboarding and orientation pages.',
        },
      },
      {
        id: 'rental-bond-checklist',
        title: 'Rental inspection and bond check',
        zh: 'Avoid risky deposits',
        defaultCompleted: false,
        icon: Home,
        guide: {
          summary: 'Before paying, verify the property, lease, agent/landlord, and bond process through official state channels.',
          steps: ['Inspect in person or via a verified video inspection.', 'Photograph the condition report.', 'Confirm bond is lodged with the state rental bond authority where required.'],
          route: '/vibe?section=alerts',
          routeLabel: 'View safety alerts',
          sourceLabel: 'State tenancy authorities and Scamwatch.',
        },
      },
      {
        id: 'save-emergency-contacts',
        title: 'Save emergency contacts',
        zh: '000, campus security, support',
        defaultCompleted: false,
        icon: Bell,
        guide: {
          summary: 'Save emergency and support contacts before you need them.',
          steps: ['Call 000 for emergencies.', 'Save campus security and international student support.', 'Save OSHC helpline, local police assistance, and trusted contacts.'],
          route: '/vibe?section=alerts',
          routeLabel: 'View alerts',
          sourceLabel: 'Emergency services, university, and OSHC provider guidance.',
        },
      },
      {
        id: 'join-indian-student-groups',
        title: 'Join Indian student groups',
        zh: 'Campus clubs and community',
        defaultCompleted: false,
        icon: Users,
        guide: {
          summary: 'Official clubs and student societies are a safer way to meet people, find events, and learn local routines.',
          steps: ['Use your university clubs portal first.', 'Prefer official society pages and verified events.', 'Avoid sharing passport, bank, or OTP details in public groups.'],
          route: '/vibe?section=events',
          routeLabel: 'View events',
          sourceLabel: 'University clubs and student union listings.',
        },
      },
      {
        id: 'learn-scam-red-flags',
        title: 'Learn scam red flags',
        zh: 'Rent, jobs, visa calls, phishing',
        defaultCompleted: false,
        icon: ShieldAlert,
        guide: {
          summary: 'Common risks include fake rentals, false job offers, visa impersonation calls, phishing links, and pressure to transfer money.',
          steps: ['Never share OTPs, passport scans, or bank login details with strangers.', 'Pause when someone threatens arrest, secrecy, or urgent transfer.', 'Keep screenshots and records, then contact Scamwatch, your bank, university, or police if needed.'],
          route: '/vibe?section=alerts',
          routeLabel: 'View official alerts',
          sourceLabel: 'Scamwatch, police, banks, and university safety guidance.',
        },
      },
    ],
  },
  {
    id: 'first-month',
    title: 'First Month',
    zh: 'Work, career, budget, official links',
    items: [
      {
        id: 'fair-work-basics',
        title: 'Understand Fair Work basics',
        zh: 'Pay, hours, payslips',
        defaultCompleted: false,
        icon: BriefcaseBusiness,
        guide: {
          summary: 'Before taking a casual job, understand minimum pay, payslips, trial shifts, and student visa work conditions.',
          steps: ['Check Fair Work minimum pay and workplace rights.', 'Keep rosters, payslips, and messages.', 'Confirm visa work conditions through Home Affairs.'],
          route: '/arrival',
          routeLabel: 'Ask about work rights',
          sourceLabel: 'Fair Work Ombudsman and Department of Home Affairs.',
        },
      },
      {
        id: 'career-workshop',
        title: 'Prepare resume and career support',
        zh: 'Career service and networking',
        defaultCompleted: false,
        icon: FileText,
        guide: {
          summary: 'Australian resumes are usually concise and focused on skills, availability, projects, and local contact details.',
          steps: ['Book your university career service.', 'Prepare LinkedIn and a one-page resume.', 'Attend career fairs, networking nights, and industry talks.'],
          route: '/vibe?section=events&events_tab=networking',
          routeLabel: 'View networking',
          sourceLabel: 'University career services.',
        },
      },
      {
        id: 'budget-plan',
        title: 'Set a living-cost plan',
        zh: 'Rent, groceries, travel, buffer',
        defaultCompleted: false,
        icon: CheckSquare,
        guide: {
          summary: 'Separate rent, transport, phone, OSHC, groceries, study costs, and emergency savings to avoid first-month stress.',
          steps: ['Track fixed weekly costs.', 'Plan for bond, moving, textbooks, and medical costs.', 'Be careful with high-interest credit or buy-now-pay-later products.'],
          sourceLabel: 'University financial wellbeing and support services.',
        },
      },
      {
        id: 'official-links',
        title: 'Save official support channels',
        zh: 'Verify before acting',
        defaultCompleted: false,
        icon: ShieldAlert,
        guide: {
          summary: 'Keep official sources together so you can verify information before acting.',
          steps: ['Save Scamwatch, Fair Work, ATO, Home Affairs, and state tenancy links.', 'Save university international student support.', 'Follow official High Commission updates where relevant.'],
          route: '/vibe?section=alerts',
          routeLabel: 'View alerts',
          sourceLabel: 'Australian government, state agencies, universities, and High Commission channels.',
        },
      },
    ],
  },
];

export const setuIndiaAlerts = [
  {
    title: 'Rental scam warning',
    body: 'Never pay a deposit before verifying the property, lease, and bond process.',
    level: 'Official reminder',
  },
  {
    title: 'Fake job offer warning',
    body: 'Be careful with jobs that ask you to transfer money, receive parcels, or share passport details early.',
    level: 'Safety',
  },
  {
    title: 'Visa impersonation warning',
    body: 'Government agencies will not threaten immediate arrest through calls, SMS, WhatsApp, or social apps.',
    level: 'Scamwatch',
  },
] as const;

export const setuIndiaChatPrompts = [
  'How do I avoid rental scams?',
  'How do I apply for TFN?',
  'How do I use OSHC?',
  'What should I check before paying bond?',
  'What are student visa work rules?',
  'Where can I find Indian student events?',
] as const;
