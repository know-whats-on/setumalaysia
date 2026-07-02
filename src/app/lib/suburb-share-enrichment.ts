import type { SuburbCrimeResult } from './suburb-crime-map';

export interface SuburbShareEnrichmentRequest {
  suburb: string;
  state: string;
  totalStudents: number;
  vibeBadge?: string;
  crimeScore?: number | null;
  personalSafetyScore?: number | null;
  propertyCrimeScore?: number | null;
  crimeBand?: string | null;
}

export interface SuburbShareEnrichmentResponse {
  summary: string;
  hostedBackgroundImageUrl?: string;
  sourcePageUrl?: string;
  sourceLabel?: string;
}

export interface SuburbShareCrimeSnapshot {
  crimeScore: number | null;
  personalSafetyScore: number | null;
  propertyCrimeScore: number | null;
  crimeBand: string | null;
}

function normalizeScore(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function getSuburbShareCrimeSnapshot(crimeResult: SuburbCrimeResult | null | undefined): SuburbShareCrimeSnapshot {
  if (!crimeResult || crimeResult.status !== 'found') {
    return {
      crimeScore: null,
      personalSafetyScore: null,
      propertyCrimeScore: null,
      crimeBand: null,
    };
  }

  const scores = crimeResult.data.scores;
  return {
    crimeScore: normalizeScore(scores?.overall_caution_score_0_100),
    personalSafetyScore: normalizeScore(scores?.personal_safety_score_0_100),
    propertyCrimeScore: normalizeScore(scores?.property_crime_score_0_100),
    crimeBand: String(scores?.overall_caution_band || '').trim() || null,
  };
}

export function buildSuburbShareEnrichmentRequest(input: {
  suburb: string;
  state: string;
  totalStudents: number;
  vibeBadge?: string;
  crimeResult?: SuburbCrimeResult | null;
}): SuburbShareEnrichmentRequest {
  const crimeSnapshot = getSuburbShareCrimeSnapshot(input.crimeResult);

  return {
    suburb: String(input.suburb || '').trim(),
    state: String(input.state || '').trim(),
    totalStudents: Math.max(0, Number(input.totalStudents || 0)),
    vibeBadge: String(input.vibeBadge || '').trim() || undefined,
    crimeScore: crimeSnapshot.crimeScore,
    personalSafetyScore: crimeSnapshot.personalSafetyScore,
    propertyCrimeScore: crimeSnapshot.propertyCrimeScore,
    crimeBand: crimeSnapshot.crimeBand,
  };
}
