export const PR_POINTS_OFFICIAL_CALCULATOR_URL =
  'https://immi.homeaffairs.gov.au/help-support/tools/points-calculator';

export type PrPointsSubclassId = '188' | '189' | '190' | '489' | '491';
export type PrPointsCacheStatus = 'fresh' | 'refreshed' | 'stale';

export interface PrPointsOption {
  id: string;
  label: string;
  value: string;
  points: number;
}

export interface PrPointsHelpSegment {
  type: 'text' | 'link';
  text: string;
  href?: string;
}

export interface PrPointsQuestion {
  key: string;
  label: string;
  helpText: string;
  helpSegments: PrPointsHelpSegment[];
  options: PrPointsOption[];
}

export interface PrPointsSubclass {
  id: PrPointsSubclassId;
  label: string;
  questions: PrPointsQuestion[];
}

export interface PrPointsSource {
  name: string;
  url: string;
  lastUpdated: string;
  fetchedAt: string;
  cacheStatus: PrPointsCacheStatus;
}

export interface PrPointsSchema {
  subclasses: PrPointsSubclass[];
  source: PrPointsSource;
}

export interface PrPointsBreakdownItem {
  questionKey: string;
  questionLabel: string;
  optionId: string;
  optionLabel: string;
  points: number;
}

export interface PrPointsMissingAnswer {
  questionKey: string;
  questionLabel: string;
}

export interface PrPointsCalculationResult {
  subclassId: PrPointsSubclassId;
  subclassLabel: string;
  totalPoints: number;
  breakdown: PrPointsBreakdownItem[];
  missingAnswers: PrPointsMissingAnswer[];
  source: PrPointsSource;
}

export type PrPointsAnswers = Record<string, string>;

function toStringValue(value: unknown) {
  return String(value || '').trim();
}

function toNumberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeCacheStatus(value: unknown): PrPointsCacheStatus {
  return value === 'fresh' || value === 'stale' || value === 'refreshed' ? value : 'fresh';
}

function normalizeSubclassId(value: unknown): PrPointsSubclassId | null {
  const clean = toStringValue(value);
  return clean === '188' || clean === '189' || clean === '190' || clean === '489' || clean === '491'
    ? clean
    : null;
}

function normalizePrPointsHelpSegments(raw: unknown): PrPointsHelpSegment[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((segment) => {
    if (!segment || typeof segment !== 'object') return [];
    const record = segment as Record<string, unknown>;
    const text = toStringValue(record.text);
    if (!text) return [];
    if (record.type === 'link') {
      const href = toStringValue(record.href);
      return href ? [{ type: 'link' as const, text, href }] : [{ type: 'text' as const, text }];
    }
    return [{ type: 'text' as const, text }];
  });
}

export function normalizePrPointsSchema(raw: unknown): PrPointsSchema {
  const source = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>).source : {}) as Record<string, unknown>;
  const rawSubclasses = raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).subclasses)
    ? (raw as { subclasses: unknown[] }).subclasses
    : [];

  return {
    subclasses: rawSubclasses.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as Record<string, unknown>;
      const id = normalizeSubclassId(record.id);
      if (!id) return [];
      const rawQuestions = Array.isArray(record.questions) ? record.questions : [];
      return [{
        id,
        label: toStringValue(record.label) || `Visa subclass ${id}`,
        questions: rawQuestions.flatMap((question) => {
          if (!question || typeof question !== 'object') return [];
          const questionRecord = question as Record<string, unknown>;
          const rawOptions = Array.isArray(questionRecord.options) ? questionRecord.options : [];
          const options = rawOptions.flatMap((option) => {
            if (!option || typeof option !== 'object') return [];
            const optionRecord = option as Record<string, unknown>;
            const optionId = toStringValue(optionRecord.id);
            if (!optionId) return [];
            return [{
              id: optionId,
              label: toStringValue(optionRecord.label) || 'Option',
              value: toStringValue(optionRecord.value),
              points: toNumberValue(optionRecord.points),
            }];
          });
          if (!toStringValue(questionRecord.key) || !options.length) return [];
          const helpSegments = normalizePrPointsHelpSegments(questionRecord.helpSegments);
          return [{
            key: toStringValue(questionRecord.key),
            label: toStringValue(questionRecord.label) || toStringValue(questionRecord.key),
            helpText: toStringValue(questionRecord.helpText) || helpSegments.map((segment) => segment.text).join(' '),
            helpSegments,
            options,
          }];
        }),
      }];
    }),
    source: {
      name: toStringValue(source.name) || 'Australian Government Department of Home Affairs',
      url: toStringValue(source.url) || PR_POINTS_OFFICIAL_CALCULATOR_URL,
      lastUpdated: toStringValue(source.lastUpdated),
      fetchedAt: toStringValue(source.fetchedAt),
      cacheStatus: normalizeCacheStatus(source.cacheStatus),
    },
  };
}

export function normalizePrPointsCalculationResult(raw: unknown): PrPointsCalculationResult {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const schemaLike = normalizePrPointsSchema({
    subclasses: [{
      id: record.subclassId,
      label: record.subclassLabel,
      questions: [],
    }],
    source: record.source,
  });
  const subclass = schemaLike.subclasses[0] || {
    id: '189' as PrPointsSubclassId,
    label: 'Visa subclass 189',
    questions: [],
  };

  const breakdown = Array.isArray(record.breakdown)
    ? record.breakdown.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const breakdownRecord = item as Record<string, unknown>;
        return [{
          questionKey: toStringValue(breakdownRecord.questionKey),
          questionLabel: toStringValue(breakdownRecord.questionLabel),
          optionId: toStringValue(breakdownRecord.optionId),
          optionLabel: toStringValue(breakdownRecord.optionLabel),
          points: toNumberValue(breakdownRecord.points),
        }];
      })
    : [];

  const missingAnswers = Array.isArray(record.missingAnswers)
    ? record.missingAnswers.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const missingRecord = item as Record<string, unknown>;
        return [{
          questionKey: toStringValue(missingRecord.questionKey),
          questionLabel: toStringValue(missingRecord.questionLabel),
        }];
      })
    : [];

  return {
    subclassId: subclass.id,
    subclassLabel: subclass.label,
    totalPoints: toNumberValue(record.totalPoints),
    breakdown,
    missingAnswers,
    source: schemaLike.source,
  };
}

export function getDefaultPrPointsSubclassId(schema: PrPointsSchema) {
  return schema.subclasses.find((subclass) => subclass.id === '189')?.id || schema.subclasses[0]?.id || '';
}

export function countAnsweredPrPointsQuestions(questions: PrPointsQuestion[], answers: PrPointsAnswers) {
  return questions.filter((question) => Boolean(answers[question.key])).length;
}
