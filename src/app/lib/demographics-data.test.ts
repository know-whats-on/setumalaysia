import { describe, expect, it } from 'vitest';
import { hasBrokenSuburbDemographics, suburbDemographics } from './demographics-data';

describe('suburbDemographics', () => {
  it('includes Wolli Creek with usable suburb-score data', () => {
    const record = suburbDemographics.find(
      (suburb) => suburb.suburb === 'Wolli Creek' && suburb.state === 'NSW',
    );

    expect(record).toBeDefined();
    expect(record?.totalStudents).toBe(1297);
    expect(record?.demographicView).toBeUndefined();
    expect(record?.maxVisibleDemographics).toBe(12);
    expect(record?.demographics).toEqual([
      { name: 'China', total: 2155, students: 517 },
      { name: 'Nepal', total: 245, students: 70 },
      { name: 'Vietnam', total: 250, students: 65 },
      { name: 'Indonesia', total: 457, students: 49 },
      { name: 'Hong Kong', total: 282, students: 43 },
      { name: 'Mongolia', total: 511, students: 42 },
      { name: 'India', total: 262, students: 27 },
      { name: 'Malaysia', total: 226, students: 24 },
      { name: 'Bangladesh', total: 80, students: 19 },
      { name: 'Philippines', total: 278, students: 15 },
      { name: 'Taiwan', total: 112, students: 11 },
      { name: 'Singapore', total: 81, students: 8 },
    ]);
    expect(hasBrokenSuburbDemographics(record ?? {})).toBe(false);
  });
});
