import {
  AER_DMO_FINAL_DETERMINATION_SOURCE_URL,
  AER_SOLAR_SHARER_SOURCE_URL,
  VICTORIA_FREE_POWER_SOURCE_URL,
  freeElectricityGuideCities,
  type FreeElectricityGuideCity,
} from './free-electricity-guide';

export type FreeElectricityAssistantSource = {
  label: string;
  url?: string;
  trigger?: 'OPEN_FREE_ELECTRICITY_GUIDE';
};

export type FreeElectricityAssistantReply = {
  text: string;
  sources: FreeElectricityAssistantSource[];
  confidence: number;
};

const stateAliases: Array<{ terms: string[]; matcher: (city: FreeElectricityGuideCity) => boolean }> = [
  { terms: ['nsw', 'new south wales'], matcher: (city) => city.state === 'NSW' },
  { terms: ['se qld', 'south east qld', 'south-east qld', 'south east queensland', 'south-east queensland'], matcher: (city) => city.region === 'South-East Queensland' },
  { terms: ['qld', 'queensland'], matcher: (city) => city.state === 'QLD' },
  { terms: ['sa', 'south australia'], matcher: (city) => city.state === 'SA' },
  { terms: ['vic', 'victoria'], matcher: (city) => city.state === 'VIC' },
  { terms: ['wa', 'western australia'], matcher: (city) => city.state === 'WA' },
  { terms: ['tas', 'tasmania'], matcher: (city) => city.state === 'TAS' },
  { terms: ['nt', 'northern territory'], matcher: (city) => city.state === 'NT' },
  { terms: ['act', 'canberra territory', 'australian capital territory'], matcher: (city) => city.state === 'ACT' },
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesTerm(text: string, term: string) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, 'i').test(text);
}

function normalizeQuestion(text: string) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function looksLikeFreeElectricityQuestion(text: string) {
  const normalized = normalizeQuestion(text);
  if (!normalized) return false;

  const threeHourFreePower = /(?:\b3|\bthree)\s*[-–—]?\s*(?:hours?|hrs?)\s+free/i.test(normalized);
  const explicitFreePower =
    /\b(free electricity|free power|solar sharer|midday power saver|free midday|midday electricity|free electricity guide|free power guide)\b/i.test(normalized) ||
    threeHourFreePower;
  const electricityWithFreeContext =
    /\b(electricity|power|energy)\b/i.test(normalized) &&
    (/\b(free|solar sharer|midday|24\s*kwh|smart meter|rooftop solar|embedded network)\b/i.test(normalized) ||
      /(?:\b3|\bthree)\s*[-–—]?\s*(?:hours?|hrs?)/i.test(normalized));

  if (!explicitFreePower && !electricityWithFreeContext) return false;

  const looksLikeHouseholdBill =
    /\b(bill|bills|split|splitting|housemate|housemates|household|owe|owed|payment|payments|expense|expenses|utility|utilities|rent)\b/i.test(normalized) &&
    !/\b(solar sharer|midday power saver|free electricity guide)\b/i.test(normalized) &&
    !threeHourFreePower;
  return !looksLikeHouseholdBill;
}

function findMatchedCities(text: string) {
  const normalized = normalizeQuestion(text);
  const matches: FreeElectricityGuideCity[] = [];
  const add = (city: FreeElectricityGuideCity) => {
    if (!matches.includes(city)) matches.push(city);
  };

  freeElectricityGuideCities.forEach((city) => {
    if (includesTerm(normalized, city.city.toLowerCase())) {
      add(city);
    }
  });

  stateAliases.forEach((alias) => {
    if (alias.terms.some((term) => includesTerm(normalized, term))) {
      freeElectricityGuideCities.filter(alias.matcher).forEach(add);
    }
  });

  return matches;
}

function sourceLabel(url: string) {
  if (url === VICTORIA_FREE_POWER_SOURCE_URL) return 'Victorian Government free power';
  if (url === AER_DMO_FINAL_DETERMINATION_SOURCE_URL) return 'AER DMO 2026-27 final determination';
  return 'AER Solar Sharer fact sheet';
}

function buildSources(cities: FreeElectricityGuideCity[]) {
  const sources: FreeElectricityAssistantSource[] = [
    { label: 'Free electricity guide', trigger: 'OPEN_FREE_ELECTRICITY_GUIDE' },
  ];
  const officialUrls = cities.length > 0
    ? cities.map((city) => city.sourceUrl)
    : [AER_SOLAR_SHARER_SOURCE_URL];

  officialUrls.forEach((url) => {
    if (!sources.some((source) => source.url === url)) {
      sources.push({ label: sourceLabel(url), url });
    }
  });

  return sources;
}

function buildCityReply(city: FreeElectricityGuideCity) {
  if (city.status === 'not-confirmed') {
    return `${city.city} / ${city.state} is not confirmed for a regulated 2026 free midday electricity offer. Check your retailer and do not assume the NSW, South-East Queensland, South Australia, or Victorian rules apply.`;
  }

  if (city.state === 'VIC') {
    return `${city.city} / ${city.state} is confirmed under Victoria's Midday Power Saver: ${city.starts}, ${city.freeWindow}. Eligible households need to opt in through their energy provider, and rates outside the free window still matter.`;
  }

  return `${city.city} / ${city.state} is confirmed under the Solar Sharer Offer: ${city.starts}, ${city.freeWindow}. You need a smart meter and opt-in retailer plan; rooftop solar is not required, and federal free usage is capped at 24 kWh during the free window.`;
}

function buildGroupedReply(cities: FreeElectricityGuideCity[]) {
  const first = cities[0];
  const allNotConfirmed = cities.every((city) => city.status === 'not-confirmed');
  const cityNames = cities.map((city) => city.city).join(', ');

  if (allNotConfirmed) {
    const stateLabel = first?.region || first?.state || 'that area';
    return `${stateLabel} is not confirmed for a regulated 2026 free midday electricity offer in this guide. Check your own retailer for any separate free-period plan.`;
  }

  if (first?.state === 'VIC') {
    return `Victoria is confirmed under Midday Power Saver from 1 October 2026, with a daily 11am-2pm free window for eligible opted-in households. This guide lists ${cityNames}.`;
  }

  if (first?.state === 'SA') {
    return `South Australia is confirmed under the Solar Sharer Offer from 1 July 2026, with a daily 12pm-3pm free window for eligible opted-in households. This guide lists ${cityNames}.`;
  }

  if (first?.region === 'South-East Queensland') {
    return `South-East Queensland is confirmed under the Solar Sharer Offer from 1 July 2026, with a daily 11am-2pm free window for eligible opted-in households in the Energex area. This guide lists ${cityNames}.`;
  }

  return `${first?.region || first?.state || 'This area'} is confirmed under the Solar Sharer Offer from 1 July 2026, with a daily 11am-2pm free window for eligible opted-in households. This guide lists ${cityNames}.`;
}

function buildRequirementReply(normalized: string) {
  if (/\b(solar|rooftop)\b/i.test(normalized)) {
    return 'No rooftop solar is required for the confirmed federal Solar Sharer offer. You still need an eligible residential account in a rollout area, a smart meter, and an opt-in retailer plan. Federal free usage is capped at 24 kWh during the free window.';
  }
  if (/\b(smart meter|meter)\b/i.test(normalized)) {
    return 'Yes, the guide says a smart meter is required for the confirmed free-period plans. You also need to opt into a participating retailer plan.';
  }
  if (/\b(24\s*kwh|cap|capped)\b/i.test(normalized)) {
    return 'The federal Solar Sharer free usage is capped at 24 kWh during each free window. Compare the rest of the plan because rates outside the free period still matter.';
  }
  if (/\b(embedded network|embedded)\b/i.test(normalized)) {
    return 'Embedded networks are excluded from the federal Solar Sharer offer in this guide. Check your retailer or embedded-network operator for any separate offer.';
  }
  return null;
}

export function buildFreeElectricityAssistantReply(text: string): FreeElectricityAssistantReply | null {
  if (!looksLikeFreeElectricityQuestion(text)) return null;

  const normalized = normalizeQuestion(text);
  const matchedCities = findMatchedCities(text);
  const requirementReply = buildRequirementReply(normalized);
  const replyText = matchedCities.length === 1
    ? buildCityReply(matchedCities[0])
    : matchedCities.length > 1
      ? buildGroupedReply(matchedCities)
      : requirementReply || 'Confirmed 2026 free-electricity windows are NSW and South-East Queensland 11am-2pm from 1 July, South Australia 12pm-3pm from 1 July, and Victoria 11am-2pm from 1 October. WA, TAS, NT, and ACT are not confirmed in this guide; check your retailer.';

  return {
    text: replyText,
    sources: buildSources(matchedCities),
    confidence: matchedCities.length > 0 ? 92 : 88,
  };
}
