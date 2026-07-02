import { describe, expect, it } from 'vitest';
import {
  countAnsweredPrPointsQuestions,
  getDefaultPrPointsSubclassId,
  normalizePrPointsCalculationResult,
  normalizePrPointsSchema,
} from './pr-points-calculator';

describe('pr-points-calculator', () => {
  it('normalizes schema payloads and defaults to subclass 189 when available', () => {
    const schema = normalizePrPointsSchema({
      subclasses: [
        { id: '491', label: 'Subclass 491', questions: [] },
        {
          id: '189',
          label: 'Subclass 189',
          questions: [{
            key: 'Age189',
            label: 'Age',
            helpText: '* National Accreditation Authority for Translators and Interpreters',
            helpSegments: [
              { type: 'text', text: '*' },
              {
                type: 'link',
                text: 'National Accreditation Authority for Translators and Interpreters',
                href: 'http://www.naati.com.au/',
              },
            ],
            options: [{ id: 'Age189:0', label: '25 to 32', value: '30', points: 30 }],
          }],
        },
        { id: 'bad', label: 'Bad', questions: [] },
      ],
      source: { cacheStatus: 'refreshed' },
    });

    expect(schema.subclasses.map((subclass) => subclass.id)).toEqual(['491', '189']);
    expect(schema.source.cacheStatus).toBe('refreshed');
    expect(getDefaultPrPointsSubclassId(schema)).toBe('189');
    expect(countAnsweredPrPointsQuestions(schema.subclasses[1].questions, { Age189: 'Age189:0' })).toBe(1);
    expect(schema.subclasses[1].questions[0].helpText).toBe('* National Accreditation Authority for Translators and Interpreters');
    expect(schema.subclasses[1].questions[0].helpSegments).toEqual([
      { type: 'text', text: '*' },
      {
        type: 'link',
        text: 'National Accreditation Authority for Translators and Interpreters',
        href: 'http://www.naati.com.au/',
      },
    ]);
  });

  it('normalizes calculation payloads defensively', () => {
    const result = normalizePrPointsCalculationResult({
      subclassId: '491',
      subclassLabel: 'Subclass 491',
      totalPoints: '80',
      breakdown: [{ questionKey: 'Age491', questionLabel: 'Age', optionId: 'Age491:1', optionLabel: '25 to 32', points: '30' }],
      missingAnswers: [{ questionKey: 'English491', questionLabel: 'English' }],
      source: { cacheStatus: 'stale' },
    });

    expect(result.subclassId).toBe('491');
    expect(result.totalPoints).toBe(80);
    expect(result.breakdown[0].points).toBe(30);
    expect(result.missingAnswers[0].questionLabel).toBe('English');
    expect(result.source.cacheStatus).toBe('stale');
  });
});
