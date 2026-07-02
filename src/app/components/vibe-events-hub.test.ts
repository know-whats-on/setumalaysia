import { describe, expect, it } from 'vitest';
import { applyOfficialEventDateSelection, normalizeOfficialEventRange } from './vibe-events-hub';

describe('vibe event date helpers', () => {
  it('resets a reused range when the user picks a new start date', () => {
    const selection = applyOfficialEventDateSelection(
      { startDay: '2026-04-22', endDay: '2026-05-21' },
      'start',
      '2026-04-24',
    );

    expect(selection.nextRange).toEqual({
      startDay: '2026-04-24',
      endDay: '2026-04-24',
    });
    expect(selection.nextBoundary).toBe('end');
  });

  it('expands the range once an end date is chosen', () => {
    const selection = applyOfficialEventDateSelection(
      { startDay: '2026-04-24', endDay: '2026-04-24' },
      'end',
      '2026-04-29',
    );

    expect(selection.nextRange).toEqual({
      startDay: '2026-04-24',
      endDay: '2026-04-29',
    });
    expect(selection.nextBoundary).toBe('start');
  });

  it('keeps date ranges ordered when the end date is tapped before the start date', () => {
    const selection = applyOfficialEventDateSelection(
      { startDay: '2026-04-24', endDay: '2026-04-24' },
      'end',
      '2026-04-22',
    );

    expect(selection.nextRange).toEqual({
      startDay: '2026-04-22',
      endDay: '2026-04-24',
    });
    expect(selection.nextBoundary).toBe('start');
  });

  it('normalizes missing end dates into a single-day range', () => {
    expect(normalizeOfficialEventRange('2026-04-22', '')).toEqual({
      startDay: '2026-04-22',
      endDay: '2026-04-22',
    });
  });
});
