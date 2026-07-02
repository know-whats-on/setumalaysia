import { TASK_CATEGORIES, type TaskCategory } from './types';

export type ProjectTypeMeta = {
  label: string;
  colour: string;
  soft: string;
  border: string;
  icon: 'Wrench' | 'Focus' | 'Zap' | 'Send' | 'Reply' | 'PenLine' | 'Search' | 'Clipboard' | 'Chart' | 'Eye' | 'Image';
  sort_weight: number;
};

export const PROJECT_TYPE_META: Record<TaskCategory, ProjectTypeMeta> = {
  setup: {
    label: 'Setup',
    colour: '#2563EB',
    soft: '#EFF6FF',
    border: '#BFDBFE',
    icon: 'Wrench',
    sort_weight: 10,
  },
  'deep-work': {
    label: 'Deep work',
    colour: '#7C3AED',
    soft: '#F5F3FF',
    border: '#DDD6FE',
    icon: 'Focus',
    sort_weight: 30,
  },
  'quick-win': {
    label: 'Quick win',
    colour: '#059669',
    soft: '#ECFDF5',
    border: '#A7F3D0',
    icon: 'Zap',
    sort_weight: 20,
  },
  outreach: {
    label: 'Outreach',
    colour: '#0891B2',
    soft: '#ECFEFF',
    border: '#A5F3FC',
    icon: 'Send',
    sort_weight: 50,
  },
  'follow-up': {
    label: 'Follow-up',
    colour: '#0D9488',
    soft: '#F0FDFA',
    border: '#99F6E4',
    icon: 'Reply',
    sort_weight: 60,
  },
  content: {
    label: 'Content',
    colour: '#DB2777',
    soft: '#FDF2F8',
    border: '#FBCFE8',
    icon: 'PenLine',
    sort_weight: 40,
  },
  research: {
    label: 'Research',
    colour: '#4F46E5',
    soft: '#EEF2FF',
    border: '#C7D2FE',
    icon: 'Search',
    sort_weight: 25,
  },
  admin: {
    label: 'Admin',
    colour: '#64748B',
    soft: '#F8FAFC',
    border: '#CBD5E1',
    icon: 'Clipboard',
    sort_weight: 70,
  },
  analytics: {
    label: 'Analytics',
    colour: '#EA580C',
    soft: '#FFF7ED',
    border: '#FED7AA',
    icon: 'Chart',
    sort_weight: 35,
  },
  review: {
    label: 'Review',
    colour: '#A16207',
    soft: '#FEFCE8',
    border: '#FEF08A',
    icon: 'Eye',
    sort_weight: 15,
  },
  asset: {
    label: 'Asset',
    colour: '#9333EA',
    soft: '#FAF5FF',
    border: '#E9D5FF',
    icon: 'Image',
    sort_weight: 45,
  },
};

export function getProjectTypeMeta(category: TaskCategory) {
  return PROJECT_TYPE_META[category];
}

export function projectTypeCoverageIsComplete() {
  return TASK_CATEGORIES.every((category) => Boolean(PROJECT_TYPE_META[category]));
}
