export const FREE_ELECTRICITY_GUIDE_ROUTE = '/guides/free-electricity-australia-2026';
export const FREE_ELECTRICITY_GUIDE_UPDATED_LABEL = '30 May 2026';

export type FreeElectricityGuideStatus = 'confirmed' | 'not-confirmed';

export type FreeElectricityGuideCity = {
  city: string;
  state: string;
  region: string;
  anchor: string;
  starts: string;
  freeWindow: string;
  offerName: string;
  status: FreeElectricityGuideStatus;
  statusLabel: string;
  summary: string;
  details: string[];
  sourceUrl: string;
};

export const AER_SOLAR_SHARER_SOURCE_URL =
  'https://www.aer.gov.au/documents/aer-solar-sharer-offer-fact-sheet-dmo-8-final-determination';

export const AER_DMO_FINAL_DETERMINATION_SOURCE_URL =
  'https://www.aer.gov.au/documents/aer-final-determination-default-market-offer-2026-27';

export const VICTORIA_FREE_POWER_SOURCE_URL =
  'https://www.premier.vic.gov.au/three-hours-free-power-every-day';

const solarSharerNswDetails = [
  'The federal Solar Sharer Offer starts on 1 July 2026 for eligible residential customers in NSW.',
  'The daily free period is 11am to 2pm local time.',
  'You need a smart meter and must opt into a participating retailer plan.',
  'You do not need rooftop solar, but federal Solar Sharer usage is capped at 24 kWh during each free window.',
];

const solarSharerSeqDetails = [
  'The confirmed federal offer applies to South-East Queensland in the Energex distribution area.',
  'The daily free period is 11am to 2pm local time from 1 July 2026.',
  'Regional Queensland is not covered by this confirmed DMO Solar Sharer rollout.',
  'You need a smart meter and must opt into a participating retailer plan.',
];

const solarSharerSaDetails = [
  'The federal Solar Sharer Offer starts on 1 July 2026 for eligible South Australian residential customers.',
  'The daily free period is 12pm to 3pm local time.',
  'You need a smart meter and must opt into a participating retailer plan.',
  'Federal Solar Sharer usage is capped at 24 kWh during each free window.',
];

const victoriaDetails = [
  'Victoria has a separate offer called Midday Power Saver.',
  'It starts on 1 October 2026 with a daily free period from 11am to 2pm.',
  'The Victorian Government says eligible households can opt in through their energy provider.',
  'Compare the full plan because rates outside the free window still matter.',
];

const unavailableDetails = [
  'No confirmed regulated 2026 Solar Sharer or Midday Power Saver equivalent was found for this jurisdiction.',
  'Check your own retailer for any separate market offer with a free midday usage period.',
  'Do not assume the NSW, South-East Queensland, South Australia, or Victorian rules apply here.',
];

export const freeElectricityGuideCities: FreeElectricityGuideCity[] = [
  {
    city: 'Sydney',
    state: 'NSW',
    region: 'New South Wales',
    anchor: 'sydney',
    starts: '1 July 2026',
    freeWindow: '11am-2pm',
    offerName: 'Solar Sharer Offer',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    summary: 'Sydney households in NSW can access the federal Solar Sharer Offer if they meet the plan and meter requirements.',
    details: solarSharerNswDetails,
    sourceUrl: AER_SOLAR_SHARER_SOURCE_URL,
  },
  {
    city: 'Newcastle',
    state: 'NSW',
    region: 'New South Wales',
    anchor: 'newcastle',
    starts: '1 July 2026',
    freeWindow: '11am-2pm',
    offerName: 'Solar Sharer Offer',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    summary: 'Newcastle follows the NSW Solar Sharer settings: 11am to 2pm daily from 1 July 2026.',
    details: solarSharerNswDetails,
    sourceUrl: AER_SOLAR_SHARER_SOURCE_URL,
  },
  {
    city: 'Wollongong',
    state: 'NSW',
    region: 'New South Wales',
    anchor: 'wollongong',
    starts: '1 July 2026',
    freeWindow: '11am-2pm',
    offerName: 'Solar Sharer Offer',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    summary: 'Wollongong is covered by the NSW Solar Sharer timing for eligible residential customers.',
    details: solarSharerNswDetails,
    sourceUrl: AER_SOLAR_SHARER_SOURCE_URL,
  },
  {
    city: 'Armidale',
    state: 'NSW',
    region: 'New South Wales',
    anchor: 'armidale',
    starts: '1 July 2026',
    freeWindow: '11am-2pm',
    offerName: 'Solar Sharer Offer',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    summary: 'Armidale uses the NSW Solar Sharer window for eligible households on a participating plan.',
    details: solarSharerNswDetails,
    sourceUrl: AER_SOLAR_SHARER_SOURCE_URL,
  },
  {
    city: 'Brisbane',
    state: 'QLD',
    region: 'South-East Queensland',
    anchor: 'brisbane',
    starts: '1 July 2026',
    freeWindow: '11am-2pm',
    offerName: 'Solar Sharer Offer',
    status: 'confirmed',
    statusLabel: 'Confirmed for SE QLD',
    summary: 'Brisbane is in the confirmed South-East Queensland rollout area for the federal Solar Sharer Offer.',
    details: solarSharerSeqDetails,
    sourceUrl: AER_SOLAR_SHARER_SOURCE_URL,
  },
  {
    city: 'Gold Coast',
    state: 'QLD',
    region: 'South-East Queensland',
    anchor: 'gold-coast',
    starts: '1 July 2026',
    freeWindow: '11am-2pm',
    offerName: 'Solar Sharer Offer',
    status: 'confirmed',
    statusLabel: 'Confirmed for SE QLD',
    summary: 'Gold Coast households in the Energex area follow the South-East Queensland Solar Sharer settings.',
    details: solarSharerSeqDetails,
    sourceUrl: AER_SOLAR_SHARER_SOURCE_URL,
  },
  {
    city: 'Adelaide',
    state: 'SA',
    region: 'South Australia',
    anchor: 'adelaide',
    starts: '1 July 2026',
    freeWindow: '12pm-3pm',
    offerName: 'Solar Sharer Offer',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    summary: 'Adelaide uses South Australia’s Solar Sharer window: 12pm to 3pm daily from 1 July 2026.',
    details: solarSharerSaDetails,
    sourceUrl: AER_SOLAR_SHARER_SOURCE_URL,
  },
  {
    city: 'Melbourne',
    state: 'VIC',
    region: 'Victoria',
    anchor: 'melbourne',
    starts: '1 October 2026',
    freeWindow: '11am-2pm',
    offerName: 'Midday Power Saver',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    summary: 'Melbourne households use Victoria’s separate Midday Power Saver from 1 October 2026.',
    details: victoriaDetails,
    sourceUrl: VICTORIA_FREE_POWER_SOURCE_URL,
  },
  {
    city: 'Geelong',
    state: 'VIC',
    region: 'Victoria',
    anchor: 'geelong',
    starts: '1 October 2026',
    freeWindow: '11am-2pm',
    offerName: 'Midday Power Saver',
    status: 'confirmed',
    statusLabel: 'Confirmed',
    summary: 'Geelong follows the Victorian Midday Power Saver settings from 1 October 2026.',
    details: victoriaDetails,
    sourceUrl: VICTORIA_FREE_POWER_SOURCE_URL,
  },
  {
    city: 'Perth',
    state: 'WA',
    region: 'Western Australia',
    anchor: 'perth',
    starts: 'Not confirmed',
    freeWindow: 'Check retailer',
    offerName: 'No regulated 2026 equivalent found',
    status: 'not-confirmed',
    statusLabel: 'Not confirmed',
    summary: 'No confirmed regulated 2026 free midday electricity equivalent was found for Western Australia.',
    details: unavailableDetails,
    sourceUrl: AER_DMO_FINAL_DETERMINATION_SOURCE_URL,
  },
  {
    city: 'Hobart',
    state: 'TAS',
    region: 'Tasmania',
    anchor: 'hobart',
    starts: 'Not confirmed',
    freeWindow: 'Check retailer',
    offerName: 'No regulated 2026 equivalent found',
    status: 'not-confirmed',
    statusLabel: 'Not confirmed',
    summary: 'No confirmed regulated 2026 free midday electricity equivalent was found for Tasmania.',
    details: unavailableDetails,
    sourceUrl: AER_DMO_FINAL_DETERMINATION_SOURCE_URL,
  },
  {
    city: 'Darwin',
    state: 'NT',
    region: 'Northern Territory',
    anchor: 'darwin',
    starts: 'Not confirmed',
    freeWindow: 'Check retailer',
    offerName: 'No regulated 2026 equivalent found',
    status: 'not-confirmed',
    statusLabel: 'Not confirmed',
    summary: 'No confirmed regulated 2026 free midday electricity equivalent was found for the Northern Territory.',
    details: unavailableDetails,
    sourceUrl: AER_DMO_FINAL_DETERMINATION_SOURCE_URL,
  },
  {
    city: 'Canberra',
    state: 'ACT',
    region: 'Australian Capital Territory',
    anchor: 'canberra',
    starts: 'Not confirmed',
    freeWindow: 'Check retailer',
    offerName: 'No regulated 2026 equivalent found',
    status: 'not-confirmed',
    statusLabel: 'Not confirmed',
    summary: 'No confirmed regulated 2026 free midday electricity equivalent was found for the ACT.',
    details: unavailableDetails,
    sourceUrl: AER_DMO_FINAL_DETERMINATION_SOURCE_URL,
  },
];

export const freeElectricityEligibility = [
  'Residential electricity account in an eligible rollout area',
  'Smart meter',
  'Opt-in retailer plan',
  'Ability to shift useful power usage into the free window',
  'No rooftop solar required',
];

export const freeElectricityBestUses = [
  'Washing machine or dishwasher',
  'Dryer when it is safe and suitable',
  'Pool pump',
  'Electric hot water',
  'Air conditioning pre-cooling or heating pre-warming',
  'EV charging',
  'Home battery charging',
];

export const freeElectricityWatchOuts = [
  'Free power does not automatically mean the whole plan is cheaper.',
  'Compare the supply charge and usage rates outside the free period.',
  'Federal Solar Sharer free usage is capped at 24 kWh during each free window.',
  'Embedded networks are excluded from the federal Solar Sharer offer.',
  'Households that cannot shift usage into the free window may save little or nothing.',
];

export const freeElectricitySources = [
  {
    label: 'DCCEEW: Latest Default Market Offer has free power option',
    url: 'https://www.dcceew.gov.au/about/news/latest-default-market-offer-free-power-option',
  },
  {
    label: 'AER: Solar Sharer Offer fact sheet',
    url: 'https://www.aer.gov.au/documents/aer-solar-sharer-offer-fact-sheet-dmo-8-final-determination',
  },
  {
    label: 'AER: Default Market Offer 2026-27 final determination',
    url: 'https://www.aer.gov.au/documents/aer-final-determination-default-market-offer-2026-27',
  },
  {
    label: 'Victorian Government: Best Midday Power Offer In The Country',
    url: 'https://www.premier.vic.gov.au/best-midday-power-offer-country',
  },
  {
    label: 'Victorian Government: Three Hours Of Free Power Every Day',
    url: 'https://www.premier.vic.gov.au/three-hours-free-power-every-day',
  },
  {
    label: 'Minister for Climate Change and Energy: Solar Sharer announcement',
    url: 'https://minister.dcceew.gov.au/bowen/media-releases/more-australian-homes-get-access-solar-power',
  },
];
