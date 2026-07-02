import nswCrimeData from '../../imports/ghar_nsw_lga_crime_scored_enhanced.json';
import qldCrimeData from '../../imports/ghar_qld_lga_crime_scored_enhanced.json';
import vicCrimeData from '../../imports/ghar_vic_lga_crime_scored_enhanced_no_non_dwelling.json';
import waCrimeData from '../../imports/ghar_wa_police_district_crime_scored_enhanced.json';
import ntCrimeData from '../../imports/ghar_nt_sa2_crime_scored_enhanced_transparent.json';
import tasCrimeData from '../../imports/ghar_tas_state_crime_context_2024_25.json';

export type NswCrimeRecord = typeof nswCrimeData[number];
export type QldCrimeRecord = typeof qldCrimeData[number];
export type VicCrimeRecord = typeof vicCrimeData[number];
export type WaCrimeRecord = typeof waCrimeData[number];
export type NtCrimeRecord = typeof ntCrimeData[number];
export type TasCrimeRecord = typeof tasCrimeData;

export type GenericCrimeRecord = {
  state: string;
  lga_or_district: string;
  geo_type: string;
  reporting_region?: string;
  scores?: {
    overall_caution_score_0_100: number;
    personal_safety_score_0_100: number;
    property_crime_score_0_100: number;
    overall_caution_band: string;
  };
  display: {
    headline: string;
    summary: string;
  };
  notes: {
    method: string;
    warning: string;
  };
  period: string;
  metrics_label: string;
  metrics: Record<string, number>;
};

function normalizeRecord(record: any): GenericCrimeRecord {
  const state = record.state;
  let metrics_label = '';
  let metrics: Record<string, number> = {};

  if (state === 'NSW') {
    metrics_label = 'Incidents per 100k Residents';
    metrics = record.crime_metrics_per_100k;
  } else if (state === 'QLD') {
    metrics_label = 'Offence Count (13 months)';
    metrics = record.crime_metrics_count_13m;
  } else if (state === 'VIC') {
    metrics_label = 'Offence Count (12 months)';
    metrics = record.crime_metrics_count_12m;
  } else if (state === 'WA') {
    metrics_label = 'Offence Count (12 months)';
    metrics = record.crime_metrics_count_12m;
  } else if (state === 'NT') {
    metrics_label = 'Offence Count (10 months)';
    metrics = record.crime_metrics_count_available_months;
  } else if (state === 'TAS') {
    metrics_label = 'Offence Count (12 months)';
    const raw = record.crime_metrics_count_12m;
    metrics = {
      non_dv_assault: raw.assault_excl_police,
      robbery: raw.robbery,
      break_enter_dwelling: raw.burglary_buildings,
      motor_vehicle_theft: raw.stolen_motor_vehicles,
      steal_from_vehicle: raw.burglary_motor_vehicles_other_conveyances,
      retail_theft: raw.stealing_general,
      malicious_damage: raw.injure_destroy_property,
    };
  }

  return {
    state: record.state,
    lga_or_district: record.lga || record.district || record.sa2 || record.state_name,
    geo_type: record.geo_type,
    reporting_region: record.reporting_region,
    scores: record.scores,
    display: record.display,
    notes: record.notes,
    period: record.period,
    metrics_label,
    metrics,
  };
}

const SUBURB_TO_SLUG: Record<string, { slug: string; state: string }> = {
  // NSW City of Sydney
  'sydney': { slug: 'sydney', state: 'NSW' }, 'sydney cbd': { slug: 'sydney', state: 'NSW' }, 'haymarket': { slug: 'sydney', state: 'NSW' }, 'ultimo': { slug: 'sydney', state: 'NSW' },
  'chippendale': { slug: 'sydney', state: 'NSW' }, 'broadway': { slug: 'sydney', state: 'NSW' }, 'surry hills': { slug: 'sydney', state: 'NSW' }, 'redfern': { slug: 'sydney', state: 'NSW' },
  'darlington': { slug: 'sydney', state: 'NSW' }, 'glebe': { slug: 'sydney', state: 'NSW' }, 'forest lodge': { slug: 'sydney', state: 'NSW' }, 'zetland': { slug: 'sydney', state: 'NSW' },
  'waterloo': { slug: 'sydney', state: 'NSW' }, 'pyrmont': { slug: 'sydney', state: 'NSW' }, 'dawes point': { slug: 'sydney', state: 'NSW' }, 'barangaroo': { slug: 'sydney', state: 'NSW' },
  'millers point': { slug: 'sydney', state: 'NSW' }, 'the rocks': { slug: 'sydney', state: 'NSW' }, 'woolloomooloo': { slug: 'sydney', state: 'NSW' },
  'darlinghurst': { slug: 'sydney', state: 'NSW' }, 'potts point': { slug: 'sydney', state: 'NSW' }, 'elizabeth bay': { slug: 'sydney', state: 'NSW' },
  'rushcutters bay': { slug: 'sydney', state: 'NSW' }, 'paddington': { slug: 'sydney', state: 'NSW' }, 'moore park': { slug: 'sydney', state: 'NSW' },
  'alexandria': { slug: 'sydney', state: 'NSW' }, 'beaconsfield': { slug: 'sydney', state: 'NSW' }, 'rosebery': { slug: 'sydney', state: 'NSW' },
  'eveleigh': { slug: 'sydney', state: 'NSW' }, 'camperdown': { slug: 'sydney', state: 'NSW' }, 'newtown': { slug: 'inner-west', state: 'NSW' },
  'erskineville': { slug: 'inner-west', state: 'NSW' }, 'st peters': { slug: 'inner-west', state: 'NSW' }, 'enmore': { slug: 'inner-west', state: 'NSW' },
  'marrickville': { slug: 'inner-west', state: 'NSW' }, 'tempe': { slug: 'inner-west', state: 'NSW' }, 'stanmore': { slug: 'inner-west', state: 'NSW' },
  'petersham': { slug: 'inner-west', state: 'NSW' }, 'lewisham': { slug: 'inner-west', state: 'NSW' }, 'summer hill': { slug: 'inner-west', state: 'NSW' },
  'ashfield': { slug: 'inner-west', state: 'NSW' }, 'croydon': { slug: 'inner-west', state: 'NSW' }, 'burwood': { slug: 'burwood', state: 'NSW' },
  'strathfield': { slug: 'strathfield', state: 'NSW' },
  'randwick': { slug: 'randwick', state: 'NSW' }, 'kensington': { slug: 'randwick', state: 'NSW' }, 'kingsford': { slug: 'randwick', state: 'NSW' },
  'maroubra': { slug: 'randwick', state: 'NSW' }, 'coogee': { slug: 'randwick', state: 'NSW' }, 'south coogee': { slug: 'randwick', state: 'NSW' },
  'malabar': { slug: 'randwick', state: 'NSW' }, 'la perouse': { slug: 'randwick', state: 'NSW' }, 'little bay': { slug: 'randwick', state: 'NSW' },
  'chifley': { slug: 'randwick', state: 'NSW' },
  'mascot': { slug: 'bayside', state: 'NSW' }, 'botany': { slug: 'bayside', state: 'NSW' }, 'eastgardens': { slug: 'bayside', state: 'NSW' },
  'pagewood': { slug: 'bayside', state: 'NSW' }, 'hillsdale': { slug: 'bayside', state: 'NSW' }, 'banksmeadow': { slug: 'bayside', state: 'NSW' },
  'rockdale': { slug: 'bayside', state: 'NSW' }, 'arncliffe': { slug: 'bayside', state: 'NSW' }, 'wolli creek': { slug: 'bayside', state: 'NSW' },
  'bardwell park': { slug: 'bayside', state: 'NSW' }, 'bexley': { slug: 'bayside', state: 'NSW' }, 'kogarah': { slug: 'bayside', state: 'NSW' },
  'sans souci': { slug: 'bayside', state: 'NSW' }, 'ramsgate': { slug: 'bayside', state: 'NSW' }, 'brighton le sands': { slug: 'bayside', state: 'NSW' },
  'kyeemagh': { slug: 'bayside', state: 'NSW' },
  'parramatta': { slug: 'parramatta', state: 'NSW' }, 'harris park': { slug: 'parramatta', state: 'NSW' }, 'granville': { slug: 'parramatta', state: 'NSW' },
  'rosehill': { slug: 'parramatta', state: 'NSW' }, 'westmead': { slug: 'parramatta', state: 'NSW' }, 'north parramatta': { slug: 'parramatta', state: 'NSW' },
  'dundas': { slug: 'parramatta', state: 'NSW' }, 'telopea': { slug: 'parramatta', state: 'NSW' }, 'carlingford': { slug: 'parramatta', state: 'NSW' },
  'epping': { slug: 'parramatta', state: 'NSW' }, 'eastwood': { slug: 'parramatta', state: 'NSW' }, 'ermington': { slug: 'parramatta', state: 'NSW' },
  'rydalmere': { slug: 'parramatta', state: 'NSW' }, 'oatlands': { slug: 'parramatta', state: 'NSW' },
  'penrith': { slug: 'penrith', state: 'NSW' }, 'kingswood': { slug: 'penrith', state: 'NSW' }, 'werrington': { slug: 'penrith', state: 'NSW' },
  'south penrith': { slug: 'penrith', state: 'NSW' }, 'jamisontown': { slug: 'penrith', state: 'NSW' }, 'glenmore park': { slug: 'penrith', state: 'NSW' },
  'emu plains': { slug: 'penrith', state: 'NSW' }, 'st marys': { slug: 'penrith', state: 'NSW' },
  'campbelltown': { slug: 'campbelltown', state: 'NSW' }, 'macarthur': { slug: 'campbelltown', state: 'NSW' }, 'ingleburn': { slug: 'campbelltown', state: 'NSW' },
  'minto': { slug: 'campbelltown', state: 'NSW' }, 'leumeah': { slug: 'campbelltown', state: 'NSW' },
  'blacktown': { slug: 'blacktown', state: 'NSW' }, 'mount druitt': { slug: 'blacktown', state: 'NSW' }, 'seven hills': { slug: 'blacktown', state: 'NSW' },
  'rooty hill': { slug: 'blacktown', state: 'NSW' }, 'quakers hill': { slug: 'blacktown', state: 'NSW' },
  'liverpool': { slug: 'liverpool', state: 'NSW' }, 'moorebank': { slug: 'liverpool', state: 'NSW' }, 'casula': { slug: 'liverpool', state: 'NSW' },
  'green valley': { slug: 'liverpool', state: 'NSW' }, 'warwick farm': { slug: 'liverpool', state: 'NSW' },
  'bankstown': { slug: 'canterbury-bankstown', state: 'NSW' }, 'canterbury': { slug: 'canterbury-bankstown', state: 'NSW' },
  'lakemba': { slug: 'canterbury-bankstown', state: 'NSW' }, 'punchbowl': { slug: 'canterbury-bankstown', state: 'NSW' },
  'campsie': { slug: 'canterbury-bankstown', state: 'NSW' }, 'belmore': { slug: 'canterbury-bankstown', state: 'NSW' },
  'auburn': { slug: 'cumberland', state: 'NSW' }, 'lidcombe': { slug: 'cumberland', state: 'NSW' }, 'berala': { slug: 'cumberland', state: 'NSW' },
  'guildford': { slug: 'cumberland', state: 'NSW' }, 'merrylands': { slug: 'cumberland', state: 'NSW' }, 'wentworthville': { slug: 'cumberland', state: 'NSW' },
  'ryde': { slug: 'ryde', state: 'NSW' }, 'top ryde': { slug: 'ryde', state: 'NSW' }, 'macquarie park': { slug: 'ryde', state: 'NSW' },
  'north ryde': { slug: 'ryde', state: 'NSW' }, 'meadowbank': { slug: 'ryde', state: 'NSW' }, 'west ryde': { slug: 'ryde', state: 'NSW' },
  'denistone': { slug: 'ryde', state: 'NSW' }, 'putney': { slug: 'ryde', state: 'NSW' }, 'gladesville': { slug: 'ryde', state: 'NSW' },
  'north sydney': { slug: 'north-sydney', state: 'NSW' }, 'kirribilli': { slug: 'north-sydney', state: 'NSW' },
  'lavender bay': { slug: 'north-sydney', state: 'NSW' }, 'milsons point': { slug: 'north-sydney', state: 'NSW' },
  'neutral bay': { slug: 'north-sydney', state: 'NSW' }, 'cremorne': { slug: 'north-sydney', state: 'NSW' },
  'crows nest': { slug: 'north-sydney', state: 'NSW' },
  'woollahra': { slug: 'woollahra', state: 'NSW' }, 'double bay': { slug: 'woollahra', state: 'NSW' }, 'bondi junction': { slug: 'woollahra', state: 'NSW' },
  'vaucluse': { slug: 'woollahra', state: 'NSW' }, 'rose bay': { slug: 'woollahra', state: 'NSW' }, 'bellevue hill': { slug: 'woollahra', state: 'NSW' },
  'point piper': { slug: 'woollahra', state: 'NSW' },
  'waverley': { slug: 'waverley', state: 'NSW' }, 'bondi': { slug: 'waverley', state: 'NSW' }, 'bondi beach': { slug: 'waverley', state: 'NSW' },
  'bronte': { slug: 'waverley', state: 'NSW' }, 'tamarama': { slug: 'waverley', state: 'NSW' }, 'dover heights': { slug: 'waverley', state: 'NSW' },
  'mosman': { slug: 'mosman', state: 'NSW' },
  'willoughby': { slug: 'willoughby', state: 'NSW' }, 'chatswood': { slug: 'willoughby', state: 'NSW' },
  'gordon': { slug: 'ku-ring-gai', state: 'NSW' }, 'killara': { slug: 'ku-ring-gai', state: 'NSW' }, 'lindfield': { slug: 'ku-ring-gai', state: 'NSW' },
  'turramurra': { slug: 'ku-ring-gai', state: 'NSW' }, 'pymble': { slug: 'ku-ring-gai', state: 'NSW' }, 'wahroonga': { slug: 'ku-ring-gai', state: 'NSW' },
  'hornsby': { slug: 'hornsby', state: 'NSW' }, 'berowra': { slug: 'hornsby', state: 'NSW' }, 'thornleigh': { slug: 'hornsby', state: 'NSW' },
  'pennant hills': { slug: 'hornsby', state: 'NSW' }, 'normanhurst': { slug: 'hornsby', state: 'NSW' },
  'manly': { slug: 'northern-beaches', state: 'NSW' }, 'dee why': { slug: 'northern-beaches', state: 'NSW' },
  'brookvale': { slug: 'northern-beaches', state: 'NSW' }, 'mona vale': { slug: 'northern-beaches', state: 'NSW' },
  'narrabeen': { slug: 'northern-beaches', state: 'NSW' }, 'avalon': { slug: 'northern-beaches', state: 'NSW' },
  'hunters hill': { slug: 'hunters-hill', state: 'NSW' },
  'lane cove': { slug: 'lane-cove', state: 'NSW' },
  'concord': { slug: 'canada-bay', state: 'NSW' }, 'rhodes': { slug: 'canada-bay', state: 'NSW' }, 'drummoyne': { slug: 'canada-bay', state: 'NSW' },
  'five dock': { slug: 'canada-bay', state: 'NSW' }, 'abbotsford': { slug: 'canada-bay', state: 'NSW' },
  'hurstville': { slug: 'georges-river', state: 'NSW' }, 'kogarah bay': { slug: 'georges-river', state: 'NSW' },
  'penshurst': { slug: 'georges-river', state: 'NSW' }, 'mortdale': { slug: 'georges-river', state: 'NSW' },
  'newcastle': { slug: 'newcastle', state: 'NSW' }, 'birmingham gardens': { slug: 'newcastle', state: 'NSW' }, 'jesmond': { slug: 'newcastle', state: 'NSW' },
  'mayfield': { slug: 'newcastle', state: 'NSW' }, 'wallsend': { slug: 'newcastle', state: 'NSW' }, 'warabrook': { slug: 'newcastle', state: 'NSW' },
  'callaghan': { slug: 'newcastle', state: 'NSW' }, 'hamilton': { slug: 'newcastle', state: 'NSW' }, 'lambton': { slug: 'newcastle', state: 'NSW' },
  'merewether': { slug: 'newcastle', state: 'NSW' }, 'cooks hill': { slug: 'newcastle', state: 'NSW' }, 'wickham': { slug: 'newcastle', state: 'NSW' },
  'islington': { slug: 'newcastle', state: 'NSW' }, 'adamstown': { slug: 'newcastle', state: 'NSW' }, 'stockton': { slug: 'newcastle', state: 'NSW' },
  'wollongong': { slug: 'wollongong', state: 'NSW' }, 'gwynneville': { slug: 'wollongong', state: 'NSW' }, 'keiraville': { slug: 'wollongong', state: 'NSW' },
  'north wollongong': { slug: 'wollongong', state: 'NSW' }, 'mount ousley': { slug: 'wollongong', state: 'NSW' },
  'coniston': { slug: 'wollongong', state: 'NSW' }, 'fairy meadow': { slug: 'wollongong', state: 'NSW' }, 'corrimal': { slug: 'wollongong', state: 'NSW' },
  'thirroul': { slug: 'wollongong', state: 'NSW' }, 'unanderra': { slug: 'wollongong', state: 'NSW' },
  'armidale': { slug: 'armidale-regional', state: 'NSW' }, 'armidale cbd': { slug: 'armidale-regional', state: 'NSW' },
  'guyra': { slug: 'armidale-regional', state: 'NSW' }, 'kellys plains': { slug: 'armidale-regional', state: 'NSW' },
  'uralla': { slug: 'uralla', state: 'NSW' },
  'gosford': { slug: 'central-coast', state: 'NSW' }, 'woy woy': { slug: 'central-coast', state: 'NSW' },
  'terrigal': { slug: 'central-coast', state: 'NSW' }, 'erina': { slug: 'central-coast', state: 'NSW' },
  'charlestown': { slug: 'lake-macquarie', state: 'NSW' }, 'belmont': { slug: 'lake-macquarie', state: 'NSW' },
  'warners bay': { slug: 'lake-macquarie', state: 'NSW' }, 'toronto': { slug: 'lake-macquarie', state: 'NSW' },
  'maitland': { slug: 'maitland', state: 'NSW' }, 'east maitland': { slug: 'maitland', state: 'NSW' }, 'rutherford': { slug: 'maitland', state: 'NSW' },
  'fairfield': { slug: 'fairfield', state: 'NSW' }, 'cabramatta': { slug: 'fairfield', state: 'NSW' }, 'canley vale': { slug: 'fairfield', state: 'NSW' },
  'shellharbour': { slug: 'shellharbour', state: 'NSW' }, 'warilla': { slug: 'shellharbour', state: 'NSW' }, 'albion park': { slug: 'shellharbour', state: 'NSW' },
  'katoomba': { slug: 'blue-mountains', state: 'NSW' }, 'springwood': { slug: 'blue-mountains', state: 'NSW' }, 'leura': { slug: 'blue-mountains', state: 'NSW' },
  'nowra': { slug: 'shoalhaven', state: 'NSW' }, 'berry': { slug: 'shoalhaven', state: 'NSW' },
  'wagga wagga': { slug: 'wagga-wagga', state: 'NSW' },
  'albury': { slug: 'albury', state: 'NSW' },
  'orange': { slug: 'orange', state: 'NSW' },
  'coffs harbour': { slug: 'coffs-harbour', state: 'NSW' },
  'port macquarie': { slug: 'port-macquarie-hastings', state: 'NSW' },
  'lismore': { slug: 'lismore', state: 'NSW' },
  'byron bay': { slug: 'byron', state: 'NSW' },
  'tweed heads': { slug: 'tweed', state: 'NSW' },
  'bathurst': { slug: 'bathurst-regional', state: 'NSW' },
  'tamworth': { slug: 'tamworth-regional', state: 'NSW' },
  'dubbo': { slug: 'dubbo-regional', state: 'NSW' },
  'broken hill': { slug: 'broken-hill', state: 'NSW' },
  'griffith': { slug: 'griffith', state: 'NSW' },
  'richmond': { slug: 'hawkesbury', state: 'NSW' }, 'windsor': { slug: 'hawkesbury', state: 'NSW' },
  'camden': { slug: 'camden', state: 'NSW' }, 'narellan': { slug: 'camden', state: 'NSW' }, 'oran park': { slug: 'camden', state: 'NSW' },
  'picton': { slug: 'wollondilly', state: 'NSW' }, 'tahmoor': { slug: 'wollondilly', state: 'NSW' },
  
  // VIC
  'melbourne': { slug: 'melbourne', state: 'VIC' }, 'carlton': { slug: 'melbourne', state: 'VIC' }, 'parkville': { slug: 'melbourne', state: 'VIC' },
  'southbank': { slug: 'melbourne', state: 'VIC' }, 'docklands': { slug: 'melbourne', state: 'VIC' }, 'south yarra': { slug: 'stonnington', state: 'VIC' },
  'clayton': { slug: 'monash', state: 'VIC' }, 'caulfield': { slug: 'glen-eira', state: 'VIC' }, 'hawthorn': { slug: 'boroondara', state: 'VIC' },
  'bundoora': { slug: 'darebin', state: 'VIC' }, 'preston': { slug: 'darebin', state: 'VIC' }, 'brunswick': { slug: 'merri-bek', state: 'VIC' },
  'coburg': { slug: 'merri-bek', state: 'VIC' }, 'fitzroy': { slug: 'yarra', state: 'VIC' }, 'richmond (vic)': { slug: 'yarra', state: 'VIC' },
  'footscray': { slug: 'maribyrnong', state: 'VIC' }, 'burwood (vic)': { slug: 'whitehorse', state: 'VIC' }, 'box hill': { slug: 'whitehorse', state: 'VIC' },
  'geelong': { slug: 'greater-geelong', state: 'VIC' }, 'waurn ponds': { slug: 'greater-geelong', state: 'VIC' }, 'ballarat': { slug: 'ballarat', state: 'VIC' },
  'bendigo': { slug: 'greater-bendigo', state: 'VIC' },
  
  // QLD
  'brisbane': { slug: 'brisbane-city-council', state: 'QLD' }, 'brisbane city': { slug: 'brisbane-city-council', state: 'QLD' },
  'st lucia': { slug: 'brisbane-city-council', state: 'QLD' }, 'kelvin grove': { slug: 'brisbane-city-council', state: 'QLD' },
  'toowong': { slug: 'brisbane-city-council', state: 'QLD' }, 'south brisbane': { slug: 'brisbane-city-council', state: 'QLD' },
  'indooroopilly': { slug: 'brisbane-city-council', state: 'QLD' }, 'mount gravatt': { slug: 'brisbane-city-council', state: 'QLD' },
  'gold coast': { slug: 'gold-coast-city-council', state: 'QLD' }, 'southport': { slug: 'gold-coast-city-council', state: 'QLD' },
  'surfers paradise': { slug: 'gold-coast-city-council', state: 'QLD' }, 'robina': { slug: 'gold-coast-city-council', state: 'QLD' },
  'townsville': { slug: 'townsville-city-council', state: 'QLD' }, 'cairns': { slug: 'cairns-regional-council', state: 'QLD' },
  'toowoomba': { slug: 'toowoomba-regional-council', state: 'QLD' }, 'sunshine coast': { slug: 'sunshine-coast-regional-council', state: 'QLD' },
  
  // WA (Police Districts)
  'perth': { slug: 'perth', state: 'WA' }, 'crawley': { slug: 'perth', state: 'WA' }, 'nedlands': { slug: 'perth', state: 'WA' },
  'bentley': { slug: 'cannington', state: 'WA' }, 'cannington': { slug: 'cannington', state: 'WA' },
  'joondalup': { slug: 'joondalup', state: 'WA' }, 'fremantle': { slug: 'fremantle', state: 'WA' },
  'murdoch': { slug: 'fremantle', state: 'WA' }, 'midland': { slug: 'midland', state: 'WA' },
  'mirrabooka': { slug: 'mirrabooka', state: 'WA' }, 'mandurah': { slug: 'mandurah', state: 'WA' },
  'armadale': { slug: 'armadale', state: 'WA' },

  // NT (SA2)
  'darwin': { slug: 'darwin-city', state: 'NT' }, 'darwin city': { slug: 'darwin-city', state: 'NT' },
  'palmerston': { slug: 'palmerston', state: 'NT' }, 'alice springs': { slug: 'alice-springs', state: 'NT' },
  'katherine': { slug: 'katherine', state: 'NT' }, 'nhulunbuy': { slug: 'nhulunbuy', state: 'NT' },
  'tennant creek': { slug: 'tennant-creek', state: 'NT' }, 'casuarina': { slug: 'palmerston', state: 'NT' },
  
  // TAS (Statewide)
  'hobart': { slug: 'tasmania', state: 'TAS' }, 'launceston': { slug: 'tasmania', state: 'TAS' },
  'devonport': { slug: 'tasmania', state: 'TAS' }, 'burnie': { slug: 'tasmania', state: 'TAS' },
  'sandy bay': { slug: 'tasmania', state: 'TAS' }, 'invermay': { slug: 'tasmania', state: 'TAS' }
};

const crimeBySlugAndState = new Map<string, GenericCrimeRecord>();

for (const record of nswCrimeData) {
  crimeBySlugAndState.set(`NSW_${record.lga_slug}`, normalizeRecord(record));
}
for (const record of qldCrimeData) {
  crimeBySlugAndState.set(`QLD_${record.lga_slug}`, normalizeRecord(record));
}
for (const record of vicCrimeData) {
  crimeBySlugAndState.set(`VIC_${record.lga_slug}`, normalizeRecord(record));
}
for (const record of waCrimeData) {
  crimeBySlugAndState.set(`WA_${record.district_slug}`, normalizeRecord(record));
}
for (const record of ntCrimeData) {
  crimeBySlugAndState.set(`NT_${record.sa2_slug}`, normalizeRecord(record));
}
crimeBySlugAndState.set(`TAS_tasmania`, normalizeRecord(tasCrimeData));

export type SuburbCrimeResult = 
  | { status: 'found'; data: GenericCrimeRecord }
  | { status: 'coming_soon'; state: string };

export function lookupCrimeForSuburb(suburbName: string, state: string): SuburbCrimeResult {
  const normSuburb = suburbName.toLowerCase().trim();
  
  if (!['NSW', 'QLD', 'VIC', 'WA', 'NT', 'TAS'].includes(state)) {
    return { status: 'coming_soon', state };
  }

  if (state === 'TAS') {
    const record = crimeBySlugAndState.get(`TAS_tasmania`);
    if (record) return { status: 'found', data: record };
  }
  
  let mapped = SUBURB_TO_SLUG[normSuburb];
  if (mapped && mapped.state === state) {
    const record = crimeBySlugAndState.get(`${state}_${mapped.slug}`);
    if (record) return { status: 'found', data: record };
  }

  if (normSuburb.endsWith(' cbd')) {
    const stripped = normSuburb.replace(/ cbd$/, '').trim();
    mapped = SUBURB_TO_SLUG[stripped];
    if (mapped && mapped.state === state) {
      const record = crimeBySlugAndState.get(`${state}_${mapped.slug}`);
      if (record) return { status: 'found', data: record };
    }
  }
  
  // Fallback to fuzzy match over datasets
  const allData = state === 'NSW' ? nswCrimeData : state === 'QLD' ? qldCrimeData : state === 'VIC' ? vicCrimeData : state === 'WA' ? waCrimeData : state === 'NT' ? ntCrimeData : [];
  const searchNames = [normSuburb];
  if (normSuburb.endsWith(' cbd')) {
    searchNames.push(normSuburb.replace(/ cbd$/, '').trim());
  }

  for (const rawRecord of allData) {
    const name = ('lga' in rawRecord ? rawRecord.lga : 'district' in rawRecord ? rawRecord.district : 'sa2' in rawRecord ? rawRecord.sa2 : '').toLowerCase();
    if (!name) continue;
    
    const slug = ('lga_slug' in rawRecord ? rawRecord.lga_slug : 'district_slug' in rawRecord ? rawRecord.district_slug : 'sa2_slug' in rawRecord ? rawRecord.sa2_slug : '');
    
    for (const searchName of searchNames) {
      if (name === searchName || name === searchName + ' city' || searchName.includes(name + ' council') || searchName.includes('council of ' + name) || searchName.includes(name + ' police district')) {
         const record = crimeBySlugAndState.get(`${state}_${slug}`);
         if (record) return { status: 'found', data: record };
      }
    }
  }
  
  return { status: 'coming_soon', state };
}

export function lookupCrimeFromAddress(displayName: string): GenericCrimeRecord | null {
  const lower = displayName.toLowerCase();
  
  // Check which state this address is in
  let state = '';
  if (lower.includes('new south wales') || lower.includes(', nsw')) state = 'NSW';
  else if (lower.includes('queensland') || lower.includes(', qld')) state = 'QLD';
  else if (lower.includes('victoria') || lower.includes(', vic')) state = 'VIC';
  else if (lower.includes('western australia') || lower.includes(', wa')) state = 'WA';
  else if (lower.includes('northern territory') || lower.includes(', nt')) state = 'NT';
  else if (lower.includes('tasmania') || lower.includes(', tas')) state = 'TAS';
  
  if (!state) return null;

  if (state === 'TAS') {
    return crimeBySlugAndState.get(`TAS_tasmania`) ?? null;
  }

  const parts = displayName.split(',').map(p => p.trim());
  if (parts.length > 0) {
    const firstPart = parts[0].toLowerCase().trim();
    let mapped = SUBURB_TO_SLUG[firstPart];
    if (mapped && mapped.state === state) {
      const record = crimeBySlugAndState.get(`${state}_${mapped.slug}`);
      if (record) return record;
    }

    if (firstPart.endsWith(' cbd')) {
      const stripped = firstPart.replace(/ cbd$/, '').trim();
      mapped = SUBURB_TO_SLUG[stripped];
      if (mapped && mapped.state === state) {
        const record = crimeBySlugAndState.get(`${state}_${mapped.slug}`);
        if (record) return record;
      }
    }
  }

  // Fallback to fuzzy matches over datasets
  const allData = state === 'NSW' ? nswCrimeData : state === 'QLD' ? qldCrimeData : state === 'VIC' ? vicCrimeData : state === 'WA' ? waCrimeData : state === 'NT' ? ntCrimeData : [];
  for (const rawRecord of allData) {
    const name = ('lga' in rawRecord ? rawRecord.lga : 'district' in rawRecord ? rawRecord.district : 'sa2' in rawRecord ? rawRecord.sa2 : '').toLowerCase();
    if (!name) continue;
    
    const slug = ('lga_slug' in rawRecord ? rawRecord.lga_slug : 'district_slug' in rawRecord ? rawRecord.district_slug : 'sa2_slug' in rawRecord ? rawRecord.sa2_slug : '');
    
    if (lower.includes(name + ' council') || lower.includes('council of ' + name) || lower.includes(name + ' police district')) {
      return crimeBySlugAndState.get(`${state}_${slug}`) ?? null;
    }
    for (const part of parts) {
      const p = part.trim().toLowerCase();
      if (p === name || p === name + ' city') {
        return crimeBySlugAndState.get(`${state}_${slug}`) ?? null;
      }
      
      if (p.endsWith(' cbd')) {
        const pStrip = p.replace(/ cbd$/, '').trim();
        if (pStrip === name || pStrip === name + ' city') {
          return crimeBySlugAndState.get(`${state}_${slug}`) ?? null;
        }
      }
    }
  }

  return null;
}

export function getCautionStyle(band: string): { bg: string; border: string; text: string; label: string; dotColor: string } {
  switch (band) {
    case 'Low':
      return { bg: 'bg-[#F0FDF4]', border: 'border-[#BBF7D0]', text: 'text-[#166534]', label: 'Lower relative caution', dotColor: '#16A34A' };
    case 'Medium':
      return { bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', text: 'text-[#92400E]', label: 'Moderate relative caution', dotColor: '#D97706' };
    case 'High':
      return { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#991B1B]', label: 'Higher relative caution', dotColor: '#DC2626' };
    default:
      return { bg: 'bg-[#F8FAFC]', border: 'border-[#E2E8F0]', text: 'text-[#64748B]', label: band, dotColor: '#94A3B8' };
  }
}
