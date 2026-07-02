export interface PoliceUpdateChannel {
  id: string;
  label: string;
  title: string;
  description: string;
  url: string;
}

export interface StatePoliceConfig {
  stateCode: string;
  stateName: string;
  accountHandle: string;
  accountUrl: string;
  accountLabel: string;
  channels: PoliceUpdateChannel[];
}

export const universityStateMap: Record<string, string> = {};

const AFP_CONFIG: StatePoliceConfig = {
  stateCode: 'AUS',
  stateName: 'Australia',
  accountHandle: 'afpnews',
  accountUrl: 'https://www.afp.gov.au/news-centre',
  accountLabel: 'AFP News Centre',
  channels: [
    {
      id: 'x-feed',
      label: 'Latest updates',
      title: 'Australian Federal Police News Centre',
      description: 'National AFP safety alerts, media releases, and federal crime updates.',
      url: 'https://www.afp.gov.au/news-centre',
    },
    {
      id: 'news',
      label: 'News Centre',
      title: 'AFP official news centre',
      description: 'Official AFP announcements, investigations, and public safety updates.',
      url: 'https://www.afp.gov.au/news-centre',
    },
    {
      id: 'report',
      label: 'Report crime',
      title: 'Report crime to the AFP',
      description: 'Official AFP reporting channels for federal crimes and suspicious activity.',
      url: 'https://www.afp.gov.au/report-crime',
    },
  ],
};

export function normalizeAustralianState(_value: string | null | undefined) {
  return AFP_CONFIG.stateCode;
}

export function getPoliceConfigForState(_value: string | null | undefined) {
  return AFP_CONFIG;
}
