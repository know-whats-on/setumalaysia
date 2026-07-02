import { describe, expect, it } from 'vitest';
import {
  getVibeDemographicBarWidth,
  getVibeDemographicView,
  sortVibeDemographics,
} from './vibe-demographics';

describe('vibe demographic helpers', () => {
  it('uses student-resident scaling for Wolli-style rows', () => {
    const demographics = [
      { name: 'China', total: 517, students: 517 },
      { name: 'Nepal', total: 70, students: 70 },
      { name: 'Vietnam', total: 65, students: 65 },
    ];

    expect(getVibeDemographicView({ demographicView: 'student_residents' })).toBe('student_residents');
    expect(sortVibeDemographics(demographics, 'student_residents').map((item) => item.name)).toEqual([
      'China',
      'Nepal',
      'Vietnam',
    ]);
    expect(getVibeDemographicBarWidth(demographics[0], demographics, 'student_residents')).toBe(100);
    expect(getVibeDemographicBarWidth(demographics[1], demographics, 'student_residents')).toBeCloseTo(13.5396518, 6);
    expect(getVibeDemographicBarWidth(demographics[2], demographics, 'student_residents')).toBeCloseTo(12.5725338, 6);
  });

  it('keeps ratio-based scaling for legacy suburb rows', () => {
    const demographics = [
      { name: 'Chinese', total: 1325, students: 723 },
      { name: 'Indian', total: 251, students: 65 },
    ];

    expect(getVibeDemographicView({ demographicView: undefined })).toBe('population_vs_students');
    expect(sortVibeDemographics(demographics, 'population_vs_students').map((item) => item.name)).toEqual([
      'Chinese',
      'Indian',
    ]);
    expect(getVibeDemographicBarWidth(demographics[0], demographics, 'population_vs_students')).toBeCloseTo(54.5660377, 6);
    expect(getVibeDemographicBarWidth(demographics[1], demographics, 'population_vs_students')).toBeCloseTo(25.8964143, 6);
  });
});
