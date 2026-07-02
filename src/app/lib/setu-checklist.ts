import type { SetuPersonalizedContent, SetuPriority } from './setu-types';

export type SetuChecklistCategory =
  | 'pre-departure'
  | 'documents'
  | 'accommodation'
  | 'university-arrival'
  | 'life-setup'
  | 'cultural-integration';

export interface SetuChecklistDisplayItem {
  id: string;
  text: string;
  category: SetuChecklistCategory;
  priority: SetuPriority;
  description?: string | null;
  personalizationDetails?: {
    stateIds?: string[];
    universityIds?: number[];
  };
}

const CATEGORY_MAPPING: Record<string, SetuChecklistCategory> = {
  'pre-departure': 'pre-departure',
  documents: 'documents',
  accommodation: 'accommodation',
  'university-arrival': 'university-arrival',
  'life-setup': 'life-setup',
  'cultural-integration': 'cultural-integration',
  general: 'life-setup',
  finance: 'life-setup',
  banking: 'life-setup',
  transport: 'life-setup',
  legal: 'life-setup',
  certification: 'life-setup',
  discounts: 'life-setup',
  communication: 'life-setup',
  study: 'life-setup',
  customs: 'life-setup',
  disability: 'life-setup',
  safety: 'life-setup',
  travel: 'pre-departure',
  clothing: 'pre-departure',
  tech: 'pre-departure',
  personal: 'pre-departure',
  household: 'pre-departure',
  food: 'pre-departure',
  orientation: 'university-arrival',
  enrollment: 'university-arrival',
  registration: 'university-arrival',
  academic: 'university-arrival',
  identification: 'university-arrival',
  'on-campus': 'accommodation',
  'off-campus': 'accommodation',
  community: 'cultural-integration',
  health: 'documents',
  nsw: 'life-setup',
  vic: 'life-setup',
  qld: 'life-setup',
  wa: 'life-setup',
  sa: 'life-setup',
  act: 'life-setup',
  nt: 'life-setup',
  tas: 'life-setup',
  family: 'life-setup',
};

const PRIORITY_ORDER: Record<SetuPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const SETU_CHECKLIST_CATEGORY_INFO: Record<
  SetuChecklistCategory,
  { title: string; description: string }
> = {
  'pre-departure': {
    title: 'Before You Leave',
    description: 'Essential preparations before travelling to Australia.',
  },
  documents: {
    title: 'Important Documents',
    description: 'Critical documents to carry, save, and double-check.',
  },
  accommodation: {
    title: 'Accommodation Setup',
    description: 'Housing tasks and arrival prep for where you will stay.',
  },
  'university-arrival': {
    title: 'University Arrival',
    description: 'What to sort out when you first reach campus.',
  },
  'life-setup': {
    title: 'Life Setup in Australia',
    description: 'Banking, phone, transport, admin, and daily-life basics.',
  },
  'cultural-integration': {
    title: 'Community and Culture',
    description: 'Ways to settle in, connect, and find your support networks.',
  },
};

export function mapSetuChecklistCategory(category: string): SetuChecklistCategory {
  const normalized = String(category || '').trim().toLowerCase();
  if (!normalized) return 'life-setup';
  if (normalized.includes('{') || normalized.includes('\\')) return 'life-setup';
  return CATEGORY_MAPPING[normalized] || 'life-setup';
}

export function mapSetuPriority(priority: string): SetuPriority {
  const normalized = String(priority || '').trim().toLowerCase();
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return 'medium';
}

export function convertSetuChecklistItems(
  items: SetuPersonalizedContent[],
): SetuChecklistDisplayItem[] {
  return items
    .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
    .map((item) => ({
      id: item.id,
      text: item.title,
      category: mapSetuChecklistCategory(item.category),
      priority: mapSetuPriority(item.priority),
      description: item.description ?? null,
      personalizationDetails:
        (item.applies_to_states && item.applies_to_states.length > 0) ||
        (item.applies_to_universities && item.applies_to_universities.length > 0)
          ? {
              stateIds: item.applies_to_states?.filter(Boolean) || undefined,
              universityIds: item.applies_to_universities?.filter((value) => Number.isFinite(value)) || undefined,
            }
          : undefined,
    }))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export function categorizeSetuChecklistItems(items: SetuChecklistDisplayItem[]) {
  const grouped: Record<SetuChecklistCategory, SetuChecklistDisplayItem[]> = {
    'pre-departure': [],
    documents: [],
    accommodation: [],
    'university-arrival': [],
    'life-setup': [],
    'cultural-integration': [],
  };

  items.forEach((item) => {
    grouped[item.category].push(item);
  });

  (Object.keys(grouped) as SetuChecklistCategory[]).forEach((key) => {
    grouped[key].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  });

  return grouped;
}
