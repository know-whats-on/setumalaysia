import { describe, expect, it } from 'vitest';
import {
  HOODIE_HELP_TOUR_SEQUENCE,
  buildHoodieHelpCompletionStorageKey,
  getHoodieHelpTourSteps,
  getNextHoodieHelpTourStepId,
  isHoodieHelpStepVisibleOnRoute,
} from './hoodie-help-tour';

describe('hoodie help tour config', () => {
  it('keeps the onboarding sequence in the requested order', () => {
    expect(HOODIE_HELP_TOUR_SEQUENCE).toEqual([
      'hoodienie',
      'map',
      'price-compare',
      'trip-planner',
      'fuel',
      'vibe',
      'resources',
      'profile',
      'household',
    ]);
  });

  it('assigns grouped labels for map subsections and top-level areas in Hoodie', () => {
    const hoodieSteps = getHoodieHelpTourSteps('burb_mate');

    expect(hoodieSteps.map.groupLabel).toBe('Map');
    expect(hoodieSteps['price-compare'].groupLabel).toBe('Map');
    expect(hoodieSteps['trip-planner'].groupLabel).toBe('Map');
    expect(hoodieSteps.fuel.groupLabel).toBe('Map');
    expect(hoodieSteps.vibe.groupLabel).toBe('Vibe');
    expect(hoodieSteps.hoodienie.groupLabel).toBe('Hoodienie');
    expect(hoodieSteps.resources.groupLabel).toBe('Resources');
    expect(hoodieSteps.profile.groupLabel).toBe('Profile');
    expect(hoodieSteps.household.groupLabel).toBe('Profile');
  });

  it('uses SETU-specific labels for the shared assistant step', () => {
    const setuSteps = getHoodieHelpTourSteps('ghar');

    expect(setuSteps.hoodienie.title).toBe('Gendu');
    expect(setuSteps.hoodienie.groupLabel).toBe('Gendu');
  });

  it('registers Where’s Wolli help-tour steps so shared map triggers do not crash', () => {
    const wolliSteps = getHoodieHelpTourSteps('wheres_wolli');

    expect(wolliSteps.map.title).toBe('Map');
    expect(wolliSteps.hoodienie.title).toBe('Wolli');
    expect(wolliSteps.hoodienie.groupLabel).toBe('Wolli');
  });

  it('uses the bundled MP4 assets and short video format in both variants', () => {
    const hoodieSteps = getHoodieHelpTourSteps('burb_mate');
    const setuSteps = getHoodieHelpTourSteps('ghar');

    expect(hoodieSteps.map.videoSrc).toBe('/onboarding-videos/map.mp4');
    expect(hoodieSteps['price-compare'].videoSrc).toBe('/onboarding-videos/price-compare.mp4');
    expect(hoodieSteps['trip-planner'].videoSrc).toBe('/onboarding-videos/trip-planner.mp4');
    expect(hoodieSteps.fuel.videoSrc).toBe('/onboarding-videos/fuel.mp4');
    expect(hoodieSteps.vibe.videoSrc).toBe('/onboarding-videos/vibe.mp4');
    expect(hoodieSteps.vibe.title).toBe('Vibe');
    expect(hoodieSteps.hoodienie.videoSrc).toBe('/onboarding-videos/assistant.mp4');
    expect(hoodieSteps.resources.videoSrc).toBe('/onboarding-videos/resources.mp4');
    expect(hoodieSteps.resources.route).toBe('/legal?section=legal');
    expect(hoodieSteps.profile.videoSrc).toBe('/onboarding-videos/profile.mp4');
    expect(hoodieSteps.household.videoSrc).toBe('/onboarding-videos/household.mp4');
    expect(hoodieSteps.map.videoFormat).toBe('short');
    expect(hoodieSteps.household.videoFormat).toBe('short');
    expect(setuSteps.map.videoSrc).toBe('/onboarding-videos/map.mp4');
    expect(setuSteps.hoodienie.videoSrc).toBe('/onboarding-videos/assistant.mp4');
    expect(setuSteps.household.videoSrc).toBe('/onboarding-videos/household.mp4');
    expect(setuSteps.hoodienie.videoFormat).toBe('short');
  });

  it('builds completion keys per signed-in account on the current device', () => {
    expect(buildHoodieHelpCompletionStorageKey('User@Example.com', 'burb_mate')).toBe(
      'hoodie_help_tour_completed_v1_user@example.com',
    );
    expect(buildHoodieHelpCompletionStorageKey('User@Example.com', 'ghar')).toBe(
      'setu_help_tour_completed_v1_user@example.com',
    );
  });

  it('calculates the next step and the end of the sequence', () => {
    expect(getNextHoodieHelpTourStepId('hoodienie')).toBe('map');
    expect(getNextHoodieHelpTourStepId('map')).toBe('price-compare');
    expect(getNextHoodieHelpTourStepId('fuel')).toBe('vibe');
    expect(getNextHoodieHelpTourStepId('profile')).toBe('household');
    expect(getNextHoodieHelpTourStepId('household')).toBeNull();
  });

  it('matches routes for each step visibility', () => {
    expect(isHoodieHelpStepVisibleOnRoute('map', '/dashboard', '')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('trip-planner', '/dashboard', '')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('price-compare', '/shopping', '?retailer=compare')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('fuel', '/fuel', '')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('vibe', '/vibe', '')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('hoodienie', '/arrival', '')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('resources', '/legal', '?section=legal')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('profile', '/profile', '')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('household', '/profile', '?tab=household')).toBe(true);
    expect(isHoodieHelpStepVisibleOnRoute('price-compare', '/shopping', '?retailer=woolworths')).toBe(false);
  });
});
