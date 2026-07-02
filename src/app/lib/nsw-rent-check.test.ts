import { describe, expect, it } from 'vitest';
import { calculateNswRentCheckComparison } from './nsw-rent-check';

describe('calculateNswRentCheckComparison', () => {
  it('marks rent below the median range', () => {
    const result = calculateNswRentCheckComparison(500, 600, 700);

    expect(result.result_state).toBe('belowMedian');
    expect(result.percent_difference).toBe(16.7);
    expect(result.percent_label).toBe('17% lower');
  });

  it('marks rent within the median range', () => {
    const result = calculateNswRentCheckComparison(650, 600, 700);

    expect(result.result_state).toBe('withinMedian');
    expect(result.percent_difference).toBeNull();
  });

  it('marks rent above the median range', () => {
    const result = calculateNswRentCheckComparison(840, 600, 700);

    expect(result.result_state).toBe('aboveMedian');
    expect(result.percent_difference).toBe(20);
    expect(result.percent_label).toBe('20% higher');
  });

  it('uses <1% wording for tiny differences', () => {
    const result = calculateNswRentCheckComparison(999, 1000, 1200);

    expect(result.result_state).toBe('belowMedian');
    expect(result.percent_difference).toBe(0.1);
    expect(result.percent_label).toBe('<1% lower');
  });

  it('returns noResult when the lookup has no median range', () => {
    const result = calculateNswRentCheckComparison(650, null, null);

    expect(result.result_state).toBe('noResult');
    expect(result.percent_difference).toBeNull();
  });
});
