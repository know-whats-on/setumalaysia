import { describe, expect, it } from 'vitest';
import {
  buildIndianStudentWelfareReply,
  detectAustralianStateInText,
  getIndianStudentWelfareMissionForState,
} from './indian-student-welfare';

describe('Indian student welfare mission helper', () => {
  it('maps South Australia to the Sydney consulate', () => {
    const mission = getIndianStudentWelfareMissionForState('SA');

    expect(mission?.name).toBe('Consulate General of India, Sydney');
    expect(mission?.studentWelfareContactName).toBe('Mr. Kashmiri Lal');
  });

  it('maps Tasmania to the Melbourne consulate', () => {
    const mission = getIndianStudentWelfareMissionForState('Tasmania');

    expect(mission?.name).toBe('Consulate General of India, Melbourne');
    expect(mission?.studentWelfareContactName).toBe('Mr. H.K. Pandey');
  });

  it('maps Northern Territory to the Perth consulate', () => {
    const mission = getIndianStudentWelfareMissionForState('NT');

    expect(mission?.name).toBe('Consulate General of India, Perth');
    expect(mission?.studentWelfareContactName).toBe('Mr. Naresh Sharma');
  });

  it('prefers an explicit state in the question over the fallback state', () => {
    const reply = buildIndianStudentWelfareReply(
      'Who is the Indian student welfare contact for Tasmania?',
      'NSW',
    );

    expect(reply?.stateCode).toBe('TAS');
    expect(reply?.mission?.name).toBe('Consulate General of India, Melbourne');
    expect(reply?.text).toContain('For Tasmania');
  });

  it('asks for state when no state is available', () => {
    const reply = buildIndianStudentWelfareReply('Which Indian consulate should I contact?');

    expect(reply?.mission).toBeUndefined();
    expect(reply?.text).toContain('Which Australian state are you in?');
    expect(reply?.text).toContain('NSW/SA');
    expect(reply?.sources).toHaveLength(5);
  });

  it('detects state aliases without matching inside unrelated words', () => {
    expect(detectAustralianStateInText('I need visa help')).toBeNull();
    expect(detectAustralianStateInText('I study in SA')).toBe('SA');
  });
});
