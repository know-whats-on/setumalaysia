export type WolliSuburbStatsMode = 'all' | 'locals' | 'internationals';

export type WolliCountryMix = {
  country: string;
  count: number;
};

export type WolliSuburbStats = {
  slug: string;
  name: string;
  totals: Record<WolliSuburbStatsMode, number>;
  mixes: Record<WolliSuburbStatsMode, WolliCountryMix[]>;
};

export const WOLLI_DEFAULT_SUBURB_STATS_SLUG = 'wolli-creek';

export const WOLLI_SUBURB_STATS_MODES: Array<{
  id: WolliSuburbStatsMode;
  label: string;
  countLabel: string;
}> = [
  { id: 'all', label: 'All Residents', countLabel: 'Total' },
  { id: 'locals', label: 'Locals', countLabel: 'Locals' },
  { id: 'internationals', label: 'Internationals', countLabel: 'Internationals' },
];

export const WOLLI_SUBURB_STATS: WolliSuburbStats[] = [
  {
    "slug": "arncliffe",
    "name": "Arncliffe",
    "totals": {
      "all": 5518,
      "locals": 3081,
      "internationals": 2437
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 706
        },
        {
          "country": "Lebanon",
          "count": 680
        },
        {
          "country": "Mongolia",
          "count": 362
        },
        {
          "country": "North Macedonia",
          "count": 346
        },
        {
          "country": "Philippines",
          "count": 248
        },
        {
          "country": "Colombia",
          "count": 244
        },
        {
          "country": "Vietnam",
          "count": 190
        },
        {
          "country": "Brazil",
          "count": 172
        },
        {
          "country": "New Zealand",
          "count": 171
        },
        {
          "country": "England",
          "count": 154
        },
        {
          "country": "Indonesia",
          "count": 145
        },
        {
          "country": "Greece",
          "count": 135
        },
        {
          "country": "India",
          "count": 127
        },
        {
          "country": "Nepal",
          "count": 124
        },
        {
          "country": "Italy",
          "count": 119
        },
        {
          "country": "Malaysia",
          "count": 105
        },
        {
          "country": "Thailand",
          "count": 105
        },
        {
          "country": "Bangladesh",
          "count": 103
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 83
        },
        {
          "country": "United States of America",
          "count": 61
        },
        {
          "country": "Ireland",
          "count": 50
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 46
        },
        {
          "country": "Singapore",
          "count": 46
        },
        {
          "country": "Egypt",
          "count": 42
        },
        {
          "country": "Iran",
          "count": 39
        },
        {
          "country": "Pakistan",
          "count": 39
        },
        {
          "country": "Japan",
          "count": 37
        },
        {
          "country": "Chile",
          "count": 36
        },
        {
          "country": "Germany",
          "count": 36
        },
        {
          "country": "Portugal",
          "count": 31
        },
        {
          "country": "Taiwan",
          "count": 28
        },
        {
          "country": "Scotland",
          "count": 27
        },
        {
          "country": "Croatia",
          "count": 26
        },
        {
          "country": "France",
          "count": 25
        },
        {
          "country": "Poland",
          "count": 25
        },
        {
          "country": "Cyprus",
          "count": 24
        },
        {
          "country": "South Africa",
          "count": 24
        },
        {
          "country": "Turkey",
          "count": 23
        },
        {
          "country": "Malta",
          "count": 22
        },
        {
          "country": "Mexico",
          "count": 22
        },
        {
          "country": "Mauritius",
          "count": 21
        },
        {
          "country": "Canada",
          "count": 20
        },
        {
          "country": "Hungary",
          "count": 20
        },
        {
          "country": "Argentina",
          "count": 19
        },
        {
          "country": "Kuwait",
          "count": 19
        },
        {
          "country": "Peru",
          "count": 19
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 18
        },
        {
          "country": "Russian Federation",
          "count": 18
        },
        {
          "country": "Venezuela",
          "count": 15
        },
        {
          "country": "Iraq",
          "count": 14
        },
        {
          "country": "Saudi Arabia",
          "count": 14
        },
        {
          "country": "Serbia",
          "count": 14
        },
        {
          "country": "Sri Lanka",
          "count": 12
        },
        {
          "country": "Ukraine",
          "count": 12
        },
        {
          "country": "Cambodia",
          "count": 11
        },
        {
          "country": "Czechia",
          "count": 11
        },
        {
          "country": "Myanmar",
          "count": 11
        },
        {
          "country": "Slovakia",
          "count": 11
        },
        {
          "country": "Ecuador",
          "count": 10
        },
        {
          "country": "Jordan",
          "count": 10
        },
        {
          "country": "Kazakhstan",
          "count": 9
        },
        {
          "country": "Netherlands",
          "count": 9
        },
        {
          "country": "Syria",
          "count": 9
        },
        {
          "country": "Ghana",
          "count": 8
        },
        {
          "country": "Macau (SAR of China)",
          "count": 7
        },
        {
          "country": "Spain",
          "count": 7
        },
        {
          "country": "Switzerland",
          "count": 7
        },
        {
          "country": "United Arab Emirates",
          "count": 7
        },
        {
          "country": "Uruguay",
          "count": 7
        },
        {
          "country": "Afghanistan",
          "count": 6
        },
        {
          "country": "Armenia",
          "count": 6
        },
        {
          "country": "Romania",
          "count": 6
        },
        {
          "country": "Uzbekistan",
          "count": 6
        },
        {
          "country": "Wales",
          "count": 6
        },
        {
          "country": "Denmark",
          "count": 5
        },
        {
          "country": "Northern Ireland",
          "count": 5
        },
        {
          "country": "Sudan",
          "count": 5
        },
        {
          "country": "Georgia",
          "count": 4
        },
        {
          "country": "Morocco",
          "count": 4
        },
        {
          "country": "Slovenia",
          "count": 4
        },
        {
          "country": "Timor-Leste",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Zimbabwe",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Lebanon",
          "count": 635
        },
        {
          "country": "North Macedonia",
          "count": 334
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 326
        },
        {
          "country": "Philippines",
          "count": 146
        },
        {
          "country": "Greece",
          "count": 126
        },
        {
          "country": "Vietnam",
          "count": 108
        },
        {
          "country": "England",
          "count": 100
        },
        {
          "country": "Italy",
          "count": 84
        },
        {
          "country": "India",
          "count": 64
        },
        {
          "country": "Bangladesh",
          "count": 55
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 54
        },
        {
          "country": "Thailand",
          "count": 54
        },
        {
          "country": "New Zealand",
          "count": 52
        },
        {
          "country": "Malaysia",
          "count": 46
        },
        {
          "country": "Indonesia",
          "count": 45
        },
        {
          "country": "United States of America",
          "count": 41
        },
        {
          "country": "Colombia",
          "count": 39
        },
        {
          "country": "Nepal",
          "count": 39
        },
        {
          "country": "Egypt",
          "count": 38
        },
        {
          "country": "Ireland",
          "count": 30
        },
        {
          "country": "Iran",
          "count": 29
        },
        {
          "country": "Portugal",
          "count": 28
        },
        {
          "country": "Chile",
          "count": 27
        },
        {
          "country": "Croatia",
          "count": 26
        },
        {
          "country": "Malta",
          "count": 22
        },
        {
          "country": "Cyprus",
          "count": 21
        },
        {
          "country": "Singapore",
          "count": 21
        },
        {
          "country": "Scotland",
          "count": 19
        },
        {
          "country": "South Africa",
          "count": 19
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 18
        },
        {
          "country": "Turkey",
          "count": 17
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 16
        },
        {
          "country": "Kuwait",
          "count": 16
        },
        {
          "country": "Mauritius",
          "count": 16
        },
        {
          "country": "Pakistan",
          "count": 16
        },
        {
          "country": "Poland",
          "count": 16
        },
        {
          "country": "Argentina",
          "count": 14
        },
        {
          "country": "France",
          "count": 14
        },
        {
          "country": "Serbia",
          "count": 14
        },
        {
          "country": "Germany",
          "count": 13
        },
        {
          "country": "Hungary",
          "count": 13
        },
        {
          "country": "Taiwan",
          "count": 12
        },
        {
          "country": "Brazil",
          "count": 11
        },
        {
          "country": "Canada",
          "count": 11
        },
        {
          "country": "Iraq",
          "count": 11
        },
        {
          "country": "Myanmar",
          "count": 11
        },
        {
          "country": "Russian Federation",
          "count": 11
        },
        {
          "country": "Venezuela",
          "count": 11
        },
        {
          "country": "Netherlands",
          "count": 9
        },
        {
          "country": "Ghana",
          "count": 8
        },
        {
          "country": "Peru",
          "count": 8
        },
        {
          "country": "Macau (SAR of China)",
          "count": 7
        },
        {
          "country": "Switzerland",
          "count": 7
        },
        {
          "country": "Ukraine",
          "count": 7
        },
        {
          "country": "Uruguay",
          "count": 7
        },
        {
          "country": "Afghanistan",
          "count": 6
        },
        {
          "country": "Kazakhstan",
          "count": 6
        },
        {
          "country": "Mexico",
          "count": 6
        },
        {
          "country": "Romania",
          "count": 6
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Ecuador",
          "count": 5
        },
        {
          "country": "Jordan",
          "count": 5
        },
        {
          "country": "Sudan",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "Japan",
          "count": 4
        },
        {
          "country": "Mongolia",
          "count": 4
        },
        {
          "country": "Morocco",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Slovenia",
          "count": 4
        },
        {
          "country": "Sri Lanka",
          "count": 4
        },
        {
          "country": "Timor-Leste",
          "count": 4
        },
        {
          "country": "United Arab Emirates",
          "count": 4
        },
        {
          "country": "Armenia",
          "count": 3
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Cambodia",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        },
        {
          "country": "Zimbabwe",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 380
        },
        {
          "country": "Mongolia",
          "count": 358
        },
        {
          "country": "Colombia",
          "count": 205
        },
        {
          "country": "Brazil",
          "count": 161
        },
        {
          "country": "New Zealand",
          "count": 119
        },
        {
          "country": "Philippines",
          "count": 102
        },
        {
          "country": "Indonesia",
          "count": 100
        },
        {
          "country": "Nepal",
          "count": 85
        },
        {
          "country": "Vietnam",
          "count": 82
        },
        {
          "country": "India",
          "count": 63
        },
        {
          "country": "Malaysia",
          "count": 59
        },
        {
          "country": "England",
          "count": 54
        },
        {
          "country": "Thailand",
          "count": 51
        },
        {
          "country": "Bangladesh",
          "count": 48
        },
        {
          "country": "Lebanon",
          "count": 45
        },
        {
          "country": "Italy",
          "count": 35
        },
        {
          "country": "Japan",
          "count": 33
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 30
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 29
        },
        {
          "country": "Singapore",
          "count": 25
        },
        {
          "country": "Germany",
          "count": 23
        },
        {
          "country": "Pakistan",
          "count": 23
        },
        {
          "country": "Ireland",
          "count": 20
        },
        {
          "country": "United States of America",
          "count": 20
        },
        {
          "country": "Mexico",
          "count": 16
        },
        {
          "country": "Taiwan",
          "count": 16
        },
        {
          "country": "North Macedonia",
          "count": 12
        },
        {
          "country": "France",
          "count": 11
        },
        {
          "country": "Peru",
          "count": 11
        },
        {
          "country": "Iran",
          "count": 10
        },
        {
          "country": "Saudi Arabia",
          "count": 10
        },
        {
          "country": "Canada",
          "count": 9
        },
        {
          "country": "Chile",
          "count": 9
        },
        {
          "country": "Greece",
          "count": 9
        },
        {
          "country": "Poland",
          "count": 9
        },
        {
          "country": "Cambodia",
          "count": 8
        },
        {
          "country": "Scotland",
          "count": 8
        },
        {
          "country": "Slovakia",
          "count": 8
        },
        {
          "country": "Sri Lanka",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Russian Federation",
          "count": 7
        },
        {
          "country": "Czechia",
          "count": 6
        },
        {
          "country": "Turkey",
          "count": 6
        },
        {
          "country": "Uzbekistan",
          "count": 6
        },
        {
          "country": "Argentina",
          "count": 5
        },
        {
          "country": "Denmark",
          "count": 5
        },
        {
          "country": "Ecuador",
          "count": 5
        },
        {
          "country": "Jordan",
          "count": 5
        },
        {
          "country": "Mauritius",
          "count": 5
        },
        {
          "country": "Northern Ireland",
          "count": 5
        },
        {
          "country": "South Africa",
          "count": 5
        },
        {
          "country": "Ukraine",
          "count": 5
        },
        {
          "country": "Egypt",
          "count": 4
        },
        {
          "country": "Georgia",
          "count": 4
        },
        {
          "country": "Spain",
          "count": 4
        },
        {
          "country": "Syria",
          "count": 4
        },
        {
          "country": "Venezuela",
          "count": 4
        },
        {
          "country": "Armenia",
          "count": 3
        },
        {
          "country": "Cyprus",
          "count": 3
        },
        {
          "country": "Iraq",
          "count": 3
        },
        {
          "country": "Kazakhstan",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Kuwait",
          "count": 3
        },
        {
          "country": "Portugal",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "banksia",
    "name": "Banksia",
    "totals": {
      "all": 1358,
      "locals": 1003,
      "internationals": 355
    },
    "mixes": {
      "all": [
        {
          "country": "North Macedonia",
          "count": 203
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 116
        },
        {
          "country": "Lebanon",
          "count": 99
        },
        {
          "country": "Philippines",
          "count": 81
        },
        {
          "country": "England",
          "count": 64
        },
        {
          "country": "Greece",
          "count": 58
        },
        {
          "country": "New Zealand",
          "count": 54
        },
        {
          "country": "Vietnam",
          "count": 52
        },
        {
          "country": "Nepal",
          "count": 51
        },
        {
          "country": "Indonesia",
          "count": 47
        },
        {
          "country": "Bangladesh",
          "count": 45
        },
        {
          "country": "Thailand",
          "count": 44
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 36
        },
        {
          "country": "India",
          "count": 33
        },
        {
          "country": "Italy",
          "count": 24
        },
        {
          "country": "Ireland",
          "count": 23
        },
        {
          "country": "Malta",
          "count": 20
        },
        {
          "country": "Pakistan",
          "count": 20
        },
        {
          "country": "Japan",
          "count": 18
        },
        {
          "country": "Portugal",
          "count": 18
        },
        {
          "country": "Chile",
          "count": 16
        },
        {
          "country": "Egypt",
          "count": 16
        },
        {
          "country": "Colombia",
          "count": 15
        },
        {
          "country": "Brazil",
          "count": 14
        },
        {
          "country": "Serbia",
          "count": 14
        },
        {
          "country": "Malaysia",
          "count": 12
        },
        {
          "country": "South Africa",
          "count": 11
        },
        {
          "country": "Uruguay",
          "count": 11
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 10
        },
        {
          "country": "United States of America",
          "count": 10
        },
        {
          "country": "Peru",
          "count": 7
        },
        {
          "country": "Cyprus",
          "count": 6
        },
        {
          "country": "Singapore",
          "count": 6
        },
        {
          "country": "Turkey",
          "count": 6
        },
        {
          "country": "Argentina",
          "count": 5
        },
        {
          "country": "Canada",
          "count": 5
        },
        {
          "country": "Iraq",
          "count": 5
        },
        {
          "country": "Israel",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 5
        },
        {
          "country": "Poland",
          "count": 5
        },
        {
          "country": "Taiwan",
          "count": 5
        },
        {
          "country": "Tunisia",
          "count": 5
        },
        {
          "country": "Ukraine",
          "count": 5
        },
        {
          "country": "Belgium",
          "count": 4
        },
        {
          "country": "France",
          "count": 4
        },
        {
          "country": "Germany",
          "count": 4
        },
        {
          "country": "Iran",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Myanmar",
          "count": 4
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 3
        },
        {
          "country": "Costa Rica",
          "count": 3
        },
        {
          "country": "Croatia",
          "count": 3
        },
        {
          "country": "Russian Federation",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        },
        {
          "country": "Syria",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "North Macedonia",
          "count": 203
        },
        {
          "country": "Lebanon",
          "count": 91
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 79
        },
        {
          "country": "Philippines",
          "count": 73
        },
        {
          "country": "Greece",
          "count": 52
        },
        {
          "country": "England",
          "count": 47
        },
        {
          "country": "Vietnam",
          "count": 47
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 36
        },
        {
          "country": "Indonesia",
          "count": 32
        },
        {
          "country": "New Zealand",
          "count": 23
        },
        {
          "country": "Bangladesh",
          "count": 22
        },
        {
          "country": "Malta",
          "count": 20
        },
        {
          "country": "Italy",
          "count": 18
        },
        {
          "country": "Egypt",
          "count": 16
        },
        {
          "country": "Portugal",
          "count": 15
        },
        {
          "country": "Ireland",
          "count": 13
        },
        {
          "country": "Thailand",
          "count": 13
        },
        {
          "country": "Chile",
          "count": 11
        },
        {
          "country": "India",
          "count": 11
        },
        {
          "country": "Pakistan",
          "count": 11
        },
        {
          "country": "Uruguay",
          "count": 11
        },
        {
          "country": "Serbia",
          "count": 10
        },
        {
          "country": "Malaysia",
          "count": 9
        },
        {
          "country": "Nepal",
          "count": 9
        },
        {
          "country": "South Africa",
          "count": 8
        },
        {
          "country": "Peru",
          "count": 7
        },
        {
          "country": "United States of America",
          "count": 7
        },
        {
          "country": "Cyprus",
          "count": 6
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 6
        },
        {
          "country": "Singapore",
          "count": 6
        },
        {
          "country": "Turkey",
          "count": 6
        },
        {
          "country": "Argentina",
          "count": 5
        },
        {
          "country": "Brazil",
          "count": 5
        },
        {
          "country": "Canada",
          "count": 5
        },
        {
          "country": "Colombia",
          "count": 5
        },
        {
          "country": "Iraq",
          "count": 5
        },
        {
          "country": "Israel",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 5
        },
        {
          "country": "Poland",
          "count": 5
        },
        {
          "country": "Taiwan",
          "count": 5
        },
        {
          "country": "Tunisia",
          "count": 5
        },
        {
          "country": "Ukraine",
          "count": 5
        },
        {
          "country": "Belgium",
          "count": 4
        },
        {
          "country": "France",
          "count": 4
        },
        {
          "country": "Germany",
          "count": 4
        },
        {
          "country": "Iran",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Myanmar",
          "count": 4
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 3
        },
        {
          "country": "Croatia",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Nepal",
          "count": 42
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 37
        },
        {
          "country": "New Zealand",
          "count": 31
        },
        {
          "country": "Thailand",
          "count": 31
        },
        {
          "country": "Bangladesh",
          "count": 23
        },
        {
          "country": "India",
          "count": 22
        },
        {
          "country": "Japan",
          "count": 18
        },
        {
          "country": "England",
          "count": 17
        },
        {
          "country": "Indonesia",
          "count": 15
        },
        {
          "country": "Colombia",
          "count": 10
        },
        {
          "country": "Ireland",
          "count": 10
        },
        {
          "country": "Brazil",
          "count": 9
        },
        {
          "country": "Pakistan",
          "count": 9
        },
        {
          "country": "Lebanon",
          "count": 8
        },
        {
          "country": "Philippines",
          "count": 8
        },
        {
          "country": "Greece",
          "count": 6
        },
        {
          "country": "Italy",
          "count": 6
        },
        {
          "country": "Chile",
          "count": 5
        },
        {
          "country": "Vietnam",
          "count": 5
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 4
        },
        {
          "country": "Serbia",
          "count": 4
        },
        {
          "country": "Costa Rica",
          "count": 3
        },
        {
          "country": "Malaysia",
          "count": 3
        },
        {
          "country": "Portugal",
          "count": 3
        },
        {
          "country": "Russian Federation",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        },
        {
          "country": "Syria",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "banksmeadow",
    "name": "Banksmeadow",
    "totals": {
      "all": 245,
      "locals": 106,
      "internationals": 139
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 56
        },
        {
          "country": "Ireland",
          "count": 32
        },
        {
          "country": "New Zealand",
          "count": 18
        },
        {
          "country": "England",
          "count": 13
        },
        {
          "country": "Philippines",
          "count": 10
        },
        {
          "country": "Iran",
          "count": 8
        },
        {
          "country": "Malaysia",
          "count": 8
        },
        {
          "country": "Brazil",
          "count": 6
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 6
        },
        {
          "country": "Hungary",
          "count": 6
        },
        {
          "country": "South Africa",
          "count": 6
        },
        {
          "country": "Greece",
          "count": 4
        },
        {
          "country": "Poland",
          "count": 4
        },
        {
          "country": "Barbados",
          "count": 3
        },
        {
          "country": "Chile",
          "count": 3
        },
        {
          "country": "Egypt",
          "count": 3
        },
        {
          "country": "Germany",
          "count": 3
        },
        {
          "country": "Indonesia",
          "count": 3
        },
        {
          "country": "Israel",
          "count": 3
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 3
        },
        {
          "country": "Oman",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 17
        },
        {
          "country": "Ireland",
          "count": 11
        },
        {
          "country": "England",
          "count": 9
        },
        {
          "country": "Iran",
          "count": 8
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 6
        },
        {
          "country": "Hungary",
          "count": 6
        },
        {
          "country": "Philippines",
          "count": 6
        },
        {
          "country": "South Africa",
          "count": 6
        },
        {
          "country": "Greece",
          "count": 4
        },
        {
          "country": "New Zealand",
          "count": 4
        },
        {
          "country": "Poland",
          "count": 4
        },
        {
          "country": "Egypt",
          "count": 3
        },
        {
          "country": "Israel",
          "count": 3
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 3
        },
        {
          "country": "Malaysia",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 39
        },
        {
          "country": "Ireland",
          "count": 21
        },
        {
          "country": "New Zealand",
          "count": 14
        },
        {
          "country": "Brazil",
          "count": 6
        },
        {
          "country": "Malaysia",
          "count": 5
        },
        {
          "country": "England",
          "count": 4
        },
        {
          "country": "Philippines",
          "count": 4
        },
        {
          "country": "Barbados",
          "count": 3
        },
        {
          "country": "Chile",
          "count": 3
        },
        {
          "country": "Germany",
          "count": 3
        },
        {
          "country": "Indonesia",
          "count": 3
        },
        {
          "country": "Oman",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "bardwell-park",
    "name": "Bardwell Park",
    "totals": {
      "all": 735,
      "locals": 556,
      "internationals": 179
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 154
        },
        {
          "country": "Greece",
          "count": 116
        },
        {
          "country": "Vietnam",
          "count": 40
        },
        {
          "country": "England",
          "count": 32
        },
        {
          "country": "Lebanon",
          "count": 26
        },
        {
          "country": "Italy",
          "count": 24
        },
        {
          "country": "New Zealand",
          "count": 21
        },
        {
          "country": "Turkey",
          "count": 20
        },
        {
          "country": "Thailand",
          "count": 19
        },
        {
          "country": "Malaysia",
          "count": 17
        },
        {
          "country": "Ireland",
          "count": 15
        },
        {
          "country": "Egypt",
          "count": 12
        },
        {
          "country": "Philippines",
          "count": 12
        },
        {
          "country": "Singapore",
          "count": 12
        },
        {
          "country": "Brazil",
          "count": 11
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 11
        },
        {
          "country": "Indonesia",
          "count": 11
        },
        {
          "country": "Cyprus",
          "count": 9
        },
        {
          "country": "Colombia",
          "count": 8
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 8
        },
        {
          "country": "North Macedonia",
          "count": 8
        },
        {
          "country": "Portugal",
          "count": 8
        },
        {
          "country": "Serbia",
          "count": 8
        },
        {
          "country": "South Africa",
          "count": 8
        },
        {
          "country": "India",
          "count": 7
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 6
        },
        {
          "country": "Scotland",
          "count": 6
        },
        {
          "country": "Chile",
          "count": 5
        },
        {
          "country": "Croatia",
          "count": 5
        },
        {
          "country": "Germany",
          "count": 5
        },
        {
          "country": "Hungary",
          "count": 5
        },
        {
          "country": "Japan",
          "count": 5
        },
        {
          "country": "Malta",
          "count": 5
        },
        {
          "country": "Russian Federation",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "Nepal",
          "count": 4
        },
        {
          "country": "Netherlands",
          "count": 4
        },
        {
          "country": "Taiwan",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Macau (SAR of China)",
          "count": 3
        },
        {
          "country": "Poland",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        },
        {
          "country": "Sri Lanka",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 119
        },
        {
          "country": "Greece",
          "count": 113
        },
        {
          "country": "Vietnam",
          "count": 34
        },
        {
          "country": "England",
          "count": 26
        },
        {
          "country": "Lebanon",
          "count": 26
        },
        {
          "country": "Turkey",
          "count": 20
        },
        {
          "country": "Italy",
          "count": 16
        },
        {
          "country": "Egypt",
          "count": 12
        },
        {
          "country": "Philippines",
          "count": 12
        },
        {
          "country": "Cyprus",
          "count": 9
        },
        {
          "country": "Ireland",
          "count": 8
        },
        {
          "country": "North Macedonia",
          "count": 8
        },
        {
          "country": "Portugal",
          "count": 8
        },
        {
          "country": "Serbia",
          "count": 8
        },
        {
          "country": "South Africa",
          "count": 8
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 7
        },
        {
          "country": "India",
          "count": 7
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 6
        },
        {
          "country": "Thailand",
          "count": 6
        },
        {
          "country": "Chile",
          "count": 5
        },
        {
          "country": "Colombia",
          "count": 5
        },
        {
          "country": "Croatia",
          "count": 5
        },
        {
          "country": "Germany",
          "count": 5
        },
        {
          "country": "Hungary",
          "count": 5
        },
        {
          "country": "Indonesia",
          "count": 5
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 5
        },
        {
          "country": "Malaysia",
          "count": 5
        },
        {
          "country": "Malta",
          "count": 5
        },
        {
          "country": "Russian Federation",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "New Zealand",
          "count": 4
        },
        {
          "country": "Taiwan",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Macau (SAR of China)",
          "count": 3
        },
        {
          "country": "Poland",
          "count": 3
        },
        {
          "country": "Scotland",
          "count": 3
        },
        {
          "country": "Singapore",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 35
        },
        {
          "country": "New Zealand",
          "count": 17
        },
        {
          "country": "Thailand",
          "count": 13
        },
        {
          "country": "Malaysia",
          "count": 12
        },
        {
          "country": "Brazil",
          "count": 11
        },
        {
          "country": "Singapore",
          "count": 9
        },
        {
          "country": "Italy",
          "count": 8
        },
        {
          "country": "Ireland",
          "count": 7
        },
        {
          "country": "England",
          "count": 6
        },
        {
          "country": "Indonesia",
          "count": 6
        },
        {
          "country": "Vietnam",
          "count": 6
        },
        {
          "country": "Japan",
          "count": 5
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 4
        },
        {
          "country": "Nepal",
          "count": 4
        },
        {
          "country": "Netherlands",
          "count": 4
        },
        {
          "country": "Colombia",
          "count": 3
        },
        {
          "country": "Greece",
          "count": 3
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 3
        },
        {
          "country": "Scotland",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        },
        {
          "country": "Sri Lanka",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "bardwell-valley",
    "name": "Bardwell Valley",
    "totals": {
      "all": 752,
      "locals": 605,
      "internationals": 147
    },
    "mixes": {
      "all": [
        {
          "country": "Lebanon",
          "count": 134
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 74
        },
        {
          "country": "North Macedonia",
          "count": 61
        },
        {
          "country": "England",
          "count": 50
        },
        {
          "country": "New Zealand",
          "count": 49
        },
        {
          "country": "Greece",
          "count": 47
        },
        {
          "country": "Vietnam",
          "count": 27
        },
        {
          "country": "Malaysia",
          "count": 21
        },
        {
          "country": "Philippines",
          "count": 19
        },
        {
          "country": "Portugal",
          "count": 19
        },
        {
          "country": "Italy",
          "count": 18
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 16
        },
        {
          "country": "Egypt",
          "count": 14
        },
        {
          "country": "Ireland",
          "count": 14
        },
        {
          "country": "United States of America",
          "count": 12
        },
        {
          "country": "Indonesia",
          "count": 11
        },
        {
          "country": "Serbia",
          "count": 11
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 10
        },
        {
          "country": "Croatia",
          "count": 9
        },
        {
          "country": "Iraq",
          "count": 9
        },
        {
          "country": "Malta",
          "count": 9
        },
        {
          "country": "Cyprus",
          "count": 8
        },
        {
          "country": "India",
          "count": 8
        },
        {
          "country": "Uruguay",
          "count": 7
        },
        {
          "country": "Northern Ireland",
          "count": 6
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Hungary",
          "count": 5
        },
        {
          "country": "Peru",
          "count": 5
        },
        {
          "country": "Turkey",
          "count": 5
        },
        {
          "country": "Ukraine",
          "count": 5
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 4
        },
        {
          "country": "Brazil",
          "count": 4
        },
        {
          "country": "Russian Federation",
          "count": 4
        },
        {
          "country": "Singapore",
          "count": 4
        },
        {
          "country": "Sudan",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Bangladesh",
          "count": 3
        },
        {
          "country": "Scotland",
          "count": 3
        },
        {
          "country": "Thailand",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Lebanon",
          "count": 124
        },
        {
          "country": "North Macedonia",
          "count": 61
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 51
        },
        {
          "country": "Greece",
          "count": 47
        },
        {
          "country": "England",
          "count": 32
        },
        {
          "country": "Vietnam",
          "count": 22
        },
        {
          "country": "Italy",
          "count": 18
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 16
        },
        {
          "country": "Egypt",
          "count": 14
        },
        {
          "country": "Philippines",
          "count": 14
        },
        {
          "country": "Portugal",
          "count": 13
        },
        {
          "country": "Indonesia",
          "count": 11
        },
        {
          "country": "Malaysia",
          "count": 11
        },
        {
          "country": "New Zealand",
          "count": 11
        },
        {
          "country": "Serbia",
          "count": 11
        },
        {
          "country": "Croatia",
          "count": 9
        },
        {
          "country": "Iraq",
          "count": 9
        },
        {
          "country": "Ireland",
          "count": 9
        },
        {
          "country": "Malta",
          "count": 9
        },
        {
          "country": "Cyprus",
          "count": 8
        },
        {
          "country": "United States of America",
          "count": 8
        },
        {
          "country": "Uruguay",
          "count": 7
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 6
        },
        {
          "country": "Northern Ireland",
          "count": 6
        },
        {
          "country": "Hungary",
          "count": 5
        },
        {
          "country": "Peru",
          "count": 5
        },
        {
          "country": "Turkey",
          "count": 5
        },
        {
          "country": "Ukraine",
          "count": 5
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 4
        },
        {
          "country": "India",
          "count": 4
        },
        {
          "country": "Russian Federation",
          "count": 4
        },
        {
          "country": "Singapore",
          "count": 4
        },
        {
          "country": "Sudan",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Scotland",
          "count": 3
        },
        {
          "country": "Thailand",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "New Zealand",
          "count": 38
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 23
        },
        {
          "country": "England",
          "count": 18
        },
        {
          "country": "Lebanon",
          "count": 10
        },
        {
          "country": "Malaysia",
          "count": 10
        },
        {
          "country": "Portugal",
          "count": 6
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Ireland",
          "count": 5
        },
        {
          "country": "Philippines",
          "count": 5
        },
        {
          "country": "Vietnam",
          "count": 5
        },
        {
          "country": "Brazil",
          "count": 4
        },
        {
          "country": "India",
          "count": 4
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 4
        },
        {
          "country": "United States of America",
          "count": 4
        },
        {
          "country": "Bangladesh",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "bexley",
    "name": "Bexley",
    "totals": {
      "all": 8129,
      "locals": 6218,
      "internationals": 1911
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1300
        },
        {
          "country": "Lebanon",
          "count": 1030
        },
        {
          "country": "North Macedonia",
          "count": 714
        },
        {
          "country": "Greece",
          "count": 524
        },
        {
          "country": "Philippines",
          "count": 354
        },
        {
          "country": "Italy",
          "count": 317
        },
        {
          "country": "New Zealand",
          "count": 283
        },
        {
          "country": "Nepal",
          "count": 241
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 229
        },
        {
          "country": "England",
          "count": 226
        },
        {
          "country": "Bangladesh",
          "count": 224
        },
        {
          "country": "Egypt",
          "count": 220
        },
        {
          "country": "India",
          "count": 176
        },
        {
          "country": "Vietnam",
          "count": 165
        },
        {
          "country": "Indonesia",
          "count": 137
        },
        {
          "country": "Malaysia",
          "count": 95
        },
        {
          "country": "Portugal",
          "count": 90
        },
        {
          "country": "Brazil",
          "count": 89
        },
        {
          "country": "Thailand",
          "count": 79
        },
        {
          "country": "Cyprus",
          "count": 78
        },
        {
          "country": "Ireland",
          "count": 77
        },
        {
          "country": "Croatia",
          "count": 74
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 60
        },
        {
          "country": "Serbia",
          "count": 59
        },
        {
          "country": "Colombia",
          "count": 58
        },
        {
          "country": "Chile",
          "count": 56
        },
        {
          "country": "Malta",
          "count": 52
        },
        {
          "country": "South Africa",
          "count": 50
        },
        {
          "country": "Taiwan",
          "count": 47
        },
        {
          "country": "Iraq",
          "count": 45
        },
        {
          "country": "Scotland",
          "count": 44
        },
        {
          "country": "Peru",
          "count": 43
        },
        {
          "country": "United States of America",
          "count": 40
        },
        {
          "country": "Singapore",
          "count": 36
        },
        {
          "country": "Turkey",
          "count": 35
        },
        {
          "country": "Iran",
          "count": 33
        },
        {
          "country": "Poland",
          "count": 33
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 32
        },
        {
          "country": "Germany",
          "count": 32
        },
        {
          "country": "Japan",
          "count": 32
        },
        {
          "country": "Pakistan",
          "count": 32
        },
        {
          "country": "Argentina",
          "count": 29
        },
        {
          "country": "Ecuador",
          "count": 29
        },
        {
          "country": "Hungary",
          "count": 29
        },
        {
          "country": "Uruguay",
          "count": 27
        },
        {
          "country": "France",
          "count": 25
        },
        {
          "country": "Kuwait",
          "count": 25
        },
        {
          "country": "Mauritius",
          "count": 24
        },
        {
          "country": "Sri Lanka",
          "count": 24
        },
        {
          "country": "Spain",
          "count": 23
        },
        {
          "country": "Russian Federation",
          "count": 22
        },
        {
          "country": "Ukraine",
          "count": 22
        },
        {
          "country": "Netherlands",
          "count": 17
        },
        {
          "country": "Saudi Arabia",
          "count": 16
        },
        {
          "country": "Mongolia",
          "count": 15
        },
        {
          "country": "Canada",
          "count": 14
        },
        {
          "country": "Sudan",
          "count": 14
        },
        {
          "country": "Zimbabwe",
          "count": 14
        },
        {
          "country": "Cambodia",
          "count": 12
        },
        {
          "country": "Timor-Leste",
          "count": 12
        },
        {
          "country": "El Salvador",
          "count": 11
        },
        {
          "country": "Jordan",
          "count": 11
        },
        {
          "country": "Myanmar",
          "count": 10
        },
        {
          "country": "Northern Ireland",
          "count": 10
        },
        {
          "country": "Romania",
          "count": 9
        },
        {
          "country": "Wales",
          "count": 9
        },
        {
          "country": "Estonia",
          "count": 8
        },
        {
          "country": "Mexico",
          "count": 8
        },
        {
          "country": "Slovenia",
          "count": 8
        },
        {
          "country": "Uganda",
          "count": 8
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 7
        },
        {
          "country": "Sweden",
          "count": 7
        },
        {
          "country": "Venezuela",
          "count": 7
        },
        {
          "country": "Kenya",
          "count": 6
        },
        {
          "country": "Laos",
          "count": 6
        },
        {
          "country": "Macau (SAR of China)",
          "count": 6
        },
        {
          "country": "Cote d'Ivoire",
          "count": 5
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Nigeria",
          "count": 5
        },
        {
          "country": "Slovakia",
          "count": 5
        },
        {
          "country": "Switzerland",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "Afghanistan",
          "count": 4
        },
        {
          "country": "Belgium",
          "count": 4
        },
        {
          "country": "Denmark",
          "count": 4
        },
        {
          "country": "Eswatini",
          "count": 4
        },
        {
          "country": "Finland",
          "count": 4
        },
        {
          "country": "Montenegro",
          "count": 4
        },
        {
          "country": "Sierra Leone",
          "count": 4
        },
        {
          "country": "Tanzania",
          "count": 4
        },
        {
          "country": "Algeria",
          "count": 3
        },
        {
          "country": "Bulgaria",
          "count": 3
        },
        {
          "country": "Georgia",
          "count": 3
        },
        {
          "country": "Libya",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        },
        {
          "country": "Uzbekistan",
          "count": 3
        },
        {
          "country": "Zambia",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Lebanon",
          "count": 937
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 869
        },
        {
          "country": "North Macedonia",
          "count": 691
        },
        {
          "country": "Greece",
          "count": 513
        },
        {
          "country": "Italy",
          "count": 266
        },
        {
          "country": "Philippines",
          "count": 256
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 212
        },
        {
          "country": "Egypt",
          "count": 203
        },
        {
          "country": "England",
          "count": 163
        },
        {
          "country": "Vietnam",
          "count": 142
        },
        {
          "country": "Bangladesh",
          "count": 140
        },
        {
          "country": "India",
          "count": 114
        },
        {
          "country": "New Zealand",
          "count": 97
        },
        {
          "country": "Indonesia",
          "count": 85
        },
        {
          "country": "Portugal",
          "count": 78
        },
        {
          "country": "Cyprus",
          "count": 74
        },
        {
          "country": "Croatia",
          "count": 70
        },
        {
          "country": "Malaysia",
          "count": 61
        },
        {
          "country": "Thailand",
          "count": 57
        },
        {
          "country": "Nepal",
          "count": 56
        },
        {
          "country": "Serbia",
          "count": 55
        },
        {
          "country": "Ireland",
          "count": 48
        },
        {
          "country": "Malta",
          "count": 47
        },
        {
          "country": "Chile",
          "count": 44
        },
        {
          "country": "Iraq",
          "count": 41
        },
        {
          "country": "South Africa",
          "count": 39
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 35
        },
        {
          "country": "Taiwan",
          "count": 33
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 32
        },
        {
          "country": "Brazil",
          "count": 31
        },
        {
          "country": "Scotland",
          "count": 31
        },
        {
          "country": "Turkey",
          "count": 31
        },
        {
          "country": "Hungary",
          "count": 29
        },
        {
          "country": "Peru",
          "count": 28
        },
        {
          "country": "Singapore",
          "count": 27
        },
        {
          "country": "Uruguay",
          "count": 27
        },
        {
          "country": "Argentina",
          "count": 26
        },
        {
          "country": "Ecuador",
          "count": 26
        },
        {
          "country": "Kuwait",
          "count": 25
        },
        {
          "country": "Germany",
          "count": 24
        },
        {
          "country": "United States of America",
          "count": 24
        },
        {
          "country": "Ukraine",
          "count": 22
        },
        {
          "country": "Iran",
          "count": 21
        },
        {
          "country": "Poland",
          "count": 20
        },
        {
          "country": "Colombia",
          "count": 17
        },
        {
          "country": "Russian Federation",
          "count": 16
        },
        {
          "country": "Spain",
          "count": 16
        },
        {
          "country": "France",
          "count": 15
        },
        {
          "country": "Mauritius",
          "count": 15
        },
        {
          "country": "Pakistan",
          "count": 15
        },
        {
          "country": "Sri Lanka",
          "count": 15
        },
        {
          "country": "Canada",
          "count": 14
        },
        {
          "country": "Netherlands",
          "count": 14
        },
        {
          "country": "Sudan",
          "count": 14
        },
        {
          "country": "Saudi Arabia",
          "count": 12
        },
        {
          "country": "Timor-Leste",
          "count": 12
        },
        {
          "country": "El Salvador",
          "count": 11
        },
        {
          "country": "Northern Ireland",
          "count": 10
        },
        {
          "country": "Zimbabwe",
          "count": 10
        },
        {
          "country": "Romania",
          "count": 9
        },
        {
          "country": "Jordan",
          "count": 8
        },
        {
          "country": "Slovenia",
          "count": 8
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 7
        },
        {
          "country": "Cambodia",
          "count": 6
        },
        {
          "country": "Kenya",
          "count": 6
        },
        {
          "country": "Laos",
          "count": 6
        },
        {
          "country": "Macau (SAR of China)",
          "count": 6
        },
        {
          "country": "Myanmar",
          "count": 6
        },
        {
          "country": "Cote d'Ivoire",
          "count": 5
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Japan",
          "count": 5
        },
        {
          "country": "Mexico",
          "count": 5
        },
        {
          "country": "Nigeria",
          "count": 5
        },
        {
          "country": "Slovakia",
          "count": 5
        },
        {
          "country": "Switzerland",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "Wales",
          "count": 5
        },
        {
          "country": "Afghanistan",
          "count": 4
        },
        {
          "country": "Belgium",
          "count": 4
        },
        {
          "country": "Eswatini",
          "count": 4
        },
        {
          "country": "Finland",
          "count": 4
        },
        {
          "country": "Montenegro",
          "count": 4
        },
        {
          "country": "Sierra Leone",
          "count": 4
        },
        {
          "country": "Tanzania",
          "count": 4
        },
        {
          "country": "Uganda",
          "count": 4
        },
        {
          "country": "Venezuela",
          "count": 4
        },
        {
          "country": "Algeria",
          "count": 3
        },
        {
          "country": "Bulgaria",
          "count": 3
        },
        {
          "country": "Georgia",
          "count": 3
        },
        {
          "country": "Libya",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        },
        {
          "country": "Uzbekistan",
          "count": 3
        },
        {
          "country": "Zambia",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 431
        },
        {
          "country": "New Zealand",
          "count": 186
        },
        {
          "country": "Nepal",
          "count": 185
        },
        {
          "country": "Philippines",
          "count": 98
        },
        {
          "country": "Lebanon",
          "count": 93
        },
        {
          "country": "Bangladesh",
          "count": 84
        },
        {
          "country": "England",
          "count": 63
        },
        {
          "country": "India",
          "count": 62
        },
        {
          "country": "Brazil",
          "count": 58
        },
        {
          "country": "Indonesia",
          "count": 52
        },
        {
          "country": "Italy",
          "count": 51
        },
        {
          "country": "Colombia",
          "count": 41
        },
        {
          "country": "Malaysia",
          "count": 34
        },
        {
          "country": "Ireland",
          "count": 29
        },
        {
          "country": "Japan",
          "count": 27
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 25
        },
        {
          "country": "North Macedonia",
          "count": 23
        },
        {
          "country": "Vietnam",
          "count": 23
        },
        {
          "country": "Thailand",
          "count": 22
        },
        {
          "country": "Egypt",
          "count": 17
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 17
        },
        {
          "country": "Pakistan",
          "count": 17
        },
        {
          "country": "United States of America",
          "count": 16
        },
        {
          "country": "Mongolia",
          "count": 15
        },
        {
          "country": "Peru",
          "count": 15
        },
        {
          "country": "Taiwan",
          "count": 14
        },
        {
          "country": "Poland",
          "count": 13
        },
        {
          "country": "Scotland",
          "count": 13
        },
        {
          "country": "Chile",
          "count": 12
        },
        {
          "country": "Iran",
          "count": 12
        },
        {
          "country": "Portugal",
          "count": 12
        },
        {
          "country": "Greece",
          "count": 11
        },
        {
          "country": "South Africa",
          "count": 11
        },
        {
          "country": "France",
          "count": 10
        },
        {
          "country": "Mauritius",
          "count": 9
        },
        {
          "country": "Singapore",
          "count": 9
        },
        {
          "country": "Sri Lanka",
          "count": 9
        },
        {
          "country": "Estonia",
          "count": 8
        },
        {
          "country": "Germany",
          "count": 8
        },
        {
          "country": "Spain",
          "count": 7
        },
        {
          "country": "Cambodia",
          "count": 6
        },
        {
          "country": "Russian Federation",
          "count": 6
        },
        {
          "country": "Malta",
          "count": 5
        },
        {
          "country": "Croatia",
          "count": 4
        },
        {
          "country": "Cyprus",
          "count": 4
        },
        {
          "country": "Denmark",
          "count": 4
        },
        {
          "country": "Iraq",
          "count": 4
        },
        {
          "country": "Myanmar",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Serbia",
          "count": 4
        },
        {
          "country": "Sweden",
          "count": 4
        },
        {
          "country": "Turkey",
          "count": 4
        },
        {
          "country": "Uganda",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Zimbabwe",
          "count": 4
        },
        {
          "country": "Argentina",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Jordan",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "bexley-north",
    "name": "Bexley North",
    "totals": {
      "all": 1576,
      "locals": 1205,
      "internationals": 371
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 282
        },
        {
          "country": "Greece",
          "count": 240
        },
        {
          "country": "Lebanon",
          "count": 110
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 85
        },
        {
          "country": "Vietnam",
          "count": 72
        },
        {
          "country": "Philippines",
          "count": 63
        },
        {
          "country": "England",
          "count": 51
        },
        {
          "country": "Indonesia",
          "count": 49
        },
        {
          "country": "New Zealand",
          "count": 49
        },
        {
          "country": "Italy",
          "count": 41
        },
        {
          "country": "Nepal",
          "count": 39
        },
        {
          "country": "Egypt",
          "count": 34
        },
        {
          "country": "North Macedonia",
          "count": 34
        },
        {
          "country": "Thailand",
          "count": 25
        },
        {
          "country": "Malaysia",
          "count": 24
        },
        {
          "country": "India",
          "count": 23
        },
        {
          "country": "Brazil",
          "count": 21
        },
        {
          "country": "Cyprus",
          "count": 20
        },
        {
          "country": "Malta",
          "count": 16
        },
        {
          "country": "United States of America",
          "count": 16
        },
        {
          "country": "Taiwan",
          "count": 15
        },
        {
          "country": "Colombia",
          "count": 13
        },
        {
          "country": "Germany",
          "count": 13
        },
        {
          "country": "Uruguay",
          "count": 13
        },
        {
          "country": "Poland",
          "count": 12
        },
        {
          "country": "Bangladesh",
          "count": 11
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 11
        },
        {
          "country": "Canada",
          "count": 10
        },
        {
          "country": "Ireland",
          "count": 10
        },
        {
          "country": "Pakistan",
          "count": 10
        },
        {
          "country": "Portugal",
          "count": 10
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 9
        },
        {
          "country": "Turkey",
          "count": 9
        },
        {
          "country": "Chile",
          "count": 8
        },
        {
          "country": "South Africa",
          "count": 8
        },
        {
          "country": "Japan",
          "count": 7
        },
        {
          "country": "Austria",
          "count": 6
        },
        {
          "country": "Croatia",
          "count": 6
        },
        {
          "country": "Hungary",
          "count": 6
        },
        {
          "country": "Algeria",
          "count": 5
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Russian Federation",
          "count": 5
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Cambodia",
          "count": 4
        },
        {
          "country": "Congo, Democratic Republic of",
          "count": 4
        },
        {
          "country": "Iran",
          "count": 4
        },
        {
          "country": "Scotland",
          "count": 4
        },
        {
          "country": "Singapore",
          "count": 4
        },
        {
          "country": "Slovenia",
          "count": 4
        },
        {
          "country": "Sri Lanka",
          "count": 4
        },
        {
          "country": "Czechia",
          "count": 3
        },
        {
          "country": "Macau (SAR of China)",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 232
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 204
        },
        {
          "country": "Lebanon",
          "count": 105
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 82
        },
        {
          "country": "Vietnam",
          "count": 63
        },
        {
          "country": "Philippines",
          "count": 51
        },
        {
          "country": "England",
          "count": 36
        },
        {
          "country": "Egypt",
          "count": 34
        },
        {
          "country": "Italy",
          "count": 34
        },
        {
          "country": "North Macedonia",
          "count": 34
        },
        {
          "country": "Indonesia",
          "count": 28
        },
        {
          "country": "Cyprus",
          "count": 20
        },
        {
          "country": "New Zealand",
          "count": 18
        },
        {
          "country": "India",
          "count": 17
        },
        {
          "country": "Malaysia",
          "count": 16
        },
        {
          "country": "Thailand",
          "count": 15
        },
        {
          "country": "Uruguay",
          "count": 13
        },
        {
          "country": "Taiwan",
          "count": 12
        },
        {
          "country": "Canada",
          "count": 10
        },
        {
          "country": "Colombia",
          "count": 10
        },
        {
          "country": "Ireland",
          "count": 10
        },
        {
          "country": "Portugal",
          "count": 10
        },
        {
          "country": "United States of America",
          "count": 10
        },
        {
          "country": "Malta",
          "count": 9
        },
        {
          "country": "Turkey",
          "count": 9
        },
        {
          "country": "Bangladesh",
          "count": 8
        },
        {
          "country": "Pakistan",
          "count": 7
        },
        {
          "country": "Austria",
          "count": 6
        },
        {
          "country": "Croatia",
          "count": 6
        },
        {
          "country": "Hungary",
          "count": 6
        },
        {
          "country": "Nepal",
          "count": 6
        },
        {
          "country": "Poland",
          "count": 6
        },
        {
          "country": "Algeria",
          "count": 5
        },
        {
          "country": "Brazil",
          "count": 5
        },
        {
          "country": "Germany",
          "count": 5
        },
        {
          "country": "Russian Federation",
          "count": 5
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 4
        },
        {
          "country": "Cambodia",
          "count": 4
        },
        {
          "country": "Chile",
          "count": 4
        },
        {
          "country": "Singapore",
          "count": 4
        },
        {
          "country": "Slovenia",
          "count": 4
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 3
        },
        {
          "country": "Macau (SAR of China)",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 78
        },
        {
          "country": "Nepal",
          "count": 33
        },
        {
          "country": "New Zealand",
          "count": 31
        },
        {
          "country": "Indonesia",
          "count": 21
        },
        {
          "country": "Brazil",
          "count": 16
        },
        {
          "country": "England",
          "count": 15
        },
        {
          "country": "Philippines",
          "count": 12
        },
        {
          "country": "Thailand",
          "count": 10
        },
        {
          "country": "Vietnam",
          "count": 9
        },
        {
          "country": "Germany",
          "count": 8
        },
        {
          "country": "Greece",
          "count": 8
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 8
        },
        {
          "country": "Malaysia",
          "count": 8
        },
        {
          "country": "South Africa",
          "count": 8
        },
        {
          "country": "Italy",
          "count": 7
        },
        {
          "country": "Japan",
          "count": 7
        },
        {
          "country": "Malta",
          "count": 7
        },
        {
          "country": "India",
          "count": 6
        },
        {
          "country": "Poland",
          "count": 6
        },
        {
          "country": "United States of America",
          "count": 6
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 5
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Lebanon",
          "count": 5
        },
        {
          "country": "Chile",
          "count": 4
        },
        {
          "country": "Congo, Democratic Republic of",
          "count": 4
        },
        {
          "country": "Iran",
          "count": 4
        },
        {
          "country": "Scotland",
          "count": 4
        },
        {
          "country": "Sri Lanka",
          "count": 4
        },
        {
          "country": "Bangladesh",
          "count": 3
        },
        {
          "country": "Colombia",
          "count": 3
        },
        {
          "country": "Czechia",
          "count": 3
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 3
        },
        {
          "country": "Pakistan",
          "count": 3
        },
        {
          "country": "Taiwan",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "botany",
    "name": "Botany",
    "totals": {
      "all": 3983,
      "locals": 2650,
      "internationals": 1333
    },
    "mixes": {
      "all": [
        {
          "country": "England",
          "count": 434
        },
        {
          "country": "New Zealand",
          "count": 313
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 300
        },
        {
          "country": "Ireland",
          "count": 291
        },
        {
          "country": "Philippines",
          "count": 267
        },
        {
          "country": "Indonesia",
          "count": 238
        },
        {
          "country": "South Africa",
          "count": 131
        },
        {
          "country": "India",
          "count": 111
        },
        {
          "country": "Brazil",
          "count": 97
        },
        {
          "country": "Malaysia",
          "count": 89
        },
        {
          "country": "Italy",
          "count": 83
        },
        {
          "country": "Scotland",
          "count": 78
        },
        {
          "country": "Greece",
          "count": 74
        },
        {
          "country": "Chile",
          "count": 59
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 55
        },
        {
          "country": "Croatia",
          "count": 54
        },
        {
          "country": "Vietnam",
          "count": 53
        },
        {
          "country": "United States of America",
          "count": 50
        },
        {
          "country": "Lebanon",
          "count": 47
        },
        {
          "country": "Colombia",
          "count": 46
        },
        {
          "country": "Serbia",
          "count": 43
        },
        {
          "country": "Poland",
          "count": 39
        },
        {
          "country": "Russian Federation",
          "count": 38
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 36
        },
        {
          "country": "Iran",
          "count": 34
        },
        {
          "country": "Thailand",
          "count": 32
        },
        {
          "country": "Egypt",
          "count": 30
        },
        {
          "country": "Malta",
          "count": 30
        },
        {
          "country": "Bangladesh",
          "count": 29
        },
        {
          "country": "France",
          "count": 28
        },
        {
          "country": "Israel",
          "count": 28
        },
        {
          "country": "Peru",
          "count": 28
        },
        {
          "country": "Germany",
          "count": 27
        },
        {
          "country": "Japan",
          "count": 27
        },
        {
          "country": "Singapore",
          "count": 27
        },
        {
          "country": "Turkey",
          "count": 27
        },
        {
          "country": "Ukraine",
          "count": 27
        },
        {
          "country": "Argentina",
          "count": 26
        },
        {
          "country": "Canada",
          "count": 26
        },
        {
          "country": "North Macedonia",
          "count": 26
        },
        {
          "country": "Sri Lanka",
          "count": 26
        },
        {
          "country": "Hungary",
          "count": 25
        },
        {
          "country": "Northern Ireland",
          "count": 24
        },
        {
          "country": "Mauritius",
          "count": 21
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 20
        },
        {
          "country": "Pakistan",
          "count": 19
        },
        {
          "country": "Portugal",
          "count": 19
        },
        {
          "country": "Taiwan",
          "count": 19
        },
        {
          "country": "Spain",
          "count": 18
        },
        {
          "country": "Uruguay",
          "count": 18
        },
        {
          "country": "Wales",
          "count": 18
        },
        {
          "country": "Iraq",
          "count": 15
        },
        {
          "country": "Romania",
          "count": 13
        },
        {
          "country": "Netherlands",
          "count": 12
        },
        {
          "country": "Nepal",
          "count": 11
        },
        {
          "country": "Timor-Leste",
          "count": 11
        },
        {
          "country": "Venezuela",
          "count": 11
        },
        {
          "country": "Zimbabwe",
          "count": 10
        },
        {
          "country": "Cyprus",
          "count": 9
        },
        {
          "country": "Austria",
          "count": 8
        },
        {
          "country": "Czechia",
          "count": 8
        },
        {
          "country": "Ghana",
          "count": 8
        },
        {
          "country": "Sweden",
          "count": 8
        },
        {
          "country": "Uzbekistan",
          "count": 8
        },
        {
          "country": "Ecuador",
          "count": 7
        },
        {
          "country": "Finland",
          "count": 7
        },
        {
          "country": "Moldova",
          "count": 7
        },
        {
          "country": "Mongolia",
          "count": 7
        },
        {
          "country": "Slovakia",
          "count": 7
        },
        {
          "country": "Sudan",
          "count": 7
        },
        {
          "country": "Cambodia",
          "count": 6
        },
        {
          "country": "Estonia",
          "count": 6
        },
        {
          "country": "Albania",
          "count": 5
        },
        {
          "country": "Belgium",
          "count": 5
        },
        {
          "country": "Lithuania",
          "count": 5
        },
        {
          "country": "Slovenia",
          "count": 5
        },
        {
          "country": "Switzerland",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "Bolivia",
          "count": 4
        },
        {
          "country": "Morocco",
          "count": 4
        },
        {
          "country": "Afghanistan",
          "count": 3
        },
        {
          "country": "Denmark",
          "count": 3
        },
        {
          "country": "Macau (SAR of China)",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Saudi Arabia",
          "count": 3
        },
        {
          "country": "Seychelles",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "England",
          "count": 329
        },
        {
          "country": "Philippines",
          "count": 218
        },
        {
          "country": "Ireland",
          "count": 157
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 135
        },
        {
          "country": "Indonesia",
          "count": 124
        },
        {
          "country": "South Africa",
          "count": 110
        },
        {
          "country": "New Zealand",
          "count": 108
        },
        {
          "country": "Italy",
          "count": 73
        },
        {
          "country": "Greece",
          "count": 71
        },
        {
          "country": "India",
          "count": 70
        },
        {
          "country": "Croatia",
          "count": 54
        },
        {
          "country": "Malaysia",
          "count": 49
        },
        {
          "country": "Scotland",
          "count": 48
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 46
        },
        {
          "country": "Serbia",
          "count": 43
        },
        {
          "country": "Chile",
          "count": 42
        },
        {
          "country": "Lebanon",
          "count": 41
        },
        {
          "country": "Vietnam",
          "count": 39
        },
        {
          "country": "Brazil",
          "count": 37
        },
        {
          "country": "United States of America",
          "count": 32
        },
        {
          "country": "Egypt",
          "count": 30
        },
        {
          "country": "Russian Federation",
          "count": 29
        },
        {
          "country": "Israel",
          "count": 28
        },
        {
          "country": "Malta",
          "count": 27
        },
        {
          "country": "Poland",
          "count": 27
        },
        {
          "country": "Turkey",
          "count": 27
        },
        {
          "country": "Argentina",
          "count": 26
        },
        {
          "country": "North Macedonia",
          "count": 26
        },
        {
          "country": "Iran",
          "count": 24
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 24
        },
        {
          "country": "Ukraine",
          "count": 24
        },
        {
          "country": "Bangladesh",
          "count": 22
        },
        {
          "country": "Thailand",
          "count": 22
        },
        {
          "country": "Canada",
          "count": 21
        },
        {
          "country": "Hungary",
          "count": 21
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 20
        },
        {
          "country": "Colombia",
          "count": 20
        },
        {
          "country": "France",
          "count": 20
        },
        {
          "country": "Portugal",
          "count": 19
        },
        {
          "country": "Sri Lanka",
          "count": 19
        },
        {
          "country": "Peru",
          "count": 18
        },
        {
          "country": "Uruguay",
          "count": 18
        },
        {
          "country": "Germany",
          "count": 16
        },
        {
          "country": "Mauritius",
          "count": 16
        },
        {
          "country": "Iraq",
          "count": 15
        },
        {
          "country": "Northern Ireland",
          "count": 14
        },
        {
          "country": "Romania",
          "count": 13
        },
        {
          "country": "Spain",
          "count": 13
        },
        {
          "country": "Wales",
          "count": 13
        },
        {
          "country": "Singapore",
          "count": 11
        },
        {
          "country": "Timor-Leste",
          "count": 11
        },
        {
          "country": "Taiwan",
          "count": 10
        },
        {
          "country": "Cyprus",
          "count": 9
        },
        {
          "country": "Japan",
          "count": 9
        },
        {
          "country": "Czechia",
          "count": 8
        },
        {
          "country": "Pakistan",
          "count": 8
        },
        {
          "country": "Uzbekistan",
          "count": 8
        },
        {
          "country": "Moldova",
          "count": 7
        },
        {
          "country": "Slovakia",
          "count": 7
        },
        {
          "country": "Sudan",
          "count": 7
        },
        {
          "country": "Venezuela",
          "count": 7
        },
        {
          "country": "Zimbabwe",
          "count": 7
        },
        {
          "country": "Albania",
          "count": 5
        },
        {
          "country": "Austria",
          "count": 5
        },
        {
          "country": "Ghana",
          "count": 5
        },
        {
          "country": "Lithuania",
          "count": 5
        },
        {
          "country": "Slovenia",
          "count": 5
        },
        {
          "country": "Switzerland",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "Bolivia",
          "count": 4
        },
        {
          "country": "Finland",
          "count": 4
        },
        {
          "country": "Morocco",
          "count": 4
        },
        {
          "country": "Nepal",
          "count": 4
        },
        {
          "country": "Cambodia",
          "count": 3
        },
        {
          "country": "Denmark",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Macau (SAR of China)",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Mongolia",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Saudi Arabia",
          "count": 3
        },
        {
          "country": "Seychelles",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "New Zealand",
          "count": 205
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 165
        },
        {
          "country": "Ireland",
          "count": 134
        },
        {
          "country": "Indonesia",
          "count": 114
        },
        {
          "country": "England",
          "count": 105
        },
        {
          "country": "Brazil",
          "count": 60
        },
        {
          "country": "Philippines",
          "count": 49
        },
        {
          "country": "India",
          "count": 41
        },
        {
          "country": "Malaysia",
          "count": 40
        },
        {
          "country": "Scotland",
          "count": 30
        },
        {
          "country": "Colombia",
          "count": 26
        },
        {
          "country": "South Africa",
          "count": 21
        },
        {
          "country": "Japan",
          "count": 18
        },
        {
          "country": "United States of America",
          "count": 18
        },
        {
          "country": "Chile",
          "count": 17
        },
        {
          "country": "Singapore",
          "count": 16
        },
        {
          "country": "Vietnam",
          "count": 14
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 12
        },
        {
          "country": "Poland",
          "count": 12
        },
        {
          "country": "Germany",
          "count": 11
        },
        {
          "country": "Pakistan",
          "count": 11
        },
        {
          "country": "Iran",
          "count": 10
        },
        {
          "country": "Italy",
          "count": 10
        },
        {
          "country": "Northern Ireland",
          "count": 10
        },
        {
          "country": "Peru",
          "count": 10
        },
        {
          "country": "Thailand",
          "count": 10
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 9
        },
        {
          "country": "Netherlands",
          "count": 9
        },
        {
          "country": "Russian Federation",
          "count": 9
        },
        {
          "country": "Taiwan",
          "count": 9
        },
        {
          "country": "France",
          "count": 8
        },
        {
          "country": "Bangladesh",
          "count": 7
        },
        {
          "country": "Nepal",
          "count": 7
        },
        {
          "country": "Sri Lanka",
          "count": 7
        },
        {
          "country": "Estonia",
          "count": 6
        },
        {
          "country": "Lebanon",
          "count": 6
        },
        {
          "country": "Belgium",
          "count": 5
        },
        {
          "country": "Canada",
          "count": 5
        },
        {
          "country": "Mauritius",
          "count": 5
        },
        {
          "country": "Spain",
          "count": 5
        },
        {
          "country": "Sweden",
          "count": 5
        },
        {
          "country": "Wales",
          "count": 5
        },
        {
          "country": "Ecuador",
          "count": 4
        },
        {
          "country": "Hungary",
          "count": 4
        },
        {
          "country": "Mongolia",
          "count": 4
        },
        {
          "country": "Venezuela",
          "count": 4
        },
        {
          "country": "Afghanistan",
          "count": 3
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Cambodia",
          "count": 3
        },
        {
          "country": "Finland",
          "count": 3
        },
        {
          "country": "Ghana",
          "count": 3
        },
        {
          "country": "Greece",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Ukraine",
          "count": 3
        },
        {
          "country": "Zimbabwe",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "brighton-le-sands",
    "name": "Brighton-Le-Sands",
    "totals": {
      "all": 3428,
      "locals": 2495,
      "internationals": 933
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 419
        },
        {
          "country": "Egypt",
          "count": 229
        },
        {
          "country": "Brazil",
          "count": 204
        },
        {
          "country": "Lebanon",
          "count": 141
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 136
        },
        {
          "country": "England",
          "count": 136
        },
        {
          "country": "North Macedonia",
          "count": 131
        },
        {
          "country": "New Zealand",
          "count": 129
        },
        {
          "country": "Italy",
          "count": 110
        },
        {
          "country": "India",
          "count": 98
        },
        {
          "country": "Philippines",
          "count": 94
        },
        {
          "country": "Chile",
          "count": 90
        },
        {
          "country": "Turkey",
          "count": 88
        },
        {
          "country": "Bangladesh",
          "count": 80
        },
        {
          "country": "Vietnam",
          "count": 79
        },
        {
          "country": "Colombia",
          "count": 72
        },
        {
          "country": "Serbia",
          "count": 68
        },
        {
          "country": "Ireland",
          "count": 47
        },
        {
          "country": "Thailand",
          "count": 47
        },
        {
          "country": "Russian Federation",
          "count": 46
        },
        {
          "country": "Croatia",
          "count": 43
        },
        {
          "country": "Portugal",
          "count": 43
        },
        {
          "country": "Uruguay",
          "count": 42
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 41
        },
        {
          "country": "Indonesia",
          "count": 41
        },
        {
          "country": "Cyprus",
          "count": 40
        },
        {
          "country": "Malta",
          "count": 39
        },
        {
          "country": "Poland",
          "count": 39
        },
        {
          "country": "Nepal",
          "count": 35
        },
        {
          "country": "Syria",
          "count": 29
        },
        {
          "country": "Pakistan",
          "count": 27
        },
        {
          "country": "South Africa",
          "count": 27
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 26
        },
        {
          "country": "Iraq",
          "count": 26
        },
        {
          "country": "Iran",
          "count": 23
        },
        {
          "country": "Ukraine",
          "count": 23
        },
        {
          "country": "Scotland",
          "count": 22
        },
        {
          "country": "Peru",
          "count": 21
        },
        {
          "country": "Argentina",
          "count": 20
        },
        {
          "country": "France",
          "count": 20
        },
        {
          "country": "United States of America",
          "count": 20
        },
        {
          "country": "Jordan",
          "count": 19
        },
        {
          "country": "Malaysia",
          "count": 19
        },
        {
          "country": "Germany",
          "count": 18
        },
        {
          "country": "Hungary",
          "count": 18
        },
        {
          "country": "Spain",
          "count": 17
        },
        {
          "country": "Bulgaria",
          "count": 15
        },
        {
          "country": "Czechia",
          "count": 14
        },
        {
          "country": "Japan",
          "count": 14
        },
        {
          "country": "Sudan",
          "count": 14
        },
        {
          "country": "Northern Ireland",
          "count": 12
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 11
        },
        {
          "country": "Netherlands",
          "count": 11
        },
        {
          "country": "Sri Lanka",
          "count": 10
        },
        {
          "country": "Taiwan",
          "count": 10
        },
        {
          "country": "Mexico",
          "count": 9
        },
        {
          "country": "Myanmar",
          "count": 9
        },
        {
          "country": "Canada",
          "count": 8
        },
        {
          "country": "Kenya",
          "count": 8
        },
        {
          "country": "Mauritius",
          "count": 8
        },
        {
          "country": "Romania",
          "count": 8
        },
        {
          "country": "Afghanistan",
          "count": 7
        },
        {
          "country": "Slovakia",
          "count": 7
        },
        {
          "country": "Ghana",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 5
        },
        {
          "country": "Singapore",
          "count": 5
        },
        {
          "country": "Slovenia",
          "count": 5
        },
        {
          "country": "Cambodia",
          "count": 4
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 4
        },
        {
          "country": "Nigeria",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Senegal",
          "count": 4
        },
        {
          "country": "Zimbabwe",
          "count": 4
        },
        {
          "country": "Albania",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Kazakhstan",
          "count": 3
        },
        {
          "country": "Lithuania",
          "count": 3
        },
        {
          "country": "Timor-Leste",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 395
        },
        {
          "country": "Egypt",
          "count": 209
        },
        {
          "country": "Lebanon",
          "count": 131
        },
        {
          "country": "North Macedonia",
          "count": 122
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 103
        },
        {
          "country": "England",
          "count": 97
        },
        {
          "country": "Italy",
          "count": 82
        },
        {
          "country": "Turkey",
          "count": 72
        },
        {
          "country": "Vietnam",
          "count": 70
        },
        {
          "country": "Philippines",
          "count": 66
        },
        {
          "country": "Bangladesh",
          "count": 60
        },
        {
          "country": "Serbia",
          "count": 60
        },
        {
          "country": "Chile",
          "count": 56
        },
        {
          "country": "India",
          "count": 56
        },
        {
          "country": "Croatia",
          "count": 43
        },
        {
          "country": "Cyprus",
          "count": 40
        },
        {
          "country": "Portugal",
          "count": 40
        },
        {
          "country": "Uruguay",
          "count": 38
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 36
        },
        {
          "country": "Malta",
          "count": 36
        },
        {
          "country": "New Zealand",
          "count": 36
        },
        {
          "country": "Russian Federation",
          "count": 34
        },
        {
          "country": "Colombia",
          "count": 30
        },
        {
          "country": "Ireland",
          "count": 30
        },
        {
          "country": "Poland",
          "count": 30
        },
        {
          "country": "Brazil",
          "count": 27
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 26
        },
        {
          "country": "Syria",
          "count": 25
        },
        {
          "country": "South Africa",
          "count": 23
        },
        {
          "country": "Ukraine",
          "count": 23
        },
        {
          "country": "Indonesia",
          "count": 22
        },
        {
          "country": "Thailand",
          "count": 22
        },
        {
          "country": "Scotland",
          "count": 19
        },
        {
          "country": "Argentina",
          "count": 15
        },
        {
          "country": "Iraq",
          "count": 15
        },
        {
          "country": "Jordan",
          "count": 15
        },
        {
          "country": "Peru",
          "count": 15
        },
        {
          "country": "Hungary",
          "count": 14
        },
        {
          "country": "Iran",
          "count": 14
        },
        {
          "country": "Sudan",
          "count": 14
        },
        {
          "country": "Pakistan",
          "count": 13
        },
        {
          "country": "France",
          "count": 11
        },
        {
          "country": "Germany",
          "count": 11
        },
        {
          "country": "Malaysia",
          "count": 11
        },
        {
          "country": "Nepal",
          "count": 11
        },
        {
          "country": "Sri Lanka",
          "count": 10
        },
        {
          "country": "Taiwan",
          "count": 10
        },
        {
          "country": "Spain",
          "count": 9
        },
        {
          "country": "United States of America",
          "count": 9
        },
        {
          "country": "Bulgaria",
          "count": 8
        },
        {
          "country": "Romania",
          "count": 8
        },
        {
          "country": "Afghanistan",
          "count": 7
        },
        {
          "country": "Netherlands",
          "count": 7
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 6
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 5
        },
        {
          "country": "Mauritius",
          "count": 5
        },
        {
          "country": "Myanmar",
          "count": 5
        },
        {
          "country": "Singapore",
          "count": 5
        },
        {
          "country": "Slovenia",
          "count": 5
        },
        {
          "country": "Cambodia",
          "count": 4
        },
        {
          "country": "Canada",
          "count": 4
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 4
        },
        {
          "country": "Mexico",
          "count": 4
        },
        {
          "country": "Nigeria",
          "count": 4
        },
        {
          "country": "Northern Ireland",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Senegal",
          "count": 4
        },
        {
          "country": "Slovakia",
          "count": 4
        },
        {
          "country": "Zimbabwe",
          "count": 4
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Kazakhstan",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Timor-Leste",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Brazil",
          "count": 177
        },
        {
          "country": "New Zealand",
          "count": 93
        },
        {
          "country": "Colombia",
          "count": 42
        },
        {
          "country": "India",
          "count": 42
        },
        {
          "country": "England",
          "count": 39
        },
        {
          "country": "Chile",
          "count": 34
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 33
        },
        {
          "country": "Italy",
          "count": 28
        },
        {
          "country": "Philippines",
          "count": 28
        },
        {
          "country": "Thailand",
          "count": 25
        },
        {
          "country": "Greece",
          "count": 24
        },
        {
          "country": "Nepal",
          "count": 24
        },
        {
          "country": "Bangladesh",
          "count": 20
        },
        {
          "country": "Egypt",
          "count": 20
        },
        {
          "country": "Indonesia",
          "count": 19
        },
        {
          "country": "Ireland",
          "count": 17
        },
        {
          "country": "Turkey",
          "count": 16
        },
        {
          "country": "Japan",
          "count": 14
        },
        {
          "country": "Pakistan",
          "count": 14
        },
        {
          "country": "Russian Federation",
          "count": 12
        },
        {
          "country": "Iraq",
          "count": 11
        },
        {
          "country": "United States of America",
          "count": 11
        },
        {
          "country": "Lebanon",
          "count": 10
        },
        {
          "country": "Czechia",
          "count": 9
        },
        {
          "country": "France",
          "count": 9
        },
        {
          "country": "Iran",
          "count": 9
        },
        {
          "country": "North Macedonia",
          "count": 9
        },
        {
          "country": "Poland",
          "count": 9
        },
        {
          "country": "Vietnam",
          "count": 9
        },
        {
          "country": "Malaysia",
          "count": 8
        },
        {
          "country": "Northern Ireland",
          "count": 8
        },
        {
          "country": "Serbia",
          "count": 8
        },
        {
          "country": "Spain",
          "count": 8
        },
        {
          "country": "Bulgaria",
          "count": 7
        },
        {
          "country": "Germany",
          "count": 7
        },
        {
          "country": "Peru",
          "count": 6
        },
        {
          "country": "Argentina",
          "count": 5
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 5
        },
        {
          "country": "Ghana",
          "count": 5
        },
        {
          "country": "Kenya",
          "count": 5
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 5
        },
        {
          "country": "Mexico",
          "count": 5
        },
        {
          "country": "Canada",
          "count": 4
        },
        {
          "country": "Hungary",
          "count": 4
        },
        {
          "country": "Jordan",
          "count": 4
        },
        {
          "country": "Myanmar",
          "count": 4
        },
        {
          "country": "Netherlands",
          "count": 4
        },
        {
          "country": "South Africa",
          "count": 4
        },
        {
          "country": "Syria",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Albania",
          "count": 3
        },
        {
          "country": "Lithuania",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Mauritius",
          "count": 3
        },
        {
          "country": "Portugal",
          "count": 3
        },
        {
          "country": "Scotland",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "carlton",
    "name": "Carlton",
    "totals": {
      "all": 5192,
      "locals": 3280,
      "internationals": 1912
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1197
        },
        {
          "country": "Nepal",
          "count": 590
        },
        {
          "country": "North Macedonia",
          "count": 326
        },
        {
          "country": "Philippines",
          "count": 309
        },
        {
          "country": "Greece",
          "count": 257
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 231
        },
        {
          "country": "Lebanon",
          "count": 202
        },
        {
          "country": "India",
          "count": 174
        },
        {
          "country": "New Zealand",
          "count": 151
        },
        {
          "country": "Bangladesh",
          "count": 135
        },
        {
          "country": "Italy",
          "count": 107
        },
        {
          "country": "England",
          "count": 102
        },
        {
          "country": "Malaysia",
          "count": 91
        },
        {
          "country": "Indonesia",
          "count": 89
        },
        {
          "country": "Egypt",
          "count": 80
        },
        {
          "country": "Thailand",
          "count": 69
        },
        {
          "country": "Croatia",
          "count": 56
        },
        {
          "country": "Vietnam",
          "count": 56
        },
        {
          "country": "Colombia",
          "count": 54
        },
        {
          "country": "Brazil",
          "count": 52
        },
        {
          "country": "Taiwan",
          "count": 49
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 42
        },
        {
          "country": "Chile",
          "count": 34
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 34
        },
        {
          "country": "Serbia",
          "count": 30
        },
        {
          "country": "Cyprus",
          "count": 29
        },
        {
          "country": "Poland",
          "count": 29
        },
        {
          "country": "Peru",
          "count": 28
        },
        {
          "country": "Japan",
          "count": 27
        },
        {
          "country": "Russian Federation",
          "count": 26
        },
        {
          "country": "Ireland",
          "count": 24
        },
        {
          "country": "Ecuador",
          "count": 23
        },
        {
          "country": "Germany",
          "count": 22
        },
        {
          "country": "Singapore",
          "count": 22
        },
        {
          "country": "Sri Lanka",
          "count": 21
        },
        {
          "country": "Portugal",
          "count": 20
        },
        {
          "country": "South Africa",
          "count": 19
        },
        {
          "country": "Turkey",
          "count": 19
        },
        {
          "country": "France",
          "count": 18
        },
        {
          "country": "United States of America",
          "count": 17
        },
        {
          "country": "Pakistan",
          "count": 16
        },
        {
          "country": "Ukraine",
          "count": 16
        },
        {
          "country": "Malta",
          "count": 15
        },
        {
          "country": "Myanmar",
          "count": 15
        },
        {
          "country": "Uruguay",
          "count": 14
        },
        {
          "country": "Iran",
          "count": 13
        },
        {
          "country": "Mongolia",
          "count": 13
        },
        {
          "country": "Scotland",
          "count": 12
        },
        {
          "country": "Spain",
          "count": 12
        },
        {
          "country": "Zimbabwe",
          "count": 12
        },
        {
          "country": "Canada",
          "count": 11
        },
        {
          "country": "Mauritius",
          "count": 10
        },
        {
          "country": "United Arab Emirates",
          "count": 9
        },
        {
          "country": "Argentina",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Jordan",
          "count": 7
        },
        {
          "country": "Wales",
          "count": 7
        },
        {
          "country": "Sudan",
          "count": 6
        },
        {
          "country": "Austria",
          "count": 5
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Estonia",
          "count": 5
        },
        {
          "country": "Israel",
          "count": 5
        },
        {
          "country": "Macau (SAR of China)",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "Algeria",
          "count": 4
        },
        {
          "country": "Burundi",
          "count": 4
        },
        {
          "country": "Cuba",
          "count": 4
        },
        {
          "country": "Georgia",
          "count": 4
        },
        {
          "country": "Iraq",
          "count": 4
        },
        {
          "country": "Latvia",
          "count": 4
        },
        {
          "country": "Nigeria",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Bulgaria",
          "count": 3
        },
        {
          "country": "Denmark",
          "count": 3
        },
        {
          "country": "Finland",
          "count": 3
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 3
        },
        {
          "country": "Ghana",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 753
        },
        {
          "country": "North Macedonia",
          "count": 309
        },
        {
          "country": "Greece",
          "count": 245
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 204
        },
        {
          "country": "Lebanon",
          "count": 188
        },
        {
          "country": "Philippines",
          "count": 162
        },
        {
          "country": "India",
          "count": 99
        },
        {
          "country": "Bangladesh",
          "count": 88
        },
        {
          "country": "Nepal",
          "count": 86
        },
        {
          "country": "Italy",
          "count": 82
        },
        {
          "country": "Egypt",
          "count": 73
        },
        {
          "country": "England",
          "count": 60
        },
        {
          "country": "Indonesia",
          "count": 55
        },
        {
          "country": "Croatia",
          "count": 53
        },
        {
          "country": "Thailand",
          "count": 53
        },
        {
          "country": "New Zealand",
          "count": 49
        },
        {
          "country": "Vietnam",
          "count": 44
        },
        {
          "country": "Malaysia",
          "count": 43
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 34
        },
        {
          "country": "Taiwan",
          "count": 31
        },
        {
          "country": "Serbia",
          "count": 30
        },
        {
          "country": "Chile",
          "count": 29
        },
        {
          "country": "Cyprus",
          "count": 29
        },
        {
          "country": "Poland",
          "count": 26
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 20
        },
        {
          "country": "Portugal",
          "count": 20
        },
        {
          "country": "Ecuador",
          "count": 19
        },
        {
          "country": "Colombia",
          "count": 17
        },
        {
          "country": "Russian Federation",
          "count": 17
        },
        {
          "country": "South Africa",
          "count": 16
        },
        {
          "country": "Germany",
          "count": 15
        },
        {
          "country": "Singapore",
          "count": 15
        },
        {
          "country": "Turkey",
          "count": 14
        },
        {
          "country": "Uruguay",
          "count": 14
        },
        {
          "country": "Ireland",
          "count": 13
        },
        {
          "country": "Peru",
          "count": 13
        },
        {
          "country": "Malta",
          "count": 12
        },
        {
          "country": "Myanmar",
          "count": 12
        },
        {
          "country": "Sri Lanka",
          "count": 12
        },
        {
          "country": "United States of America",
          "count": 12
        },
        {
          "country": "Brazil",
          "count": 10
        },
        {
          "country": "France",
          "count": 10
        },
        {
          "country": "Mauritius",
          "count": 10
        },
        {
          "country": "Ukraine",
          "count": 10
        },
        {
          "country": "Pakistan",
          "count": 9
        },
        {
          "country": "Spain",
          "count": 9
        },
        {
          "country": "United Arab Emirates",
          "count": 9
        },
        {
          "country": "Iran",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Scotland",
          "count": 7
        },
        {
          "country": "Sudan",
          "count": 6
        },
        {
          "country": "Zimbabwe",
          "count": 6
        },
        {
          "country": "Austria",
          "count": 5
        },
        {
          "country": "Israel",
          "count": 5
        },
        {
          "country": "Macau (SAR of China)",
          "count": 5
        },
        {
          "country": "Syria",
          "count": 5
        },
        {
          "country": "Algeria",
          "count": 4
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Burundi",
          "count": 4
        },
        {
          "country": "Iraq",
          "count": 4
        },
        {
          "country": "Japan",
          "count": 4
        },
        {
          "country": "Jordan",
          "count": 4
        },
        {
          "country": "Latvia",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Canada",
          "count": 3
        },
        {
          "country": "Denmark",
          "count": 3
        },
        {
          "country": "Finland",
          "count": 3
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Nepal",
          "count": 504
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 444
        },
        {
          "country": "Philippines",
          "count": 147
        },
        {
          "country": "New Zealand",
          "count": 102
        },
        {
          "country": "India",
          "count": 75
        },
        {
          "country": "Malaysia",
          "count": 48
        },
        {
          "country": "Bangladesh",
          "count": 47
        },
        {
          "country": "Brazil",
          "count": 42
        },
        {
          "country": "England",
          "count": 42
        },
        {
          "country": "Colombia",
          "count": 37
        },
        {
          "country": "Indonesia",
          "count": 34
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 27
        },
        {
          "country": "Italy",
          "count": 25
        },
        {
          "country": "Japan",
          "count": 23
        },
        {
          "country": "Taiwan",
          "count": 18
        },
        {
          "country": "North Macedonia",
          "count": 17
        },
        {
          "country": "Thailand",
          "count": 16
        },
        {
          "country": "Peru",
          "count": 15
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 14
        },
        {
          "country": "Lebanon",
          "count": 14
        },
        {
          "country": "Mongolia",
          "count": 13
        },
        {
          "country": "Greece",
          "count": 12
        },
        {
          "country": "Vietnam",
          "count": 12
        },
        {
          "country": "Ireland",
          "count": 11
        },
        {
          "country": "Russian Federation",
          "count": 9
        },
        {
          "country": "Sri Lanka",
          "count": 9
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 8
        },
        {
          "country": "Canada",
          "count": 8
        },
        {
          "country": "France",
          "count": 8
        },
        {
          "country": "Egypt",
          "count": 7
        },
        {
          "country": "Germany",
          "count": 7
        },
        {
          "country": "Pakistan",
          "count": 7
        },
        {
          "country": "Singapore",
          "count": 7
        },
        {
          "country": "Ukraine",
          "count": 6
        },
        {
          "country": "Zimbabwe",
          "count": 6
        },
        {
          "country": "Chile",
          "count": 5
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Estonia",
          "count": 5
        },
        {
          "country": "Iran",
          "count": 5
        },
        {
          "country": "Scotland",
          "count": 5
        },
        {
          "country": "Turkey",
          "count": 5
        },
        {
          "country": "United States of America",
          "count": 5
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Cuba",
          "count": 4
        },
        {
          "country": "Ecuador",
          "count": 4
        },
        {
          "country": "Georgia",
          "count": 4
        },
        {
          "country": "Nigeria",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Bulgaria",
          "count": 3
        },
        {
          "country": "Croatia",
          "count": 3
        },
        {
          "country": "Ghana",
          "count": 3
        },
        {
          "country": "Jordan",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Myanmar",
          "count": 3
        },
        {
          "country": "Poland",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "daceyville",
    "name": "Daceyville",
    "totals": {
      "all": 320,
      "locals": 270,
      "internationals": 50
    },
    "mixes": {
      "all": [
        {
          "country": "England",
          "count": 28
        },
        {
          "country": "New Zealand",
          "count": 28
        },
        {
          "country": "Poland",
          "count": 20
        },
        {
          "country": "Philippines",
          "count": 17
        },
        {
          "country": "Greece",
          "count": 15
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 12
        },
        {
          "country": "South Africa",
          "count": 12
        },
        {
          "country": "Lebanon",
          "count": 11
        },
        {
          "country": "Vietnam",
          "count": 11
        },
        {
          "country": "Egypt",
          "count": 10
        },
        {
          "country": "Russian Federation",
          "count": 10
        },
        {
          "country": "Iraq",
          "count": 9
        },
        {
          "country": "Germany",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 8
        },
        {
          "country": "Thailand",
          "count": 8
        },
        {
          "country": "Ukraine",
          "count": 8
        },
        {
          "country": "Indonesia",
          "count": 7
        },
        {
          "country": "Malaysia",
          "count": 7
        },
        {
          "country": "Malta",
          "count": 7
        },
        {
          "country": "Ireland",
          "count": 6
        },
        {
          "country": "Cyprus",
          "count": 5
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 5
        },
        {
          "country": "Turkey",
          "count": 5
        },
        {
          "country": "Chile",
          "count": 4
        },
        {
          "country": "Ghana",
          "count": 4
        },
        {
          "country": "India",
          "count": 4
        },
        {
          "country": "Italy",
          "count": 4
        },
        {
          "country": "Peru",
          "count": 4
        },
        {
          "country": "Scotland",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Argentina",
          "count": 3
        },
        {
          "country": "Colombia",
          "count": 3
        },
        {
          "country": "El Salvador",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Northern Ireland",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "England",
          "count": 21
        },
        {
          "country": "Poland",
          "count": 20
        },
        {
          "country": "New Zealand",
          "count": 18
        },
        {
          "country": "Greece",
          "count": 15
        },
        {
          "country": "Philippines",
          "count": 13
        },
        {
          "country": "Lebanon",
          "count": 11
        },
        {
          "country": "Vietnam",
          "count": 11
        },
        {
          "country": "Egypt",
          "count": 10
        },
        {
          "country": "Russian Federation",
          "count": 10
        },
        {
          "country": "Iraq",
          "count": 9
        },
        {
          "country": "South Africa",
          "count": 9
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 8
        },
        {
          "country": "Germany",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 8
        },
        {
          "country": "Indonesia",
          "count": 7
        },
        {
          "country": "Malaysia",
          "count": 7
        },
        {
          "country": "Malta",
          "count": 7
        },
        {
          "country": "Ireland",
          "count": 6
        },
        {
          "country": "Cyprus",
          "count": 5
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 5
        },
        {
          "country": "Thailand",
          "count": 5
        },
        {
          "country": "Turkey",
          "count": 5
        },
        {
          "country": "Ukraine",
          "count": 5
        },
        {
          "country": "Chile",
          "count": 4
        },
        {
          "country": "Ghana",
          "count": 4
        },
        {
          "country": "India",
          "count": 4
        },
        {
          "country": "Italy",
          "count": 4
        },
        {
          "country": "Peru",
          "count": 4
        },
        {
          "country": "Scotland",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Argentina",
          "count": 3
        },
        {
          "country": "Colombia",
          "count": 3
        },
        {
          "country": "El Salvador",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Northern Ireland",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "New Zealand",
          "count": 10
        },
        {
          "country": "England",
          "count": 7
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 4
        },
        {
          "country": "Philippines",
          "count": 4
        },
        {
          "country": "South Africa",
          "count": 3
        },
        {
          "country": "Thailand",
          "count": 3
        },
        {
          "country": "Ukraine",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "dolls-point",
    "name": "Dolls Point",
    "totals": {
      "all": 520,
      "locals": 395,
      "internationals": 125
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 64
        },
        {
          "country": "England",
          "count": 42
        },
        {
          "country": "New Zealand",
          "count": 30
        },
        {
          "country": "Egypt",
          "count": 29
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 20
        },
        {
          "country": "Italy",
          "count": 19
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 17
        },
        {
          "country": "Cyprus",
          "count": 15
        },
        {
          "country": "Lebanon",
          "count": 15
        },
        {
          "country": "Colombia",
          "count": 13
        },
        {
          "country": "North Macedonia",
          "count": 13
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 12
        },
        {
          "country": "India",
          "count": 12
        },
        {
          "country": "Philippines",
          "count": 12
        },
        {
          "country": "Bangladesh",
          "count": 11
        },
        {
          "country": "Portugal",
          "count": 11
        },
        {
          "country": "Ireland",
          "count": 10
        },
        {
          "country": "Brazil",
          "count": 9
        },
        {
          "country": "Croatia",
          "count": 9
        },
        {
          "country": "Thailand",
          "count": 9
        },
        {
          "country": "Yemen",
          "count": 9
        },
        {
          "country": "Argentina",
          "count": 8
        },
        {
          "country": "Germany",
          "count": 8
        },
        {
          "country": "Vietnam",
          "count": 8
        },
        {
          "country": "Netherlands",
          "count": 7
        },
        {
          "country": "Peru",
          "count": 7
        },
        {
          "country": "Albania",
          "count": 6
        },
        {
          "country": "Pakistan",
          "count": 6
        },
        {
          "country": "Scotland",
          "count": 6
        },
        {
          "country": "Turkey",
          "count": 6
        },
        {
          "country": "Malaysia",
          "count": 5
        },
        {
          "country": "Poland",
          "count": 5
        },
        {
          "country": "Russian Federation",
          "count": 5
        },
        {
          "country": "Serbia",
          "count": 5
        },
        {
          "country": "Iran",
          "count": 4
        },
        {
          "country": "Spain",
          "count": 4
        },
        {
          "country": "Switzerland",
          "count": 4
        },
        {
          "country": "Ukraine",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Chile",
          "count": 3
        },
        {
          "country": "El Salvador",
          "count": 3
        },
        {
          "country": "France",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Romania",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        },
        {
          "country": "Zimbabwe",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 64
        },
        {
          "country": "Egypt",
          "count": 29
        },
        {
          "country": "England",
          "count": 27
        },
        {
          "country": "Cyprus",
          "count": 15
        },
        {
          "country": "Lebanon",
          "count": 15
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 14
        },
        {
          "country": "North Macedonia",
          "count": 13
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 12
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 12
        },
        {
          "country": "India",
          "count": 12
        },
        {
          "country": "New Zealand",
          "count": 12
        },
        {
          "country": "Croatia",
          "count": 9
        },
        {
          "country": "Italy",
          "count": 9
        },
        {
          "country": "Philippines",
          "count": 9
        },
        {
          "country": "Argentina",
          "count": 8
        },
        {
          "country": "Germany",
          "count": 8
        },
        {
          "country": "Vietnam",
          "count": 8
        },
        {
          "country": "Bangladesh",
          "count": 7
        },
        {
          "country": "Colombia",
          "count": 7
        },
        {
          "country": "Netherlands",
          "count": 7
        },
        {
          "country": "Peru",
          "count": 7
        },
        {
          "country": "Albania",
          "count": 6
        },
        {
          "country": "Brazil",
          "count": 6
        },
        {
          "country": "Scotland",
          "count": 6
        },
        {
          "country": "Turkey",
          "count": 6
        },
        {
          "country": "Yemen",
          "count": 6
        },
        {
          "country": "Russian Federation",
          "count": 5
        },
        {
          "country": "Serbia",
          "count": 5
        },
        {
          "country": "Iran",
          "count": 4
        },
        {
          "country": "Spain",
          "count": 4
        },
        {
          "country": "Switzerland",
          "count": 4
        },
        {
          "country": "Ukraine",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Chile",
          "count": 3
        },
        {
          "country": "El Salvador",
          "count": 3
        },
        {
          "country": "France",
          "count": 3
        },
        {
          "country": "Ireland",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Portugal",
          "count": 3
        },
        {
          "country": "Romania",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        },
        {
          "country": "Thailand",
          "count": 3
        },
        {
          "country": "Zimbabwe",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "New Zealand",
          "count": 18
        },
        {
          "country": "England",
          "count": 15
        },
        {
          "country": "Italy",
          "count": 10
        },
        {
          "country": "Portugal",
          "count": 8
        },
        {
          "country": "Ireland",
          "count": 7
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 6
        },
        {
          "country": "Colombia",
          "count": 6
        },
        {
          "country": "Pakistan",
          "count": 6
        },
        {
          "country": "Thailand",
          "count": 6
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 5
        },
        {
          "country": "Malaysia",
          "count": 5
        },
        {
          "country": "Poland",
          "count": 5
        },
        {
          "country": "Bangladesh",
          "count": 4
        },
        {
          "country": "Brazil",
          "count": 3
        },
        {
          "country": "Philippines",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        },
        {
          "country": "Yemen",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "eastgardens",
    "name": "Eastgardens",
    "totals": {
      "all": 2202,
      "locals": 808,
      "internationals": 1394
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 498
        },
        {
          "country": "Ireland",
          "count": 215
        },
        {
          "country": "Brazil",
          "count": 195
        },
        {
          "country": "Indonesia",
          "count": 141
        },
        {
          "country": "England",
          "count": 127
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 71
        },
        {
          "country": "South Africa",
          "count": 54
        },
        {
          "country": "Philippines",
          "count": 49
        },
        {
          "country": "New Zealand",
          "count": 46
        },
        {
          "country": "India",
          "count": 39
        },
        {
          "country": "Malaysia",
          "count": 33
        },
        {
          "country": "Colombia",
          "count": 31
        },
        {
          "country": "Taiwan",
          "count": 31
        },
        {
          "country": "Chile",
          "count": 29
        },
        {
          "country": "Italy",
          "count": 25
        },
        {
          "country": "Singapore",
          "count": 25
        },
        {
          "country": "Russian Federation",
          "count": 24
        },
        {
          "country": "Scotland",
          "count": 24
        },
        {
          "country": "Ukraine",
          "count": 23
        },
        {
          "country": "Greece",
          "count": 21
        },
        {
          "country": "Iran",
          "count": 20
        },
        {
          "country": "Thailand",
          "count": 20
        },
        {
          "country": "Northern Ireland",
          "count": 18
        },
        {
          "country": "Saudi Arabia",
          "count": 18
        },
        {
          "country": "United States of America",
          "count": 17
        },
        {
          "country": "Vietnam",
          "count": 17
        },
        {
          "country": "Egypt",
          "count": 16
        },
        {
          "country": "Malta",
          "count": 16
        },
        {
          "country": "France",
          "count": 15
        },
        {
          "country": "Lebanon",
          "count": 15
        },
        {
          "country": "Pakistan",
          "count": 15
        },
        {
          "country": "Sri Lanka",
          "count": 14
        },
        {
          "country": "Wales",
          "count": 14
        },
        {
          "country": "Germany",
          "count": 12
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 12
        },
        {
          "country": "Cyprus",
          "count": 11
        },
        {
          "country": "Serbia",
          "count": 11
        },
        {
          "country": "Timor-Leste",
          "count": 11
        },
        {
          "country": "Bangladesh",
          "count": 10
        },
        {
          "country": "Mongolia",
          "count": 10
        },
        {
          "country": "Peru",
          "count": 10
        },
        {
          "country": "Poland",
          "count": 9
        },
        {
          "country": "Turkey",
          "count": 9
        },
        {
          "country": "Zimbabwe",
          "count": 9
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 8
        },
        {
          "country": "Israel",
          "count": 8
        },
        {
          "country": "Mauritius",
          "count": 8
        },
        {
          "country": "Canada",
          "count": 7
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Rwanda",
          "count": 7
        },
        {
          "country": "Slovakia",
          "count": 7
        },
        {
          "country": "Spain",
          "count": 7
        },
        {
          "country": "Iraq",
          "count": 6
        },
        {
          "country": "Kazakhstan",
          "count": 6
        },
        {
          "country": "Netherlands",
          "count": 6
        },
        {
          "country": "Tajikistan",
          "count": 6
        },
        {
          "country": "Brunei Darussalam",
          "count": 5
        },
        {
          "country": "Ecuador",
          "count": 5
        },
        {
          "country": "Jersey",
          "count": 5
        },
        {
          "country": "Sierra Leone",
          "count": 5
        },
        {
          "country": "Afghanistan",
          "count": 4
        },
        {
          "country": "Bolivia",
          "count": 4
        },
        {
          "country": "Croatia",
          "count": 4
        },
        {
          "country": "Macau (SAR of China)",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Algeria",
          "count": 3
        },
        {
          "country": "Japan",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 90
        },
        {
          "country": "Ireland",
          "count": 53
        },
        {
          "country": "Indonesia",
          "count": 45
        },
        {
          "country": "England",
          "count": 44
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 39
        },
        {
          "country": "South Africa",
          "count": 39
        },
        {
          "country": "Philippines",
          "count": 26
        },
        {
          "country": "Chile",
          "count": 25
        },
        {
          "country": "Greece",
          "count": 21
        },
        {
          "country": "Brazil",
          "count": 19
        },
        {
          "country": "India",
          "count": 17
        },
        {
          "country": "Taiwan",
          "count": 17
        },
        {
          "country": "Egypt",
          "count": 16
        },
        {
          "country": "Italy",
          "count": 16
        },
        {
          "country": "Malaysia",
          "count": 16
        },
        {
          "country": "Malta",
          "count": 16
        },
        {
          "country": "Lebanon",
          "count": 15
        },
        {
          "country": "Thailand",
          "count": 13
        },
        {
          "country": "Singapore",
          "count": 12
        },
        {
          "country": "Ukraine",
          "count": 12
        },
        {
          "country": "Cyprus",
          "count": 11
        },
        {
          "country": "Serbia",
          "count": 11
        },
        {
          "country": "Timor-Leste",
          "count": 11
        },
        {
          "country": "Bangladesh",
          "count": 10
        },
        {
          "country": "Iran",
          "count": 9
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 9
        },
        {
          "country": "New Zealand",
          "count": 9
        },
        {
          "country": "Russian Federation",
          "count": 9
        },
        {
          "country": "Sri Lanka",
          "count": 9
        },
        {
          "country": "Turkey",
          "count": 9
        },
        {
          "country": "Vietnam",
          "count": 9
        },
        {
          "country": "Zimbabwe",
          "count": 9
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 8
        },
        {
          "country": "Mauritius",
          "count": 8
        },
        {
          "country": "Colombia",
          "count": 7
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Northern Ireland",
          "count": 7
        },
        {
          "country": "Rwanda",
          "count": 7
        },
        {
          "country": "United States of America",
          "count": 7
        },
        {
          "country": "Iraq",
          "count": 6
        },
        {
          "country": "Kazakhstan",
          "count": 6
        },
        {
          "country": "Tajikistan",
          "count": 6
        },
        {
          "country": "Brunei Darussalam",
          "count": 5
        },
        {
          "country": "Ecuador",
          "count": 5
        },
        {
          "country": "Germany",
          "count": 5
        },
        {
          "country": "Israel",
          "count": 5
        },
        {
          "country": "Sierra Leone",
          "count": 5
        },
        {
          "country": "Afghanistan",
          "count": 4
        },
        {
          "country": "Croatia",
          "count": 4
        },
        {
          "country": "Poland",
          "count": 4
        },
        {
          "country": "Scotland",
          "count": 4
        },
        {
          "country": "Slovakia",
          "count": 4
        },
        {
          "country": "Spain",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Algeria",
          "count": 3
        },
        {
          "country": "France",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Pakistan",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 408
        },
        {
          "country": "Brazil",
          "count": 176
        },
        {
          "country": "Ireland",
          "count": 162
        },
        {
          "country": "Indonesia",
          "count": 96
        },
        {
          "country": "England",
          "count": 83
        },
        {
          "country": "New Zealand",
          "count": 37
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 32
        },
        {
          "country": "Colombia",
          "count": 24
        },
        {
          "country": "Philippines",
          "count": 23
        },
        {
          "country": "India",
          "count": 22
        },
        {
          "country": "Scotland",
          "count": 20
        },
        {
          "country": "Saudi Arabia",
          "count": 18
        },
        {
          "country": "Malaysia",
          "count": 17
        },
        {
          "country": "Russian Federation",
          "count": 15
        },
        {
          "country": "South Africa",
          "count": 15
        },
        {
          "country": "Taiwan",
          "count": 14
        },
        {
          "country": "Wales",
          "count": 14
        },
        {
          "country": "Singapore",
          "count": 13
        },
        {
          "country": "France",
          "count": 12
        },
        {
          "country": "Pakistan",
          "count": 12
        },
        {
          "country": "Iran",
          "count": 11
        },
        {
          "country": "Northern Ireland",
          "count": 11
        },
        {
          "country": "Ukraine",
          "count": 11
        },
        {
          "country": "Mongolia",
          "count": 10
        },
        {
          "country": "Peru",
          "count": 10
        },
        {
          "country": "United States of America",
          "count": 10
        },
        {
          "country": "Italy",
          "count": 9
        },
        {
          "country": "Vietnam",
          "count": 8
        },
        {
          "country": "Canada",
          "count": 7
        },
        {
          "country": "Germany",
          "count": 7
        },
        {
          "country": "Thailand",
          "count": 7
        },
        {
          "country": "Netherlands",
          "count": 6
        },
        {
          "country": "Jersey",
          "count": 5
        },
        {
          "country": "Poland",
          "count": 5
        },
        {
          "country": "Sri Lanka",
          "count": 5
        },
        {
          "country": "Bolivia",
          "count": 4
        },
        {
          "country": "Chile",
          "count": 4
        },
        {
          "country": "Macau (SAR of China)",
          "count": 4
        },
        {
          "country": "Israel",
          "count": 3
        },
        {
          "country": "Japan",
          "count": 3
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "eastlakes",
    "name": "Eastlakes",
    "totals": {
      "all": 3158,
      "locals": 2115,
      "internationals": 1043
    },
    "mixes": {
      "all": [
        {
          "country": "Bangladesh",
          "count": 381
        },
        {
          "country": "Indonesia",
          "count": 276
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 191
        },
        {
          "country": "Philippines",
          "count": 184
        },
        {
          "country": "Greece",
          "count": 163
        },
        {
          "country": "Turkey",
          "count": 152
        },
        {
          "country": "India",
          "count": 150
        },
        {
          "country": "Iraq",
          "count": 122
        },
        {
          "country": "New Zealand",
          "count": 87
        },
        {
          "country": "Italy",
          "count": 82
        },
        {
          "country": "England",
          "count": 74
        },
        {
          "country": "Pakistan",
          "count": 74
        },
        {
          "country": "Egypt",
          "count": 70
        },
        {
          "country": "Malaysia",
          "count": 64
        },
        {
          "country": "Thailand",
          "count": 57
        },
        {
          "country": "Ukraine",
          "count": 55
        },
        {
          "country": "Chile",
          "count": 53
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 47
        },
        {
          "country": "Ireland",
          "count": 47
        },
        {
          "country": "Cyprus",
          "count": 44
        },
        {
          "country": "Lebanon",
          "count": 37
        },
        {
          "country": "Russian Federation",
          "count": 37
        },
        {
          "country": "Brazil",
          "count": 35
        },
        {
          "country": "Vietnam",
          "count": 32
        },
        {
          "country": "Portugal",
          "count": 29
        },
        {
          "country": "Colombia",
          "count": 27
        },
        {
          "country": "Peru",
          "count": 25
        },
        {
          "country": "Iran",
          "count": 23
        },
        {
          "country": "Nepal",
          "count": 22
        },
        {
          "country": "Serbia",
          "count": 22
        },
        {
          "country": "Sudan",
          "count": 20
        },
        {
          "country": "Sri Lanka",
          "count": 19
        },
        {
          "country": "Argentina",
          "count": 16
        },
        {
          "country": "Ecuador",
          "count": 16
        },
        {
          "country": "South Africa",
          "count": 16
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 15
        },
        {
          "country": "Malta",
          "count": 15
        },
        {
          "country": "Nigeria",
          "count": 15
        },
        {
          "country": "Uruguay",
          "count": 15
        },
        {
          "country": "Japan",
          "count": 14
        },
        {
          "country": "Mongolia",
          "count": 14
        },
        {
          "country": "North Macedonia",
          "count": 14
        },
        {
          "country": "Hungary",
          "count": 12
        },
        {
          "country": "Scotland",
          "count": 12
        },
        {
          "country": "Singapore",
          "count": 12
        },
        {
          "country": "Spain",
          "count": 12
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 11
        },
        {
          "country": "France",
          "count": 11
        },
        {
          "country": "Croatia",
          "count": 10
        },
        {
          "country": "Germany",
          "count": 10
        },
        {
          "country": "Poland",
          "count": 10
        },
        {
          "country": "United States of America",
          "count": 10
        },
        {
          "country": "Bhutan",
          "count": 9
        },
        {
          "country": "Bolivia",
          "count": 9
        },
        {
          "country": "Burundi",
          "count": 9
        },
        {
          "country": "El Salvador",
          "count": 9
        },
        {
          "country": "Syria",
          "count": 9
        },
        {
          "country": "Uzbekistan",
          "count": 9
        },
        {
          "country": "Afghanistan",
          "count": 8
        },
        {
          "country": "Northern Ireland",
          "count": 8
        },
        {
          "country": "Taiwan",
          "count": 8
        },
        {
          "country": "Saudi Arabia",
          "count": 7
        },
        {
          "country": "Mexico",
          "count": 6
        },
        {
          "country": "Canada",
          "count": 5
        },
        {
          "country": "Moldova",
          "count": 5
        },
        {
          "country": "Romania",
          "count": 5
        },
        {
          "country": "Slovakia",
          "count": 5
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Czechia",
          "count": 4
        },
        {
          "country": "Israel",
          "count": 4
        },
        {
          "country": "Kazakhstan",
          "count": 4
        },
        {
          "country": "Venezuela",
          "count": 4
        },
        {
          "country": "Belarus",
          "count": 3
        },
        {
          "country": "Cambodia",
          "count": 3
        },
        {
          "country": "Cuba",
          "count": 3
        },
        {
          "country": "Ethiopia",
          "count": 3
        },
        {
          "country": "Myanmar",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Qatar",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Bangladesh",
          "count": 225
        },
        {
          "country": "Greece",
          "count": 163
        },
        {
          "country": "Turkey",
          "count": 136
        },
        {
          "country": "Indonesia",
          "count": 129
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 123
        },
        {
          "country": "Philippines",
          "count": 122
        },
        {
          "country": "Iraq",
          "count": 106
        },
        {
          "country": "Egypt",
          "count": 70
        },
        {
          "country": "India",
          "count": 58
        },
        {
          "country": "Italy",
          "count": 55
        },
        {
          "country": "Ukraine",
          "count": 51
        },
        {
          "country": "England",
          "count": 50
        },
        {
          "country": "Chile",
          "count": 44
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 41
        },
        {
          "country": "Cyprus",
          "count": 40
        },
        {
          "country": "New Zealand",
          "count": 38
        },
        {
          "country": "Lebanon",
          "count": 37
        },
        {
          "country": "Pakistan",
          "count": 33
        },
        {
          "country": "Malaysia",
          "count": 32
        },
        {
          "country": "Russian Federation",
          "count": 32
        },
        {
          "country": "Thailand",
          "count": 31
        },
        {
          "country": "Ireland",
          "count": 27
        },
        {
          "country": "Iran",
          "count": 20
        },
        {
          "country": "Peru",
          "count": 20
        },
        {
          "country": "Sudan",
          "count": 20
        },
        {
          "country": "Vietnam",
          "count": 20
        },
        {
          "country": "Serbia",
          "count": 19
        },
        {
          "country": "Ecuador",
          "count": 16
        },
        {
          "country": "South Africa",
          "count": 16
        },
        {
          "country": "Malta",
          "count": 15
        },
        {
          "country": "Uruguay",
          "count": 15
        },
        {
          "country": "North Macedonia",
          "count": 14
        },
        {
          "country": "Portugal",
          "count": 14
        },
        {
          "country": "Sri Lanka",
          "count": 14
        },
        {
          "country": "Argentina",
          "count": 13
        },
        {
          "country": "Brazil",
          "count": 13
        },
        {
          "country": "Colombia",
          "count": 13
        },
        {
          "country": "Hungary",
          "count": 12
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 12
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 11
        },
        {
          "country": "Germany",
          "count": 10
        },
        {
          "country": "Poland",
          "count": 10
        },
        {
          "country": "Bolivia",
          "count": 9
        },
        {
          "country": "El Salvador",
          "count": 9
        },
        {
          "country": "Syria",
          "count": 9
        },
        {
          "country": "Uzbekistan",
          "count": 9
        },
        {
          "country": "Afghanistan",
          "count": 8
        },
        {
          "country": "Singapore",
          "count": 8
        },
        {
          "country": "Croatia",
          "count": 7
        },
        {
          "country": "Scotland",
          "count": 7
        },
        {
          "country": "Spain",
          "count": 7
        },
        {
          "country": "France",
          "count": 6
        },
        {
          "country": "Canada",
          "count": 5
        },
        {
          "country": "Moldova",
          "count": 5
        },
        {
          "country": "Romania",
          "count": 5
        },
        {
          "country": "Slovakia",
          "count": 5
        },
        {
          "country": "Taiwan",
          "count": 5
        },
        {
          "country": "United States of America",
          "count": 5
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Czechia",
          "count": 4
        },
        {
          "country": "Israel",
          "count": 4
        },
        {
          "country": "Kazakhstan",
          "count": 4
        },
        {
          "country": "Mongolia",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Venezuela",
          "count": 4
        },
        {
          "country": "Belarus",
          "count": 3
        },
        {
          "country": "Burundi",
          "count": 3
        },
        {
          "country": "Cambodia",
          "count": 3
        },
        {
          "country": "Cuba",
          "count": 3
        },
        {
          "country": "Myanmar",
          "count": 3
        },
        {
          "country": "Nepal",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Northern Ireland",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Bangladesh",
          "count": 156
        },
        {
          "country": "Indonesia",
          "count": 147
        },
        {
          "country": "India",
          "count": 92
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 68
        },
        {
          "country": "Philippines",
          "count": 62
        },
        {
          "country": "New Zealand",
          "count": 49
        },
        {
          "country": "Pakistan",
          "count": 41
        },
        {
          "country": "Malaysia",
          "count": 32
        },
        {
          "country": "Italy",
          "count": 27
        },
        {
          "country": "Thailand",
          "count": 26
        },
        {
          "country": "England",
          "count": 24
        },
        {
          "country": "Brazil",
          "count": 22
        },
        {
          "country": "Ireland",
          "count": 20
        },
        {
          "country": "Nepal",
          "count": 19
        },
        {
          "country": "Iraq",
          "count": 16
        },
        {
          "country": "Turkey",
          "count": 16
        },
        {
          "country": "Nigeria",
          "count": 15
        },
        {
          "country": "Portugal",
          "count": 15
        },
        {
          "country": "Colombia",
          "count": 14
        },
        {
          "country": "Japan",
          "count": 14
        },
        {
          "country": "Vietnam",
          "count": 12
        },
        {
          "country": "Mongolia",
          "count": 10
        },
        {
          "country": "Bhutan",
          "count": 9
        },
        {
          "country": "Chile",
          "count": 9
        },
        {
          "country": "Burundi",
          "count": 6
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 6
        },
        {
          "country": "Mexico",
          "count": 6
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Northern Ireland",
          "count": 5
        },
        {
          "country": "Peru",
          "count": 5
        },
        {
          "country": "Russian Federation",
          "count": 5
        },
        {
          "country": "Scotland",
          "count": 5
        },
        {
          "country": "Spain",
          "count": 5
        },
        {
          "country": "Sri Lanka",
          "count": 5
        },
        {
          "country": "United States of America",
          "count": 5
        },
        {
          "country": "Cyprus",
          "count": 4
        },
        {
          "country": "Singapore",
          "count": 4
        },
        {
          "country": "Ukraine",
          "count": 4
        },
        {
          "country": "Argentina",
          "count": 3
        },
        {
          "country": "Croatia",
          "count": 3
        },
        {
          "country": "Ethiopia",
          "count": 3
        },
        {
          "country": "Iran",
          "count": 3
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 3
        },
        {
          "country": "Qatar",
          "count": 3
        },
        {
          "country": "Saudi Arabia",
          "count": 3
        },
        {
          "country": "Serbia",
          "count": 3
        },
        {
          "country": "Taiwan",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "hillsdale",
    "name": "Hillsdale",
    "totals": {
      "all": 2755,
      "locals": 1606,
      "internationals": 1149
    },
    "mixes": {
      "all": [
        {
          "country": "Bangladesh",
          "count": 215
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 189
        },
        {
          "country": "Philippines",
          "count": 186
        },
        {
          "country": "Brazil",
          "count": 181
        },
        {
          "country": "Ireland",
          "count": 165
        },
        {
          "country": "Iraq",
          "count": 158
        },
        {
          "country": "India",
          "count": 150
        },
        {
          "country": "Indonesia",
          "count": 129
        },
        {
          "country": "England",
          "count": 127
        },
        {
          "country": "New Zealand",
          "count": 120
        },
        {
          "country": "Chile",
          "count": 88
        },
        {
          "country": "Turkey",
          "count": 56
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 48
        },
        {
          "country": "Russian Federation",
          "count": 39
        },
        {
          "country": "Italy",
          "count": 38
        },
        {
          "country": "Malaysia",
          "count": 38
        },
        {
          "country": "Thailand",
          "count": 34
        },
        {
          "country": "Timor-Leste",
          "count": 34
        },
        {
          "country": "Colombia",
          "count": 31
        },
        {
          "country": "Iran",
          "count": 27
        },
        {
          "country": "Ukraine",
          "count": 27
        },
        {
          "country": "United States of America",
          "count": 27
        },
        {
          "country": "Poland",
          "count": 26
        },
        {
          "country": "Scotland",
          "count": 25
        },
        {
          "country": "South Africa",
          "count": 25
        },
        {
          "country": "Argentina",
          "count": 24
        },
        {
          "country": "Vietnam",
          "count": 23
        },
        {
          "country": "Egypt",
          "count": 22
        },
        {
          "country": "Peru",
          "count": 22
        },
        {
          "country": "Pakistan",
          "count": 21
        },
        {
          "country": "Lebanon",
          "count": 19
        },
        {
          "country": "Northern Ireland",
          "count": 18
        },
        {
          "country": "Hungary",
          "count": 17
        },
        {
          "country": "Malta",
          "count": 17
        },
        {
          "country": "Germany",
          "count": 16
        },
        {
          "country": "Japan",
          "count": 16
        },
        {
          "country": "Serbia",
          "count": 16
        },
        {
          "country": "Sri Lanka",
          "count": 16
        },
        {
          "country": "Syria",
          "count": 16
        },
        {
          "country": "Canada",
          "count": 15
        },
        {
          "country": "Croatia",
          "count": 15
        },
        {
          "country": "Israel",
          "count": 15
        },
        {
          "country": "Nepal",
          "count": 15
        },
        {
          "country": "Portugal",
          "count": 15
        },
        {
          "country": "Singapore",
          "count": 15
        },
        {
          "country": "France",
          "count": 14
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 14
        },
        {
          "country": "Uruguay",
          "count": 14
        },
        {
          "country": "Cambodia",
          "count": 11
        },
        {
          "country": "Mauritius",
          "count": 11
        },
        {
          "country": "Slovakia",
          "count": 11
        },
        {
          "country": "Venezuela",
          "count": 11
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 10
        },
        {
          "country": "Czechia",
          "count": 10
        },
        {
          "country": "Greece",
          "count": 8
        },
        {
          "country": "Ecuador",
          "count": 7
        },
        {
          "country": "Ethiopia",
          "count": 7
        },
        {
          "country": "Lithuania",
          "count": 7
        },
        {
          "country": "Romania",
          "count": 7
        },
        {
          "country": "Spain",
          "count": 7
        },
        {
          "country": "Mongolia",
          "count": 6
        },
        {
          "country": "Saudi Arabia",
          "count": 6
        },
        {
          "country": "Switzerland",
          "count": 6
        },
        {
          "country": "Algeria",
          "count": 5
        },
        {
          "country": "Cyprus",
          "count": 5
        },
        {
          "country": "Nicaragua",
          "count": 5
        },
        {
          "country": "Belarus",
          "count": 4
        },
        {
          "country": "Kazakhstan",
          "count": 4
        },
        {
          "country": "Taiwan",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Jordan",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Bangladesh",
          "count": 177
        },
        {
          "country": "Philippines",
          "count": 132
        },
        {
          "country": "Iraq",
          "count": 112
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 81
        },
        {
          "country": "Indonesia",
          "count": 70
        },
        {
          "country": "England",
          "count": 68
        },
        {
          "country": "Ireland",
          "count": 64
        },
        {
          "country": "India",
          "count": 63
        },
        {
          "country": "Chile",
          "count": 60
        },
        {
          "country": "Turkey",
          "count": 53
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 35
        },
        {
          "country": "Brazil",
          "count": 34
        },
        {
          "country": "Timor-Leste",
          "count": 34
        },
        {
          "country": "Italy",
          "count": 31
        },
        {
          "country": "New Zealand",
          "count": 31
        },
        {
          "country": "Russian Federation",
          "count": 27
        },
        {
          "country": "Ukraine",
          "count": 27
        },
        {
          "country": "Poland",
          "count": 21
        },
        {
          "country": "South Africa",
          "count": 21
        },
        {
          "country": "Lebanon",
          "count": 19
        },
        {
          "country": "Thailand",
          "count": 19
        },
        {
          "country": "Peru",
          "count": 18
        },
        {
          "country": "Egypt",
          "count": 17
        },
        {
          "country": "Vietnam",
          "count": 17
        },
        {
          "country": "Malaysia",
          "count": 16
        },
        {
          "country": "Serbia",
          "count": 16
        },
        {
          "country": "Argentina",
          "count": 15
        },
        {
          "country": "Croatia",
          "count": 15
        },
        {
          "country": "Iran",
          "count": 15
        },
        {
          "country": "Hungary",
          "count": 14
        },
        {
          "country": "Scotland",
          "count": 14
        },
        {
          "country": "Uruguay",
          "count": 14
        },
        {
          "country": "Sri Lanka",
          "count": 13
        },
        {
          "country": "Malta",
          "count": 12
        },
        {
          "country": "Cambodia",
          "count": 11
        },
        {
          "country": "Colombia",
          "count": 11
        },
        {
          "country": "France",
          "count": 11
        },
        {
          "country": "Mauritius",
          "count": 11
        },
        {
          "country": "Portugal",
          "count": 11
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 10
        },
        {
          "country": "Canada",
          "count": 10
        },
        {
          "country": "Czechia",
          "count": 10
        },
        {
          "country": "United States of America",
          "count": 10
        },
        {
          "country": "Germany",
          "count": 9
        },
        {
          "country": "Israel",
          "count": 9
        },
        {
          "country": "Northern Ireland",
          "count": 9
        },
        {
          "country": "Greece",
          "count": 8
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 8
        },
        {
          "country": "Slovakia",
          "count": 8
        },
        {
          "country": "Ethiopia",
          "count": 7
        },
        {
          "country": "Romania",
          "count": 7
        },
        {
          "country": "Singapore",
          "count": 7
        },
        {
          "country": "Spain",
          "count": 7
        },
        {
          "country": "Japan",
          "count": 6
        },
        {
          "country": "Nepal",
          "count": 6
        },
        {
          "country": "Switzerland",
          "count": 6
        },
        {
          "country": "Algeria",
          "count": 5
        },
        {
          "country": "Cyprus",
          "count": 5
        },
        {
          "country": "Nicaragua",
          "count": 5
        },
        {
          "country": "Kazakhstan",
          "count": 4
        },
        {
          "country": "Lithuania",
          "count": 4
        },
        {
          "country": "Taiwan",
          "count": 4
        },
        {
          "country": "Venezuela",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Pakistan",
          "count": 3
        },
        {
          "country": "Syria",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Brazil",
          "count": 147
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 108
        },
        {
          "country": "Ireland",
          "count": 101
        },
        {
          "country": "New Zealand",
          "count": 89
        },
        {
          "country": "India",
          "count": 87
        },
        {
          "country": "England",
          "count": 59
        },
        {
          "country": "Indonesia",
          "count": 59
        },
        {
          "country": "Philippines",
          "count": 54
        },
        {
          "country": "Iraq",
          "count": 46
        },
        {
          "country": "Bangladesh",
          "count": 38
        },
        {
          "country": "Chile",
          "count": 28
        },
        {
          "country": "Malaysia",
          "count": 22
        },
        {
          "country": "Colombia",
          "count": 20
        },
        {
          "country": "Pakistan",
          "count": 18
        },
        {
          "country": "United States of America",
          "count": 17
        },
        {
          "country": "Thailand",
          "count": 15
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 13
        },
        {
          "country": "Syria",
          "count": 13
        },
        {
          "country": "Iran",
          "count": 12
        },
        {
          "country": "Russian Federation",
          "count": 12
        },
        {
          "country": "Scotland",
          "count": 11
        },
        {
          "country": "Japan",
          "count": 10
        },
        {
          "country": "Argentina",
          "count": 9
        },
        {
          "country": "Nepal",
          "count": 9
        },
        {
          "country": "Northern Ireland",
          "count": 9
        },
        {
          "country": "Singapore",
          "count": 8
        },
        {
          "country": "Germany",
          "count": 7
        },
        {
          "country": "Italy",
          "count": 7
        },
        {
          "country": "Venezuela",
          "count": 7
        },
        {
          "country": "Israel",
          "count": 6
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 6
        },
        {
          "country": "Mongolia",
          "count": 6
        },
        {
          "country": "Saudi Arabia",
          "count": 6
        },
        {
          "country": "Vietnam",
          "count": 6
        },
        {
          "country": "Canada",
          "count": 5
        },
        {
          "country": "Egypt",
          "count": 5
        },
        {
          "country": "Malta",
          "count": 5
        },
        {
          "country": "Poland",
          "count": 5
        },
        {
          "country": "Belarus",
          "count": 4
        },
        {
          "country": "Ecuador",
          "count": 4
        },
        {
          "country": "Peru",
          "count": 4
        },
        {
          "country": "Portugal",
          "count": 4
        },
        {
          "country": "South Africa",
          "count": 4
        },
        {
          "country": "France",
          "count": 3
        },
        {
          "country": "Hungary",
          "count": 3
        },
        {
          "country": "Jordan",
          "count": 3
        },
        {
          "country": "Lithuania",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Slovakia",
          "count": 3
        },
        {
          "country": "Sri Lanka",
          "count": 3
        },
        {
          "country": "Turkey",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "kingsgrove",
    "name": "Kingsgrove",
    "totals": {
      "all": 4955,
      "locals": 3866,
      "internationals": 1089
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1022
        },
        {
          "country": "Greece",
          "count": 665
        },
        {
          "country": "Lebanon",
          "count": 320
        },
        {
          "country": "Vietnam",
          "count": 282
        },
        {
          "country": "Italy",
          "count": 242
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 239
        },
        {
          "country": "Indonesia",
          "count": 216
        },
        {
          "country": "New Zealand",
          "count": 170
        },
        {
          "country": "Philippines",
          "count": 152
        },
        {
          "country": "Portugal",
          "count": 115
        },
        {
          "country": "England",
          "count": 112
        },
        {
          "country": "Cyprus",
          "count": 101
        },
        {
          "country": "Egypt",
          "count": 97
        },
        {
          "country": "Malaysia",
          "count": 94
        },
        {
          "country": "India",
          "count": 83
        },
        {
          "country": "Thailand",
          "count": 78
        },
        {
          "country": "North Macedonia",
          "count": 59
        },
        {
          "country": "Croatia",
          "count": 51
        },
        {
          "country": "Brazil",
          "count": 46
        },
        {
          "country": "Taiwan",
          "count": 42
        },
        {
          "country": "Turkey",
          "count": 39
        },
        {
          "country": "Colombia",
          "count": 37
        },
        {
          "country": "Singapore",
          "count": 37
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 32
        },
        {
          "country": "Germany",
          "count": 30
        },
        {
          "country": "Nepal",
          "count": 29
        },
        {
          "country": "Sri Lanka",
          "count": 29
        },
        {
          "country": "United States of America",
          "count": 28
        },
        {
          "country": "Argentina",
          "count": 24
        },
        {
          "country": "Ireland",
          "count": 22
        },
        {
          "country": "Japan",
          "count": 22
        },
        {
          "country": "Malta",
          "count": 22
        },
        {
          "country": "South Africa",
          "count": 21
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 20
        },
        {
          "country": "Chile",
          "count": 19
        },
        {
          "country": "Hungary",
          "count": 19
        },
        {
          "country": "France",
          "count": 18
        },
        {
          "country": "Scotland",
          "count": 16
        },
        {
          "country": "Uruguay",
          "count": 16
        },
        {
          "country": "Sudan",
          "count": 15
        },
        {
          "country": "Canada",
          "count": 14
        },
        {
          "country": "Peru",
          "count": 14
        },
        {
          "country": "Timor-Leste",
          "count": 14
        },
        {
          "country": "Bangladesh",
          "count": 13
        },
        {
          "country": "Iran",
          "count": 13
        },
        {
          "country": "Pakistan",
          "count": 13
        },
        {
          "country": "Spain",
          "count": 11
        },
        {
          "country": "Syria",
          "count": 11
        },
        {
          "country": "Poland",
          "count": 10
        },
        {
          "country": "Cambodia",
          "count": 9
        },
        {
          "country": "Jordan",
          "count": 9
        },
        {
          "country": "Myanmar",
          "count": 9
        },
        {
          "country": "Serbia",
          "count": 9
        },
        {
          "country": "Zimbabwe",
          "count": 9
        },
        {
          "country": "Macau (SAR of China)",
          "count": 8
        },
        {
          "country": "Ghana",
          "count": 7
        },
        {
          "country": "Nigeria",
          "count": 7
        },
        {
          "country": "Iraq",
          "count": 6
        },
        {
          "country": "Northern Ireland",
          "count": 6
        },
        {
          "country": "Slovakia",
          "count": 6
        },
        {
          "country": "Eritrea",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 5
        },
        {
          "country": "United Arab Emirates",
          "count": 5
        },
        {
          "country": "Albania",
          "count": 4
        },
        {
          "country": "Bolivia",
          "count": 4
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Israel",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Netherlands",
          "count": 4
        },
        {
          "country": "Romania",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Slovenia",
          "count": 4
        },
        {
          "country": "Somalia",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Laos",
          "count": 3
        },
        {
          "country": "Mongolia",
          "count": 3
        },
        {
          "country": "Russian Federation",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        },
        {
          "country": "Ukraine",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 725
        },
        {
          "country": "Greece",
          "count": 647
        },
        {
          "country": "Lebanon",
          "count": 302
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 226
        },
        {
          "country": "Vietnam",
          "count": 214
        },
        {
          "country": "Italy",
          "count": 200
        },
        {
          "country": "Indonesia",
          "count": 123
        },
        {
          "country": "Philippines",
          "count": 105
        },
        {
          "country": "Cyprus",
          "count": 95
        },
        {
          "country": "Egypt",
          "count": 94
        },
        {
          "country": "England",
          "count": 89
        },
        {
          "country": "Portugal",
          "count": 85
        },
        {
          "country": "Malaysia",
          "count": 62
        },
        {
          "country": "New Zealand",
          "count": 61
        },
        {
          "country": "North Macedonia",
          "count": 59
        },
        {
          "country": "India",
          "count": 58
        },
        {
          "country": "Croatia",
          "count": 51
        },
        {
          "country": "Thailand",
          "count": 50
        },
        {
          "country": "Turkey",
          "count": 39
        },
        {
          "country": "Sri Lanka",
          "count": 25
        },
        {
          "country": "Taiwan",
          "count": 25
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 24
        },
        {
          "country": "Malta",
          "count": 22
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 20
        },
        {
          "country": "Chile",
          "count": 19
        },
        {
          "country": "Hungary",
          "count": 19
        },
        {
          "country": "Ireland",
          "count": 19
        },
        {
          "country": "Argentina",
          "count": 18
        },
        {
          "country": "Colombia",
          "count": 18
        },
        {
          "country": "South Africa",
          "count": 18
        },
        {
          "country": "United States of America",
          "count": 18
        },
        {
          "country": "Singapore",
          "count": 17
        },
        {
          "country": "Uruguay",
          "count": 16
        },
        {
          "country": "France",
          "count": 15
        },
        {
          "country": "Sudan",
          "count": 15
        },
        {
          "country": "Germany",
          "count": 14
        },
        {
          "country": "Timor-Leste",
          "count": 14
        },
        {
          "country": "Brazil",
          "count": 12
        },
        {
          "country": "Peru",
          "count": 11
        },
        {
          "country": "Spain",
          "count": 11
        },
        {
          "country": "Syria",
          "count": 11
        },
        {
          "country": "Poland",
          "count": 10
        },
        {
          "country": "Canada",
          "count": 9
        },
        {
          "country": "Scotland",
          "count": 9
        },
        {
          "country": "Serbia",
          "count": 9
        },
        {
          "country": "Iran",
          "count": 8
        },
        {
          "country": "Macau (SAR of China)",
          "count": 8
        },
        {
          "country": "Ghana",
          "count": 7
        },
        {
          "country": "Pakistan",
          "count": 7
        },
        {
          "country": "Cambodia",
          "count": 6
        },
        {
          "country": "Iraq",
          "count": 6
        },
        {
          "country": "Japan",
          "count": 6
        },
        {
          "country": "Northern Ireland",
          "count": 6
        },
        {
          "country": "Slovakia",
          "count": 6
        },
        {
          "country": "Bangladesh",
          "count": 5
        },
        {
          "country": "Eritrea",
          "count": 5
        },
        {
          "country": "Jordan",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 5
        },
        {
          "country": "Myanmar",
          "count": 5
        },
        {
          "country": "United Arab Emirates",
          "count": 5
        },
        {
          "country": "Zimbabwe",
          "count": 5
        },
        {
          "country": "Albania",
          "count": 4
        },
        {
          "country": "Bolivia",
          "count": 4
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Israel",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Netherlands",
          "count": 4
        },
        {
          "country": "Nigeria",
          "count": 4
        },
        {
          "country": "Romania",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Slovenia",
          "count": 4
        },
        {
          "country": "Somalia",
          "count": 4
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Laos",
          "count": 3
        },
        {
          "country": "Nepal",
          "count": 3
        },
        {
          "country": "Russian Federation",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        },
        {
          "country": "Ukraine",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 297
        },
        {
          "country": "New Zealand",
          "count": 109
        },
        {
          "country": "Indonesia",
          "count": 93
        },
        {
          "country": "Vietnam",
          "count": 68
        },
        {
          "country": "Philippines",
          "count": 47
        },
        {
          "country": "Italy",
          "count": 42
        },
        {
          "country": "Brazil",
          "count": 34
        },
        {
          "country": "Malaysia",
          "count": 32
        },
        {
          "country": "Portugal",
          "count": 30
        },
        {
          "country": "Thailand",
          "count": 28
        },
        {
          "country": "Nepal",
          "count": 26
        },
        {
          "country": "India",
          "count": 25
        },
        {
          "country": "England",
          "count": 23
        },
        {
          "country": "Singapore",
          "count": 20
        },
        {
          "country": "Colombia",
          "count": 19
        },
        {
          "country": "Greece",
          "count": 18
        },
        {
          "country": "Lebanon",
          "count": 18
        },
        {
          "country": "Taiwan",
          "count": 17
        },
        {
          "country": "Germany",
          "count": 16
        },
        {
          "country": "Japan",
          "count": 16
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 13
        },
        {
          "country": "United States of America",
          "count": 10
        },
        {
          "country": "Bangladesh",
          "count": 8
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 8
        },
        {
          "country": "Scotland",
          "count": 7
        },
        {
          "country": "Argentina",
          "count": 6
        },
        {
          "country": "Cyprus",
          "count": 6
        },
        {
          "country": "Pakistan",
          "count": 6
        },
        {
          "country": "Canada",
          "count": 5
        },
        {
          "country": "Iran",
          "count": 5
        },
        {
          "country": "Jordan",
          "count": 4
        },
        {
          "country": "Myanmar",
          "count": 4
        },
        {
          "country": "Sri Lanka",
          "count": 4
        },
        {
          "country": "Zimbabwe",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Cambodia",
          "count": 3
        },
        {
          "country": "Egypt",
          "count": 3
        },
        {
          "country": "France",
          "count": 3
        },
        {
          "country": "Ireland",
          "count": 3
        },
        {
          "country": "Mongolia",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Peru",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "kogarah",
    "name": "Kogarah",
    "totals": {
      "all": 9392,
      "locals": 4714,
      "internationals": 4678
    },
    "mixes": {
      "all": [
        {
          "country": "Nepal",
          "count": 1846
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1350
        },
        {
          "country": "India",
          "count": 977
        },
        {
          "country": "Philippines",
          "count": 639
        },
        {
          "country": "Bangladesh",
          "count": 470
        },
        {
          "country": "Greece",
          "count": 352
        },
        {
          "country": "North Macedonia",
          "count": 234
        },
        {
          "country": "Brazil",
          "count": 206
        },
        {
          "country": "England",
          "count": 198
        },
        {
          "country": "New Zealand",
          "count": 197
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 195
        },
        {
          "country": "Thailand",
          "count": 183
        },
        {
          "country": "Indonesia",
          "count": 176
        },
        {
          "country": "Colombia",
          "count": 162
        },
        {
          "country": "Vietnam",
          "count": 145
        },
        {
          "country": "Malaysia",
          "count": 139
        },
        {
          "country": "Egypt",
          "count": 127
        },
        {
          "country": "Lebanon",
          "count": 116
        },
        {
          "country": "Italy",
          "count": 112
        },
        {
          "country": "Serbia",
          "count": 75
        },
        {
          "country": "Chile",
          "count": 60
        },
        {
          "country": "Japan",
          "count": 60
        },
        {
          "country": "Mongolia",
          "count": 60
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 59
        },
        {
          "country": "Russian Federation",
          "count": 59
        },
        {
          "country": "Ireland",
          "count": 56
        },
        {
          "country": "Singapore",
          "count": 52
        },
        {
          "country": "South Africa",
          "count": 51
        },
        {
          "country": "Croatia",
          "count": 49
        },
        {
          "country": "Taiwan",
          "count": 44
        },
        {
          "country": "Poland",
          "count": 41
        },
        {
          "country": "Ukraine",
          "count": 40
        },
        {
          "country": "United States of America",
          "count": 37
        },
        {
          "country": "Cyprus",
          "count": 36
        },
        {
          "country": "Portugal",
          "count": 36
        },
        {
          "country": "Turkey",
          "count": 33
        },
        {
          "country": "Sri Lanka",
          "count": 32
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 31
        },
        {
          "country": "Peru",
          "count": 31
        },
        {
          "country": "Germany",
          "count": 30
        },
        {
          "country": "Iran",
          "count": 27
        },
        {
          "country": "Malta",
          "count": 26
        },
        {
          "country": "Pakistan",
          "count": 26
        },
        {
          "country": "Iraq",
          "count": 24
        },
        {
          "country": "France",
          "count": 21
        },
        {
          "country": "Argentina",
          "count": 20
        },
        {
          "country": "Ecuador",
          "count": 19
        },
        {
          "country": "Bulgaria",
          "count": 18
        },
        {
          "country": "Mauritius",
          "count": 18
        },
        {
          "country": "Myanmar",
          "count": 18
        },
        {
          "country": "Uruguay",
          "count": 18
        },
        {
          "country": "Zimbabwe",
          "count": 18
        },
        {
          "country": "Netherlands",
          "count": 16
        },
        {
          "country": "Hungary",
          "count": 15
        },
        {
          "country": "Northern Ireland",
          "count": 15
        },
        {
          "country": "Scotland",
          "count": 15
        },
        {
          "country": "Cambodia",
          "count": 13
        },
        {
          "country": "Spain",
          "count": 13
        },
        {
          "country": "Romania",
          "count": 11
        },
        {
          "country": "Slovakia",
          "count": 11
        },
        {
          "country": "Canada",
          "count": 10
        },
        {
          "country": "Kenya",
          "count": 10
        },
        {
          "country": "Venezuela",
          "count": 10
        },
        {
          "country": "Afghanistan",
          "count": 9
        },
        {
          "country": "Czechia",
          "count": 9
        },
        {
          "country": "Macau (SAR of China)",
          "count": 9
        },
        {
          "country": "Syria",
          "count": 9
        },
        {
          "country": "Laos",
          "count": 8
        },
        {
          "country": "Slovenia",
          "count": 8
        },
        {
          "country": "Wales",
          "count": 8
        },
        {
          "country": "Austria",
          "count": 6
        },
        {
          "country": "Mexico",
          "count": 6
        },
        {
          "country": "Morocco",
          "count": 6
        },
        {
          "country": "Oman",
          "count": 6
        },
        {
          "country": "Timor-Leste",
          "count": 6
        },
        {
          "country": "Zambia",
          "count": 6
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 4
        },
        {
          "country": "Georgia",
          "count": 4
        },
        {
          "country": "Jordan",
          "count": 4
        },
        {
          "country": "Kuwait",
          "count": 4
        },
        {
          "country": "Sudan",
          "count": 4
        },
        {
          "country": "Yemen",
          "count": 4
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Cuba",
          "count": 3
        },
        {
          "country": "Eritrea",
          "count": 3
        },
        {
          "country": "Estonia",
          "count": 3
        },
        {
          "country": "Ghana",
          "count": 3
        },
        {
          "country": "Israel",
          "count": 3
        },
        {
          "country": "Kazakhstan",
          "count": 3
        },
        {
          "country": "Kosovo",
          "count": 3
        },
        {
          "country": "Latvia",
          "count": 3
        },
        {
          "country": "Lithuania",
          "count": 3
        },
        {
          "country": "Moldova",
          "count": 3
        },
        {
          "country": "Sierra Leone",
          "count": 3
        },
        {
          "country": "Tunisia",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        },
        {
          "country": "Uzbekistan",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 754
        },
        {
          "country": "Philippines",
          "count": 384
        },
        {
          "country": "Greece",
          "count": 348
        },
        {
          "country": "India",
          "count": 326
        },
        {
          "country": "Bangladesh",
          "count": 296
        },
        {
          "country": "Nepal",
          "count": 280
        },
        {
          "country": "North Macedonia",
          "count": 213
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 161
        },
        {
          "country": "England",
          "count": 133
        },
        {
          "country": "Thailand",
          "count": 119
        },
        {
          "country": "Egypt",
          "count": 117
        },
        {
          "country": "Vietnam",
          "count": 106
        },
        {
          "country": "Lebanon",
          "count": 103
        },
        {
          "country": "Italy",
          "count": 86
        },
        {
          "country": "Indonesia",
          "count": 77
        },
        {
          "country": "Malaysia",
          "count": 67
        },
        {
          "country": "New Zealand",
          "count": 61
        },
        {
          "country": "Colombia",
          "count": 58
        },
        {
          "country": "Serbia",
          "count": 56
        },
        {
          "country": "Brazil",
          "count": 48
        },
        {
          "country": "Chile",
          "count": 45
        },
        {
          "country": "Croatia",
          "count": 45
        },
        {
          "country": "Russian Federation",
          "count": 40
        },
        {
          "country": "Cyprus",
          "count": 36
        },
        {
          "country": "Ireland",
          "count": 36
        },
        {
          "country": "South Africa",
          "count": 35
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 31
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 28
        },
        {
          "country": "Portugal",
          "count": 28
        },
        {
          "country": "Peru",
          "count": 27
        },
        {
          "country": "Turkey",
          "count": 27
        },
        {
          "country": "Malta",
          "count": 26
        },
        {
          "country": "Taiwan",
          "count": 26
        },
        {
          "country": "Germany",
          "count": 23
        },
        {
          "country": "Ukraine",
          "count": 23
        },
        {
          "country": "Poland",
          "count": 20
        },
        {
          "country": "Singapore",
          "count": 20
        },
        {
          "country": "Myanmar",
          "count": 18
        },
        {
          "country": "Uruguay",
          "count": 18
        },
        {
          "country": "Iran",
          "count": 17
        },
        {
          "country": "Pakistan",
          "count": 17
        },
        {
          "country": "Sri Lanka",
          "count": 17
        },
        {
          "country": "Argentina",
          "count": 16
        },
        {
          "country": "United States of America",
          "count": 16
        },
        {
          "country": "Ecuador",
          "count": 15
        },
        {
          "country": "Iraq",
          "count": 15
        },
        {
          "country": "Netherlands",
          "count": 13
        },
        {
          "country": "Hungary",
          "count": 12
        },
        {
          "country": "Northern Ireland",
          "count": 12
        },
        {
          "country": "Zimbabwe",
          "count": 12
        },
        {
          "country": "Bulgaria",
          "count": 11
        },
        {
          "country": "Romania",
          "count": 11
        },
        {
          "country": "Mauritius",
          "count": 10
        },
        {
          "country": "Macau (SAR of China)",
          "count": 9
        },
        {
          "country": "Syria",
          "count": 9
        },
        {
          "country": "Laos",
          "count": 8
        },
        {
          "country": "Scotland",
          "count": 8
        },
        {
          "country": "Slovenia",
          "count": 8
        },
        {
          "country": "Spain",
          "count": 8
        },
        {
          "country": "Wales",
          "count": 8
        },
        {
          "country": "France",
          "count": 7
        },
        {
          "country": "Afghanistan",
          "count": 6
        },
        {
          "country": "Austria",
          "count": 6
        },
        {
          "country": "Morocco",
          "count": 6
        },
        {
          "country": "Timor-Leste",
          "count": 6
        },
        {
          "country": "Venezuela",
          "count": 6
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Kenya",
          "count": 5
        },
        {
          "country": "Cambodia",
          "count": 4
        },
        {
          "country": "Canada",
          "count": 4
        },
        {
          "country": "Sudan",
          "count": 4
        },
        {
          "country": "Cuba",
          "count": 3
        },
        {
          "country": "Eritrea",
          "count": 3
        },
        {
          "country": "Estonia",
          "count": 3
        },
        {
          "country": "Ghana",
          "count": 3
        },
        {
          "country": "Japan",
          "count": 3
        },
        {
          "country": "Kosovo",
          "count": 3
        },
        {
          "country": "Latvia",
          "count": 3
        },
        {
          "country": "Lithuania",
          "count": 3
        },
        {
          "country": "Oman",
          "count": 3
        },
        {
          "country": "Sierra Leone",
          "count": 3
        },
        {
          "country": "Tunisia",
          "count": 3
        },
        {
          "country": "Uzbekistan",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Nepal",
          "count": 1566
        },
        {
          "country": "India",
          "count": 651
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 596
        },
        {
          "country": "Philippines",
          "count": 255
        },
        {
          "country": "Bangladesh",
          "count": 174
        },
        {
          "country": "Brazil",
          "count": 158
        },
        {
          "country": "New Zealand",
          "count": 136
        },
        {
          "country": "Colombia",
          "count": 104
        },
        {
          "country": "Indonesia",
          "count": 99
        },
        {
          "country": "Malaysia",
          "count": 72
        },
        {
          "country": "England",
          "count": 65
        },
        {
          "country": "Thailand",
          "count": 64
        },
        {
          "country": "Mongolia",
          "count": 60
        },
        {
          "country": "Japan",
          "count": 57
        },
        {
          "country": "Vietnam",
          "count": 39
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 34
        },
        {
          "country": "Singapore",
          "count": 32
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 31
        },
        {
          "country": "Italy",
          "count": 26
        },
        {
          "country": "North Macedonia",
          "count": 21
        },
        {
          "country": "Poland",
          "count": 21
        },
        {
          "country": "United States of America",
          "count": 21
        },
        {
          "country": "Ireland",
          "count": 20
        },
        {
          "country": "Russian Federation",
          "count": 19
        },
        {
          "country": "Serbia",
          "count": 19
        },
        {
          "country": "Taiwan",
          "count": 18
        },
        {
          "country": "Ukraine",
          "count": 17
        },
        {
          "country": "South Africa",
          "count": 16
        },
        {
          "country": "Chile",
          "count": 15
        },
        {
          "country": "Sri Lanka",
          "count": 15
        },
        {
          "country": "France",
          "count": 14
        },
        {
          "country": "Lebanon",
          "count": 13
        },
        {
          "country": "Slovakia",
          "count": 11
        },
        {
          "country": "Egypt",
          "count": 10
        },
        {
          "country": "Iran",
          "count": 10
        },
        {
          "country": "Cambodia",
          "count": 9
        },
        {
          "country": "Iraq",
          "count": 9
        },
        {
          "country": "Pakistan",
          "count": 9
        },
        {
          "country": "Mauritius",
          "count": 8
        },
        {
          "country": "Portugal",
          "count": 8
        },
        {
          "country": "Bulgaria",
          "count": 7
        },
        {
          "country": "Germany",
          "count": 7
        },
        {
          "country": "Scotland",
          "count": 7
        },
        {
          "country": "Canada",
          "count": 6
        },
        {
          "country": "Mexico",
          "count": 6
        },
        {
          "country": "Turkey",
          "count": 6
        },
        {
          "country": "Zambia",
          "count": 6
        },
        {
          "country": "Zimbabwe",
          "count": 6
        },
        {
          "country": "Kenya",
          "count": 5
        },
        {
          "country": "Spain",
          "count": 5
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Croatia",
          "count": 4
        },
        {
          "country": "Czechia",
          "count": 4
        },
        {
          "country": "Ecuador",
          "count": 4
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 4
        },
        {
          "country": "Georgia",
          "count": 4
        },
        {
          "country": "Greece",
          "count": 4
        },
        {
          "country": "Jordan",
          "count": 4
        },
        {
          "country": "Kuwait",
          "count": 4
        },
        {
          "country": "Peru",
          "count": 4
        },
        {
          "country": "Venezuela",
          "count": 4
        },
        {
          "country": "Yemen",
          "count": 4
        },
        {
          "country": "Afghanistan",
          "count": 3
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Hungary",
          "count": 3
        },
        {
          "country": "Israel",
          "count": 3
        },
        {
          "country": "Kazakhstan",
          "count": 3
        },
        {
          "country": "Moldova",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Northern Ireland",
          "count": 3
        },
        {
          "country": "Oman",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "kyeemagh",
    "name": "Kyeemagh",
    "totals": {
      "all": 305,
      "locals": 261,
      "internationals": 44
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 67
        },
        {
          "country": "Lebanon",
          "count": 31
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 16
        },
        {
          "country": "Brazil",
          "count": 15
        },
        {
          "country": "New Zealand",
          "count": 14
        },
        {
          "country": "Egypt",
          "count": 13
        },
        {
          "country": "England",
          "count": 13
        },
        {
          "country": "North Macedonia",
          "count": 13
        },
        {
          "country": "Italy",
          "count": 10
        },
        {
          "country": "Portugal",
          "count": 10
        },
        {
          "country": "Ecuador",
          "count": 9
        },
        {
          "country": "Philippines",
          "count": 9
        },
        {
          "country": "Cyprus",
          "count": 7
        },
        {
          "country": "Turkey",
          "count": 7
        },
        {
          "country": "Sri Lanka",
          "count": 5
        },
        {
          "country": "Bangladesh",
          "count": 4
        },
        {
          "country": "Croatia",
          "count": 4
        },
        {
          "country": "Hungary",
          "count": 4
        },
        {
          "country": "Indonesia",
          "count": 4
        },
        {
          "country": "Iraq",
          "count": 4
        },
        {
          "country": "Nepal",
          "count": 4
        },
        {
          "country": "Russian Federation",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Qatar",
          "count": 3
        },
        {
          "country": "Serbia",
          "count": 3
        },
        {
          "country": "Singapore",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        },
        {
          "country": "Vietnam",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 61
        },
        {
          "country": "Lebanon",
          "count": 31
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 13
        },
        {
          "country": "Egypt",
          "count": 13
        },
        {
          "country": "North Macedonia",
          "count": 13
        },
        {
          "country": "England",
          "count": 10
        },
        {
          "country": "Italy",
          "count": 10
        },
        {
          "country": "Portugal",
          "count": 10
        },
        {
          "country": "Ecuador",
          "count": 9
        },
        {
          "country": "Philippines",
          "count": 9
        },
        {
          "country": "Cyprus",
          "count": 7
        },
        {
          "country": "Turkey",
          "count": 7
        },
        {
          "country": "Bangladesh",
          "count": 4
        },
        {
          "country": "Croatia",
          "count": 4
        },
        {
          "country": "Hungary",
          "count": 4
        },
        {
          "country": "Indonesia",
          "count": 4
        },
        {
          "country": "Iraq",
          "count": 4
        },
        {
          "country": "Nepal",
          "count": 4
        },
        {
          "country": "New Zealand",
          "count": 4
        },
        {
          "country": "Russian Federation",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Qatar",
          "count": 3
        },
        {
          "country": "Serbia",
          "count": 3
        },
        {
          "country": "Singapore",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        },
        {
          "country": "Vietnam",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Brazil",
          "count": 15
        },
        {
          "country": "New Zealand",
          "count": 10
        },
        {
          "country": "Greece",
          "count": 6
        },
        {
          "country": "Sri Lanka",
          "count": 5
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 3
        },
        {
          "country": "England",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "mascot",
    "name": "Mascot",
    "totals": {
      "all": 12660,
      "locals": 4299,
      "internationals": 8361
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 2451
        },
        {
          "country": "Indonesia",
          "count": 2104
        },
        {
          "country": "Mongolia",
          "count": 566
        },
        {
          "country": "India",
          "count": 545
        },
        {
          "country": "Philippines",
          "count": 472
        },
        {
          "country": "Ireland",
          "count": 468
        },
        {
          "country": "England",
          "count": 450
        },
        {
          "country": "Colombia",
          "count": 445
        },
        {
          "country": "Thailand",
          "count": 371
        },
        {
          "country": "Brazil",
          "count": 347
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 340
        },
        {
          "country": "Malaysia",
          "count": 336
        },
        {
          "country": "Vietnam",
          "count": 306
        },
        {
          "country": "New Zealand",
          "count": 297
        },
        {
          "country": "Bangladesh",
          "count": 207
        },
        {
          "country": "Greece",
          "count": 200
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 158
        },
        {
          "country": "Italy",
          "count": 148
        },
        {
          "country": "Taiwan",
          "count": 141
        },
        {
          "country": "Turkey",
          "count": 120
        },
        {
          "country": "Japan",
          "count": 110
        },
        {
          "country": "Chile",
          "count": 93
        },
        {
          "country": "Nepal",
          "count": 93
        },
        {
          "country": "Singapore",
          "count": 89
        },
        {
          "country": "United States of America",
          "count": 83
        },
        {
          "country": "Egypt",
          "count": 67
        },
        {
          "country": "Iran",
          "count": 66
        },
        {
          "country": "South Africa",
          "count": 65
        },
        {
          "country": "France",
          "count": 61
        },
        {
          "country": "Lebanon",
          "count": 59
        },
        {
          "country": "Sri Lanka",
          "count": 58
        },
        {
          "country": "Scotland",
          "count": 56
        },
        {
          "country": "Malta",
          "count": 55
        },
        {
          "country": "Pakistan",
          "count": 54
        },
        {
          "country": "Russian Federation",
          "count": 53
        },
        {
          "country": "Portugal",
          "count": 52
        },
        {
          "country": "Argentina",
          "count": 49
        },
        {
          "country": "Peru",
          "count": 49
        },
        {
          "country": "Cyprus",
          "count": 46
        },
        {
          "country": "Poland",
          "count": 46
        },
        {
          "country": "Germany",
          "count": 45
        },
        {
          "country": "Myanmar",
          "count": 38
        },
        {
          "country": "Croatia",
          "count": 36
        },
        {
          "country": "Northern Ireland",
          "count": 36
        },
        {
          "country": "Cambodia",
          "count": 34
        },
        {
          "country": "Ukraine",
          "count": 31
        },
        {
          "country": "Ecuador",
          "count": 30
        },
        {
          "country": "Saudi Arabia",
          "count": 30
        },
        {
          "country": "Spain",
          "count": 30
        },
        {
          "country": "Canada",
          "count": 29
        },
        {
          "country": "Iraq",
          "count": 27
        },
        {
          "country": "Mexico",
          "count": 27
        },
        {
          "country": "United Arab Emirates",
          "count": 23
        },
        {
          "country": "Mauritius",
          "count": 21
        },
        {
          "country": "North Macedonia",
          "count": 21
        },
        {
          "country": "Timor-Leste",
          "count": 19
        },
        {
          "country": "Wales",
          "count": 18
        },
        {
          "country": "Afghanistan",
          "count": 17
        },
        {
          "country": "Jordan",
          "count": 17
        },
        {
          "country": "Serbia",
          "count": 16
        },
        {
          "country": "Uruguay",
          "count": 16
        },
        {
          "country": "Slovakia",
          "count": 15
        },
        {
          "country": "Uzbekistan",
          "count": 15
        },
        {
          "country": "Zimbabwe",
          "count": 14
        },
        {
          "country": "Lithuania",
          "count": 13
        },
        {
          "country": "Syria",
          "count": 13
        },
        {
          "country": "Laos",
          "count": 11
        },
        {
          "country": "Netherlands",
          "count": 11
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 10
        },
        {
          "country": "Czechia",
          "count": 10
        },
        {
          "country": "Israel",
          "count": 10
        },
        {
          "country": "Switzerland",
          "count": 10
        },
        {
          "country": "Kuwait",
          "count": 8
        },
        {
          "country": "Moldova",
          "count": 8
        },
        {
          "country": "Nigeria",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Paraguay",
          "count": 7
        },
        {
          "country": "Romania",
          "count": 7
        },
        {
          "country": "Sweden",
          "count": 7
        },
        {
          "country": "Ethiopia",
          "count": 6
        },
        {
          "country": "Macau (SAR of China)",
          "count": 6
        },
        {
          "country": "Venezuela",
          "count": 6
        },
        {
          "country": "Albania",
          "count": 5
        },
        {
          "country": "Austria",
          "count": 5
        },
        {
          "country": "Montenegro",
          "count": 5
        },
        {
          "country": "Oman",
          "count": 5
        },
        {
          "country": "Libya",
          "count": 4
        },
        {
          "country": "Norway",
          "count": 4
        },
        {
          "country": "Sudan",
          "count": 4
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Congo, Democratic Republic of",
          "count": 3
        },
        {
          "country": "Estonia",
          "count": 3
        },
        {
          "country": "Ghana",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Latvia",
          "count": 3
        },
        {
          "country": "Luxembourg",
          "count": 3
        },
        {
          "country": "Puerto Rico",
          "count": 3
        },
        {
          "country": "Qatar",
          "count": 3
        },
        {
          "country": "Uganda",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 564
        },
        {
          "country": "Indonesia",
          "count": 341
        },
        {
          "country": "Philippines",
          "count": 278
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 200
        },
        {
          "country": "India",
          "count": 199
        },
        {
          "country": "Greece",
          "count": 195
        },
        {
          "country": "England",
          "count": 193
        },
        {
          "country": "Bangladesh",
          "count": 168
        },
        {
          "country": "Thailand",
          "count": 161
        },
        {
          "country": "Vietnam",
          "count": 122
        },
        {
          "country": "Turkey",
          "count": 109
        },
        {
          "country": "Ireland",
          "count": 100
        },
        {
          "country": "Malaysia",
          "count": 96
        },
        {
          "country": "New Zealand",
          "count": 93
        },
        {
          "country": "Italy",
          "count": 82
        },
        {
          "country": "Egypt",
          "count": 62
        },
        {
          "country": "Lebanon",
          "count": 59
        },
        {
          "country": "Taiwan",
          "count": 58
        },
        {
          "country": "Chile",
          "count": 57
        },
        {
          "country": "Colombia",
          "count": 56
        },
        {
          "country": "Malta",
          "count": 52
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 50
        },
        {
          "country": "Portugal",
          "count": 48
        },
        {
          "country": "South Africa",
          "count": 46
        },
        {
          "country": "Iran",
          "count": 44
        },
        {
          "country": "Cyprus",
          "count": 42
        },
        {
          "country": "Croatia",
          "count": 36
        },
        {
          "country": "Russian Federation",
          "count": 35
        },
        {
          "country": "United States of America",
          "count": 35
        },
        {
          "country": "Argentina",
          "count": 34
        },
        {
          "country": "Singapore",
          "count": 34
        },
        {
          "country": "Sri Lanka",
          "count": 33
        },
        {
          "country": "Peru",
          "count": 31
        },
        {
          "country": "Poland",
          "count": 28
        },
        {
          "country": "France",
          "count": 27
        },
        {
          "country": "Brazil",
          "count": 24
        },
        {
          "country": "Ukraine",
          "count": 23
        },
        {
          "country": "Iraq",
          "count": 21
        },
        {
          "country": "Pakistan",
          "count": 21
        },
        {
          "country": "Scotland",
          "count": 21
        },
        {
          "country": "Ecuador",
          "count": 20
        },
        {
          "country": "Timor-Leste",
          "count": 19
        },
        {
          "country": "Mauritius",
          "count": 18
        },
        {
          "country": "Germany",
          "count": 17
        },
        {
          "country": "Serbia",
          "count": 16
        },
        {
          "country": "Cambodia",
          "count": 15
        },
        {
          "country": "Nepal",
          "count": 15
        },
        {
          "country": "North Macedonia",
          "count": 14
        },
        {
          "country": "United Arab Emirates",
          "count": 12
        },
        {
          "country": "Uruguay",
          "count": 12
        },
        {
          "country": "Canada",
          "count": 11
        },
        {
          "country": "Afghanistan",
          "count": 10
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 10
        },
        {
          "country": "Israel",
          "count": 10
        },
        {
          "country": "Japan",
          "count": 10
        },
        {
          "country": "Mexico",
          "count": 10
        },
        {
          "country": "Spain",
          "count": 10
        },
        {
          "country": "Mongolia",
          "count": 9
        },
        {
          "country": "Myanmar",
          "count": 9
        },
        {
          "country": "Syria",
          "count": 9
        },
        {
          "country": "Jordan",
          "count": 8
        },
        {
          "country": "Northern Ireland",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Laos",
          "count": 7
        },
        {
          "country": "Slovakia",
          "count": 7
        },
        {
          "country": "Switzerland",
          "count": 7
        },
        {
          "country": "Uzbekistan",
          "count": 7
        },
        {
          "country": "Zimbabwe",
          "count": 7
        },
        {
          "country": "Ethiopia",
          "count": 6
        },
        {
          "country": "Netherlands",
          "count": 6
        },
        {
          "country": "Wales",
          "count": 6
        },
        {
          "country": "Albania",
          "count": 5
        },
        {
          "country": "Austria",
          "count": 5
        },
        {
          "country": "Moldova",
          "count": 5
        },
        {
          "country": "Montenegro",
          "count": 5
        },
        {
          "country": "Oman",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 4
        },
        {
          "country": "Libya",
          "count": 4
        },
        {
          "country": "Nigeria",
          "count": 4
        },
        {
          "country": "Romania",
          "count": 4
        },
        {
          "country": "Sudan",
          "count": 4
        },
        {
          "country": "Congo, Democratic Republic of",
          "count": 3
        },
        {
          "country": "Czechia",
          "count": 3
        },
        {
          "country": "Ghana",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Latvia",
          "count": 3
        },
        {
          "country": "Qatar",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1887
        },
        {
          "country": "Indonesia",
          "count": 1763
        },
        {
          "country": "Mongolia",
          "count": 557
        },
        {
          "country": "Colombia",
          "count": 389
        },
        {
          "country": "Ireland",
          "count": 368
        },
        {
          "country": "India",
          "count": 346
        },
        {
          "country": "Brazil",
          "count": 323
        },
        {
          "country": "England",
          "count": 257
        },
        {
          "country": "Malaysia",
          "count": 240
        },
        {
          "country": "Thailand",
          "count": 210
        },
        {
          "country": "New Zealand",
          "count": 204
        },
        {
          "country": "Philippines",
          "count": 194
        },
        {
          "country": "Vietnam",
          "count": 184
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 140
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 108
        },
        {
          "country": "Japan",
          "count": 100
        },
        {
          "country": "Taiwan",
          "count": 83
        },
        {
          "country": "Nepal",
          "count": 78
        },
        {
          "country": "Italy",
          "count": 66
        },
        {
          "country": "Singapore",
          "count": 55
        },
        {
          "country": "United States of America",
          "count": 48
        },
        {
          "country": "Bangladesh",
          "count": 39
        },
        {
          "country": "Chile",
          "count": 36
        },
        {
          "country": "Scotland",
          "count": 35
        },
        {
          "country": "France",
          "count": 34
        },
        {
          "country": "Pakistan",
          "count": 33
        },
        {
          "country": "Saudi Arabia",
          "count": 30
        },
        {
          "country": "Myanmar",
          "count": 29
        },
        {
          "country": "Germany",
          "count": 28
        },
        {
          "country": "Northern Ireland",
          "count": 28
        },
        {
          "country": "Sri Lanka",
          "count": 25
        },
        {
          "country": "Iran",
          "count": 22
        },
        {
          "country": "Spain",
          "count": 20
        },
        {
          "country": "Cambodia",
          "count": 19
        },
        {
          "country": "South Africa",
          "count": 19
        },
        {
          "country": "Canada",
          "count": 18
        },
        {
          "country": "Peru",
          "count": 18
        },
        {
          "country": "Poland",
          "count": 18
        },
        {
          "country": "Russian Federation",
          "count": 18
        },
        {
          "country": "Mexico",
          "count": 17
        },
        {
          "country": "Argentina",
          "count": 15
        },
        {
          "country": "Lithuania",
          "count": 13
        },
        {
          "country": "Wales",
          "count": 12
        },
        {
          "country": "Turkey",
          "count": 11
        },
        {
          "country": "United Arab Emirates",
          "count": 11
        },
        {
          "country": "Ecuador",
          "count": 10
        },
        {
          "country": "Jordan",
          "count": 9
        },
        {
          "country": "Slovakia",
          "count": 8
        },
        {
          "country": "Ukraine",
          "count": 8
        },
        {
          "country": "Uzbekistan",
          "count": 8
        },
        {
          "country": "Afghanistan",
          "count": 7
        },
        {
          "country": "Czechia",
          "count": 7
        },
        {
          "country": "North Macedonia",
          "count": 7
        },
        {
          "country": "Paraguay",
          "count": 7
        },
        {
          "country": "Zimbabwe",
          "count": 7
        },
        {
          "country": "Iraq",
          "count": 6
        },
        {
          "country": "Macau (SAR of China)",
          "count": 6
        },
        {
          "country": "Egypt",
          "count": 5
        },
        {
          "country": "Greece",
          "count": 5
        },
        {
          "country": "Netherlands",
          "count": 5
        },
        {
          "country": "Cyprus",
          "count": 4
        },
        {
          "country": "Kuwait",
          "count": 4
        },
        {
          "country": "Laos",
          "count": 4
        },
        {
          "country": "Nigeria",
          "count": 4
        },
        {
          "country": "Norway",
          "count": 4
        },
        {
          "country": "Portugal",
          "count": 4
        },
        {
          "country": "Sweden",
          "count": 4
        },
        {
          "country": "Syria",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Estonia",
          "count": 3
        },
        {
          "country": "Luxembourg",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Mauritius",
          "count": 3
        },
        {
          "country": "Moldova",
          "count": 3
        },
        {
          "country": "Puerto Rico",
          "count": 3
        },
        {
          "country": "Romania",
          "count": 3
        },
        {
          "country": "Switzerland",
          "count": 3
        },
        {
          "country": "Uganda",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "monterey",
    "name": "Monterey",
    "totals": {
      "all": 1739,
      "locals": 1408,
      "internationals": 331
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 275
        },
        {
          "country": "Egypt",
          "count": 180
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 98
        },
        {
          "country": "North Macedonia",
          "count": 80
        },
        {
          "country": "England",
          "count": 71
        },
        {
          "country": "Lebanon",
          "count": 56
        },
        {
          "country": "New Zealand",
          "count": 54
        },
        {
          "country": "Turkey",
          "count": 47
        },
        {
          "country": "Italy",
          "count": 46
        },
        {
          "country": "Chile",
          "count": 45
        },
        {
          "country": "Brazil",
          "count": 43
        },
        {
          "country": "Vietnam",
          "count": 43
        },
        {
          "country": "Portugal",
          "count": 38
        },
        {
          "country": "India",
          "count": 36
        },
        {
          "country": "Cyprus",
          "count": 35
        },
        {
          "country": "Colombia",
          "count": 32
        },
        {
          "country": "Philippines",
          "count": 31
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 29
        },
        {
          "country": "Serbia",
          "count": 29
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 20
        },
        {
          "country": "Indonesia",
          "count": 20
        },
        {
          "country": "Malaysia",
          "count": 20
        },
        {
          "country": "Ukraine",
          "count": 19
        },
        {
          "country": "Russian Federation",
          "count": 18
        },
        {
          "country": "South Africa",
          "count": 18
        },
        {
          "country": "Uruguay",
          "count": 18
        },
        {
          "country": "Thailand",
          "count": 17
        },
        {
          "country": "Bangladesh",
          "count": 16
        },
        {
          "country": "Croatia",
          "count": 15
        },
        {
          "country": "United States of America",
          "count": 15
        },
        {
          "country": "Malta",
          "count": 13
        },
        {
          "country": "Ecuador",
          "count": 11
        },
        {
          "country": "France",
          "count": 11
        },
        {
          "country": "Iraq",
          "count": 11
        },
        {
          "country": "Ireland",
          "count": 11
        },
        {
          "country": "Peru",
          "count": 11
        },
        {
          "country": "Japan",
          "count": 10
        },
        {
          "country": "Pakistan",
          "count": 10
        },
        {
          "country": "Iran",
          "count": 9
        },
        {
          "country": "Jordan",
          "count": 9
        },
        {
          "country": "Spain",
          "count": 9
        },
        {
          "country": "Myanmar",
          "count": 7
        },
        {
          "country": "Poland",
          "count": 7
        },
        {
          "country": "Argentina",
          "count": 6
        },
        {
          "country": "Germany",
          "count": 6
        },
        {
          "country": "Northern Ireland",
          "count": 6
        },
        {
          "country": "Romania",
          "count": 6
        },
        {
          "country": "Scotland",
          "count": 6
        },
        {
          "country": "Syria",
          "count": 6
        },
        {
          "country": "Taiwan",
          "count": 6
        },
        {
          "country": "Cambodia",
          "count": 5
        },
        {
          "country": "Kazakhstan",
          "count": 5
        },
        {
          "country": "Venezuela",
          "count": 5
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 4
        },
        {
          "country": "Mexico",
          "count": 4
        },
        {
          "country": "Sudan",
          "count": 4
        },
        {
          "country": "Sweden",
          "count": 4
        },
        {
          "country": "United Arab Emirates",
          "count": 4
        },
        {
          "country": "Canada",
          "count": 3
        },
        {
          "country": "Kuwait",
          "count": 3
        },
        {
          "country": "Montenegro",
          "count": 3
        },
        {
          "country": "Saudi Arabia",
          "count": 3
        },
        {
          "country": "Singapore",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 257
        },
        {
          "country": "Egypt",
          "count": 173
        },
        {
          "country": "North Macedonia",
          "count": 76
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 70
        },
        {
          "country": "Lebanon",
          "count": 56
        },
        {
          "country": "England",
          "count": 52
        },
        {
          "country": "Turkey",
          "count": 43
        },
        {
          "country": "Italy",
          "count": 39
        },
        {
          "country": "Chile",
          "count": 35
        },
        {
          "country": "Cyprus",
          "count": 35
        },
        {
          "country": "Vietnam",
          "count": 34
        },
        {
          "country": "Portugal",
          "count": 33
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 29
        },
        {
          "country": "Serbia",
          "count": 29
        },
        {
          "country": "India",
          "count": 24
        },
        {
          "country": "Philippines",
          "count": 24
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 20
        },
        {
          "country": "Uruguay",
          "count": 18
        },
        {
          "country": "Brazil",
          "count": 17
        },
        {
          "country": "Malaysia",
          "count": 17
        },
        {
          "country": "New Zealand",
          "count": 17
        },
        {
          "country": "Colombia",
          "count": 16
        },
        {
          "country": "Croatia",
          "count": 15
        },
        {
          "country": "South Africa",
          "count": 15
        },
        {
          "country": "United States of America",
          "count": 15
        },
        {
          "country": "Bangladesh",
          "count": 13
        },
        {
          "country": "Russian Federation",
          "count": 12
        },
        {
          "country": "Ecuador",
          "count": 11
        },
        {
          "country": "Iraq",
          "count": 11
        },
        {
          "country": "Indonesia",
          "count": 10
        },
        {
          "country": "Malta",
          "count": 10
        },
        {
          "country": "Pakistan",
          "count": 10
        },
        {
          "country": "Ukraine",
          "count": 10
        },
        {
          "country": "Iran",
          "count": 9
        },
        {
          "country": "Jordan",
          "count": 9
        },
        {
          "country": "Thailand",
          "count": 8
        },
        {
          "country": "Argentina",
          "count": 6
        },
        {
          "country": "France",
          "count": 6
        },
        {
          "country": "Germany",
          "count": 6
        },
        {
          "country": "Northern Ireland",
          "count": 6
        },
        {
          "country": "Peru",
          "count": 6
        },
        {
          "country": "Romania",
          "count": 6
        },
        {
          "country": "Scotland",
          "count": 6
        },
        {
          "country": "Syria",
          "count": 6
        },
        {
          "country": "Taiwan",
          "count": 6
        },
        {
          "country": "Cambodia",
          "count": 5
        },
        {
          "country": "Kazakhstan",
          "count": 5
        },
        {
          "country": "Spain",
          "count": 5
        },
        {
          "country": "Venezuela",
          "count": 5
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 4
        },
        {
          "country": "Mexico",
          "count": 4
        },
        {
          "country": "Myanmar",
          "count": 4
        },
        {
          "country": "Poland",
          "count": 4
        },
        {
          "country": "Sudan",
          "count": 4
        },
        {
          "country": "Sweden",
          "count": 4
        },
        {
          "country": "Ireland",
          "count": 3
        },
        {
          "country": "Japan",
          "count": 3
        },
        {
          "country": "Kuwait",
          "count": 3
        },
        {
          "country": "Montenegro",
          "count": 3
        },
        {
          "country": "Singapore",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "New Zealand",
          "count": 37
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 28
        },
        {
          "country": "Brazil",
          "count": 26
        },
        {
          "country": "England",
          "count": 19
        },
        {
          "country": "Greece",
          "count": 18
        },
        {
          "country": "Colombia",
          "count": 16
        },
        {
          "country": "India",
          "count": 12
        },
        {
          "country": "Chile",
          "count": 10
        },
        {
          "country": "Indonesia",
          "count": 10
        },
        {
          "country": "Thailand",
          "count": 9
        },
        {
          "country": "Ukraine",
          "count": 9
        },
        {
          "country": "Vietnam",
          "count": 9
        },
        {
          "country": "Ireland",
          "count": 8
        },
        {
          "country": "Egypt",
          "count": 7
        },
        {
          "country": "Italy",
          "count": 7
        },
        {
          "country": "Japan",
          "count": 7
        },
        {
          "country": "Philippines",
          "count": 7
        },
        {
          "country": "Russian Federation",
          "count": 6
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Peru",
          "count": 5
        },
        {
          "country": "Portugal",
          "count": 5
        },
        {
          "country": "North Macedonia",
          "count": 4
        },
        {
          "country": "Spain",
          "count": 4
        },
        {
          "country": "Turkey",
          "count": 4
        },
        {
          "country": "United Arab Emirates",
          "count": 4
        },
        {
          "country": "Bangladesh",
          "count": 3
        },
        {
          "country": "Canada",
          "count": 3
        },
        {
          "country": "Malaysia",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Myanmar",
          "count": 3
        },
        {
          "country": "Poland",
          "count": 3
        },
        {
          "country": "Saudi Arabia",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "pagewood",
    "name": "Pagewood",
    "totals": {
      "all": 1205,
      "locals": 930,
      "internationals": 275
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 111
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 103
        },
        {
          "country": "England",
          "count": 91
        },
        {
          "country": "Indonesia",
          "count": 80
        },
        {
          "country": "New Zealand",
          "count": 68
        },
        {
          "country": "South Africa",
          "count": 50
        },
        {
          "country": "Ireland",
          "count": 39
        },
        {
          "country": "Italy",
          "count": 39
        },
        {
          "country": "Egypt",
          "count": 38
        },
        {
          "country": "Malaysia",
          "count": 36
        },
        {
          "country": "Sri Lanka",
          "count": 28
        },
        {
          "country": "India",
          "count": 27
        },
        {
          "country": "Philippines",
          "count": 25
        },
        {
          "country": "Scotland",
          "count": 19
        },
        {
          "country": "Iran",
          "count": 18
        },
        {
          "country": "France",
          "count": 17
        },
        {
          "country": "Thailand",
          "count": 17
        },
        {
          "country": "Lebanon",
          "count": 16
        },
        {
          "country": "Croatia",
          "count": 15
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 15
        },
        {
          "country": "Iraq",
          "count": 15
        },
        {
          "country": "Ukraine",
          "count": 15
        },
        {
          "country": "Chile",
          "count": 14
        },
        {
          "country": "Cyprus",
          "count": 14
        },
        {
          "country": "Singapore",
          "count": 13
        },
        {
          "country": "United States of America",
          "count": 13
        },
        {
          "country": "Germany",
          "count": 12
        },
        {
          "country": "Israel",
          "count": 12
        },
        {
          "country": "Portugal",
          "count": 12
        },
        {
          "country": "Peru",
          "count": 11
        },
        {
          "country": "Poland",
          "count": 11
        },
        {
          "country": "Russian Federation",
          "count": 11
        },
        {
          "country": "Vietnam",
          "count": 11
        },
        {
          "country": "Argentina",
          "count": 10
        },
        {
          "country": "Malta",
          "count": 9
        },
        {
          "country": "Turkey",
          "count": 9
        },
        {
          "country": "Japan",
          "count": 8
        },
        {
          "country": "Netherlands",
          "count": 8
        },
        {
          "country": "Belgium",
          "count": 7
        },
        {
          "country": "Brazil",
          "count": 7
        },
        {
          "country": "North Macedonia",
          "count": 7
        },
        {
          "country": "Zimbabwe",
          "count": 7
        },
        {
          "country": "Bangladesh",
          "count": 6
        },
        {
          "country": "Cameroon",
          "count": 6
        },
        {
          "country": "Romania",
          "count": 6
        },
        {
          "country": "Serbia",
          "count": 6
        },
        {
          "country": "Spain",
          "count": 6
        },
        {
          "country": "Wales",
          "count": 6
        },
        {
          "country": "Bolivia",
          "count": 5
        },
        {
          "country": "Pakistan",
          "count": 5
        },
        {
          "country": "Uruguay",
          "count": 5
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Cambodia",
          "count": 4
        },
        {
          "country": "Hungary",
          "count": 4
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 4
        },
        {
          "country": "Lithuania",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Morocco",
          "count": 4
        },
        {
          "country": "Nepal",
          "count": 4
        },
        {
          "country": "Sweden",
          "count": 4
        },
        {
          "country": "Timor-Leste",
          "count": 4
        },
        {
          "country": "Belarus",
          "count": 3
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 3
        },
        {
          "country": "Colombia",
          "count": 3
        },
        {
          "country": "Taiwan",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 108
        },
        {
          "country": "England",
          "count": 73
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 65
        },
        {
          "country": "South Africa",
          "count": 47
        },
        {
          "country": "Indonesia",
          "count": 43
        },
        {
          "country": "Egypt",
          "count": 38
        },
        {
          "country": "Ireland",
          "count": 28
        },
        {
          "country": "Italy",
          "count": 28
        },
        {
          "country": "New Zealand",
          "count": 28
        },
        {
          "country": "Philippines",
          "count": 25
        },
        {
          "country": "Sri Lanka",
          "count": 23
        },
        {
          "country": "Malaysia",
          "count": 19
        },
        {
          "country": "Iran",
          "count": 18
        },
        {
          "country": "Lebanon",
          "count": 16
        },
        {
          "country": "Croatia",
          "count": 15
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 15
        },
        {
          "country": "India",
          "count": 15
        },
        {
          "country": "Iraq",
          "count": 15
        },
        {
          "country": "Ukraine",
          "count": 15
        },
        {
          "country": "Chile",
          "count": 14
        },
        {
          "country": "Cyprus",
          "count": 14
        },
        {
          "country": "Scotland",
          "count": 14
        },
        {
          "country": "France",
          "count": 12
        },
        {
          "country": "Israel",
          "count": 12
        },
        {
          "country": "Portugal",
          "count": 12
        },
        {
          "country": "Peru",
          "count": 11
        },
        {
          "country": "Poland",
          "count": 11
        },
        {
          "country": "Russian Federation",
          "count": 11
        },
        {
          "country": "Vietnam",
          "count": 11
        },
        {
          "country": "Argentina",
          "count": 10
        },
        {
          "country": "Thailand",
          "count": 10
        },
        {
          "country": "United States of America",
          "count": 10
        },
        {
          "country": "Malta",
          "count": 9
        },
        {
          "country": "Turkey",
          "count": 9
        },
        {
          "country": "Netherlands",
          "count": 8
        },
        {
          "country": "Singapore",
          "count": 8
        },
        {
          "country": "Belgium",
          "count": 7
        },
        {
          "country": "Germany",
          "count": 7
        },
        {
          "country": "Zimbabwe",
          "count": 7
        },
        {
          "country": "Bangladesh",
          "count": 6
        },
        {
          "country": "Romania",
          "count": 6
        },
        {
          "country": "Serbia",
          "count": 6
        },
        {
          "country": "Spain",
          "count": 6
        },
        {
          "country": "Bolivia",
          "count": 5
        },
        {
          "country": "Pakistan",
          "count": 5
        },
        {
          "country": "Uruguay",
          "count": 5
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Cambodia",
          "count": 4
        },
        {
          "country": "Hungary",
          "count": 4
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 4
        },
        {
          "country": "Lithuania",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Morocco",
          "count": 4
        },
        {
          "country": "Nepal",
          "count": 4
        },
        {
          "country": "North Macedonia",
          "count": 4
        },
        {
          "country": "Sweden",
          "count": 4
        },
        {
          "country": "Timor-Leste",
          "count": 4
        },
        {
          "country": "Belarus",
          "count": 3
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 3
        },
        {
          "country": "Colombia",
          "count": 3
        },
        {
          "country": "Taiwan",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "New Zealand",
          "count": 40
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 38
        },
        {
          "country": "Indonesia",
          "count": 37
        },
        {
          "country": "England",
          "count": 18
        },
        {
          "country": "Malaysia",
          "count": 17
        },
        {
          "country": "India",
          "count": 12
        },
        {
          "country": "Ireland",
          "count": 11
        },
        {
          "country": "Italy",
          "count": 11
        },
        {
          "country": "Japan",
          "count": 8
        },
        {
          "country": "Brazil",
          "count": 7
        },
        {
          "country": "Thailand",
          "count": 7
        },
        {
          "country": "Cameroon",
          "count": 6
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Germany",
          "count": 5
        },
        {
          "country": "Scotland",
          "count": 5
        },
        {
          "country": "Singapore",
          "count": 5
        },
        {
          "country": "Sri Lanka",
          "count": 5
        },
        {
          "country": "Greece",
          "count": 3
        },
        {
          "country": "North Macedonia",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "ramsgate",
    "name": "Ramsgate",
    "totals": {
      "all": 358,
      "locals": 284,
      "internationals": 74
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 53
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 30
        },
        {
          "country": "England",
          "count": 28
        },
        {
          "country": "Egypt",
          "count": 26
        },
        {
          "country": "New Zealand",
          "count": 23
        },
        {
          "country": "Philippines",
          "count": 17
        },
        {
          "country": "Vietnam",
          "count": 14
        },
        {
          "country": "Lebanon",
          "count": 13
        },
        {
          "country": "North Macedonia",
          "count": 13
        },
        {
          "country": "India",
          "count": 11
        },
        {
          "country": "Malaysia",
          "count": 9
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 8
        },
        {
          "country": "Peru",
          "count": 8
        },
        {
          "country": "Portugal",
          "count": 7
        },
        {
          "country": "Montenegro",
          "count": 6
        },
        {
          "country": "Poland",
          "count": 6
        },
        {
          "country": "Chile",
          "count": 5
        },
        {
          "country": "Cyprus",
          "count": 5
        },
        {
          "country": "Iraq",
          "count": 5
        },
        {
          "country": "Bangladesh",
          "count": 4
        },
        {
          "country": "France",
          "count": 4
        },
        {
          "country": "Russian Federation",
          "count": 4
        },
        {
          "country": "Scotland",
          "count": 4
        },
        {
          "country": "Ukraine",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Argentina",
          "count": 3
        },
        {
          "country": "Colombia",
          "count": 3
        },
        {
          "country": "Croatia",
          "count": 3
        },
        {
          "country": "Iran",
          "count": 3
        },
        {
          "country": "Ireland",
          "count": 3
        },
        {
          "country": "Israel",
          "count": 3
        },
        {
          "country": "Italy",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Nepal",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 49
        },
        {
          "country": "Egypt",
          "count": 26
        },
        {
          "country": "England",
          "count": 23
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 14
        },
        {
          "country": "Lebanon",
          "count": 13
        },
        {
          "country": "North Macedonia",
          "count": 13
        },
        {
          "country": "Vietnam",
          "count": 10
        },
        {
          "country": "Malaysia",
          "count": 9
        },
        {
          "country": "Philippines",
          "count": 9
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 8
        },
        {
          "country": "Portugal",
          "count": 7
        },
        {
          "country": "India",
          "count": 6
        },
        {
          "country": "Montenegro",
          "count": 6
        },
        {
          "country": "New Zealand",
          "count": 6
        },
        {
          "country": "Poland",
          "count": 6
        },
        {
          "country": "Cyprus",
          "count": 5
        },
        {
          "country": "Iraq",
          "count": 5
        },
        {
          "country": "Peru",
          "count": 5
        },
        {
          "country": "Bangladesh",
          "count": 4
        },
        {
          "country": "France",
          "count": 4
        },
        {
          "country": "Russian Federation",
          "count": 4
        },
        {
          "country": "Ukraine",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Argentina",
          "count": 3
        },
        {
          "country": "Croatia",
          "count": 3
        },
        {
          "country": "Iran",
          "count": 3
        },
        {
          "country": "Ireland",
          "count": 3
        },
        {
          "country": "Israel",
          "count": 3
        },
        {
          "country": "Italy",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Nepal",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "New Zealand",
          "count": 17
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 16
        },
        {
          "country": "Philippines",
          "count": 8
        },
        {
          "country": "Chile",
          "count": 5
        },
        {
          "country": "England",
          "count": 5
        },
        {
          "country": "India",
          "count": 5
        },
        {
          "country": "Greece",
          "count": 4
        },
        {
          "country": "Scotland",
          "count": 4
        },
        {
          "country": "Vietnam",
          "count": 4
        },
        {
          "country": "Colombia",
          "count": 3
        },
        {
          "country": "Peru",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "ramsgate-beach",
    "name": "Ramsgate Beach",
    "totals": {
      "all": 569,
      "locals": 456,
      "internationals": 113
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 65
        },
        {
          "country": "England",
          "count": 52
        },
        {
          "country": "Egypt",
          "count": 44
        },
        {
          "country": "New Zealand",
          "count": 28
        },
        {
          "country": "Lebanon",
          "count": 27
        },
        {
          "country": "North Macedonia",
          "count": 26
        },
        {
          "country": "India",
          "count": 24
        },
        {
          "country": "Italy",
          "count": 21
        },
        {
          "country": "Brazil",
          "count": 19
        },
        {
          "country": "South Africa",
          "count": 18
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 16
        },
        {
          "country": "Philippines",
          "count": 14
        },
        {
          "country": "Russian Federation",
          "count": 14
        },
        {
          "country": "Vietnam",
          "count": 14
        },
        {
          "country": "Uruguay",
          "count": 11
        },
        {
          "country": "Argentina",
          "count": 10
        },
        {
          "country": "Chile",
          "count": 10
        },
        {
          "country": "Turkey",
          "count": 10
        },
        {
          "country": "Germany",
          "count": 9
        },
        {
          "country": "Serbia",
          "count": 9
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 8
        },
        {
          "country": "Portugal",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Cyprus",
          "count": 6
        },
        {
          "country": "Slovakia",
          "count": 6
        },
        {
          "country": "Latvia",
          "count": 5
        },
        {
          "country": "Thailand",
          "count": 5
        },
        {
          "country": "Bangladesh",
          "count": 4
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 4
        },
        {
          "country": "Colombia",
          "count": 4
        },
        {
          "country": "Ireland",
          "count": 4
        },
        {
          "country": "Sri Lanka",
          "count": 4
        },
        {
          "country": "Ukraine",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Georgia",
          "count": 3
        },
        {
          "country": "Indonesia",
          "count": 3
        },
        {
          "country": "Japan",
          "count": 3
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Pakistan",
          "count": 3
        },
        {
          "country": "Scotland",
          "count": 3
        },
        {
          "country": "Sudan",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 65
        },
        {
          "country": "Egypt",
          "count": 40
        },
        {
          "country": "England",
          "count": 33
        },
        {
          "country": "Lebanon",
          "count": 27
        },
        {
          "country": "North Macedonia",
          "count": 26
        },
        {
          "country": "Italy",
          "count": 21
        },
        {
          "country": "India",
          "count": 15
        },
        {
          "country": "Russian Federation",
          "count": 14
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 13
        },
        {
          "country": "New Zealand",
          "count": 13
        },
        {
          "country": "South Africa",
          "count": 12
        },
        {
          "country": "Philippines",
          "count": 11
        },
        {
          "country": "Uruguay",
          "count": 11
        },
        {
          "country": "Argentina",
          "count": 10
        },
        {
          "country": "Turkey",
          "count": 10
        },
        {
          "country": "Brazil",
          "count": 9
        },
        {
          "country": "Serbia",
          "count": 9
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 8
        },
        {
          "country": "Hungary",
          "count": 7
        },
        {
          "country": "Vietnam",
          "count": 7
        },
        {
          "country": "Chile",
          "count": 6
        },
        {
          "country": "Cyprus",
          "count": 6
        },
        {
          "country": "Slovakia",
          "count": 6
        },
        {
          "country": "Thailand",
          "count": 5
        },
        {
          "country": "Bangladesh",
          "count": 4
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 4
        },
        {
          "country": "Germany",
          "count": 4
        },
        {
          "country": "Ireland",
          "count": 4
        },
        {
          "country": "Portugal",
          "count": 4
        },
        {
          "country": "Sri Lanka",
          "count": 4
        },
        {
          "country": "Ukraine",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Georgia",
          "count": 3
        },
        {
          "country": "Japan",
          "count": 3
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 3
        },
        {
          "country": "Malta",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Pakistan",
          "count": 3
        },
        {
          "country": "Scotland",
          "count": 3
        },
        {
          "country": "Sudan",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "England",
          "count": 19
        },
        {
          "country": "New Zealand",
          "count": 15
        },
        {
          "country": "Brazil",
          "count": 10
        },
        {
          "country": "India",
          "count": 9
        },
        {
          "country": "Vietnam",
          "count": 7
        },
        {
          "country": "South Africa",
          "count": 6
        },
        {
          "country": "Germany",
          "count": 5
        },
        {
          "country": "Latvia",
          "count": 5
        },
        {
          "country": "Chile",
          "count": 4
        },
        {
          "country": "Colombia",
          "count": 4
        },
        {
          "country": "Egypt",
          "count": 4
        },
        {
          "country": "Portugal",
          "count": 4
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 3
        },
        {
          "country": "Indonesia",
          "count": 3
        },
        {
          "country": "Philippines",
          "count": 3
        },
        {
          "country": "United States of America",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "rockdale",
    "name": "Rockdale",
    "totals": {
      "all": 9250,
      "locals": 4475,
      "internationals": 4775
    },
    "mixes": {
      "all": [
        {
          "country": "Nepal",
          "count": 2441
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1003
        },
        {
          "country": "North Macedonia",
          "count": 545
        },
        {
          "country": "Bangladesh",
          "count": 526
        },
        {
          "country": "Philippines",
          "count": 497
        },
        {
          "country": "India",
          "count": 466
        },
        {
          "country": "Brazil",
          "count": 301
        },
        {
          "country": "Lebanon",
          "count": 274
        },
        {
          "country": "Colombia",
          "count": 212
        },
        {
          "country": "Vietnam",
          "count": 209
        },
        {
          "country": "Indonesia",
          "count": 207
        },
        {
          "country": "New Zealand",
          "count": 198
        },
        {
          "country": "Thailand",
          "count": 197
        },
        {
          "country": "Greece",
          "count": 181
        },
        {
          "country": "England",
          "count": 146
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 145
        },
        {
          "country": "Italy",
          "count": 114
        },
        {
          "country": "Egypt",
          "count": 80
        },
        {
          "country": "Malaysia",
          "count": 78
        },
        {
          "country": "Mongolia",
          "count": 72
        },
        {
          "country": "Russian Federation",
          "count": 72
        },
        {
          "country": "Japan",
          "count": 62
        },
        {
          "country": "Serbia",
          "count": 55
        },
        {
          "country": "Pakistan",
          "count": 53
        },
        {
          "country": "Poland",
          "count": 50
        },
        {
          "country": "Chile",
          "count": 45
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 42
        },
        {
          "country": "Peru",
          "count": 42
        },
        {
          "country": "Taiwan",
          "count": 40
        },
        {
          "country": "United States of America",
          "count": 38
        },
        {
          "country": "Croatia",
          "count": 37
        },
        {
          "country": "Turkey",
          "count": 37
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 36
        },
        {
          "country": "Cyprus",
          "count": 34
        },
        {
          "country": "Ireland",
          "count": 33
        },
        {
          "country": "Portugal",
          "count": 32
        },
        {
          "country": "South Africa",
          "count": 29
        },
        {
          "country": "France",
          "count": 28
        },
        {
          "country": "Germany",
          "count": 28
        },
        {
          "country": "Ukraine",
          "count": 28
        },
        {
          "country": "Scotland",
          "count": 26
        },
        {
          "country": "Iraq",
          "count": 25
        },
        {
          "country": "Argentina",
          "count": 24
        },
        {
          "country": "Iran",
          "count": 24
        },
        {
          "country": "Uruguay",
          "count": 22
        },
        {
          "country": "Sri Lanka",
          "count": 19
        },
        {
          "country": "Canada",
          "count": 18
        },
        {
          "country": "Mauritius",
          "count": 17
        },
        {
          "country": "Malta",
          "count": 16
        },
        {
          "country": "Singapore",
          "count": 15
        },
        {
          "country": "Bulgaria",
          "count": 14
        },
        {
          "country": "Slovakia",
          "count": 14
        },
        {
          "country": "United Arab Emirates",
          "count": 14
        },
        {
          "country": "Cambodia",
          "count": 13
        },
        {
          "country": "Spain",
          "count": 13
        },
        {
          "country": "Belgium",
          "count": 12
        },
        {
          "country": "Czechia",
          "count": 12
        },
        {
          "country": "Ecuador",
          "count": 12
        },
        {
          "country": "Estonia",
          "count": 12
        },
        {
          "country": "Hungary",
          "count": 12
        },
        {
          "country": "Mexico",
          "count": 12
        },
        {
          "country": "Venezuela",
          "count": 12
        },
        {
          "country": "Myanmar",
          "count": 11
        },
        {
          "country": "Netherlands",
          "count": 11
        },
        {
          "country": "Romania",
          "count": 10
        },
        {
          "country": "Afghanistan",
          "count": 9
        },
        {
          "country": "Zimbabwe",
          "count": 9
        },
        {
          "country": "Timor-Leste",
          "count": 7
        },
        {
          "country": "Nigeria",
          "count": 6
        },
        {
          "country": "Sudan",
          "count": 6
        },
        {
          "country": "Sweden",
          "count": 6
        },
        {
          "country": "Uganda",
          "count": 6
        },
        {
          "country": "Israel",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 5
        },
        {
          "country": "Macau (SAR of China)",
          "count": 5
        },
        {
          "country": "Albania",
          "count": 4
        },
        {
          "country": "Burundi",
          "count": 4
        },
        {
          "country": "Ethiopia",
          "count": 4
        },
        {
          "country": "Ghana",
          "count": 4
        },
        {
          "country": "Jordan",
          "count": 4
        },
        {
          "country": "Kenya",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Syria",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Bolivia",
          "count": 3
        },
        {
          "country": "Finland",
          "count": 3
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 3
        },
        {
          "country": "Lithuania",
          "count": 3
        },
        {
          "country": "Moldova",
          "count": 3
        },
        {
          "country": "Montenegro",
          "count": 3
        },
        {
          "country": "Morocco",
          "count": 3
        },
        {
          "country": "Slovenia",
          "count": 3
        },
        {
          "country": "Switzerland",
          "count": 3
        },
        {
          "country": "Uzbekistan",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 624
        },
        {
          "country": "North Macedonia",
          "count": 522
        },
        {
          "country": "Nepal",
          "count": 369
        },
        {
          "country": "Bangladesh",
          "count": 266
        },
        {
          "country": "Philippines",
          "count": 261
        },
        {
          "country": "Lebanon",
          "count": 245
        },
        {
          "country": "India",
          "count": 193
        },
        {
          "country": "Greece",
          "count": 181
        },
        {
          "country": "Vietnam",
          "count": 148
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 131
        },
        {
          "country": "England",
          "count": 103
        },
        {
          "country": "Indonesia",
          "count": 100
        },
        {
          "country": "Thailand",
          "count": 94
        },
        {
          "country": "Italy",
          "count": 87
        },
        {
          "country": "Egypt",
          "count": 71
        },
        {
          "country": "New Zealand",
          "count": 62
        },
        {
          "country": "Russian Federation",
          "count": 58
        },
        {
          "country": "Serbia",
          "count": 49
        },
        {
          "country": "Colombia",
          "count": 47
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 39
        },
        {
          "country": "Brazil",
          "count": 39
        },
        {
          "country": "Croatia",
          "count": 37
        },
        {
          "country": "Malaysia",
          "count": 36
        },
        {
          "country": "Cyprus",
          "count": 34
        },
        {
          "country": "Turkey",
          "count": 34
        },
        {
          "country": "Chile",
          "count": 30
        },
        {
          "country": "Pakistan",
          "count": 30
        },
        {
          "country": "Poland",
          "count": 28
        },
        {
          "country": "Portugal",
          "count": 25
        },
        {
          "country": "Peru",
          "count": 23
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 22
        },
        {
          "country": "Uruguay",
          "count": 22
        },
        {
          "country": "South Africa",
          "count": 21
        },
        {
          "country": "United States of America",
          "count": 21
        },
        {
          "country": "Ireland",
          "count": 20
        },
        {
          "country": "Taiwan",
          "count": 20
        },
        {
          "country": "Ukraine",
          "count": 20
        },
        {
          "country": "Argentina",
          "count": 19
        },
        {
          "country": "Germany",
          "count": 19
        },
        {
          "country": "Iran",
          "count": 19
        },
        {
          "country": "Iraq",
          "count": 17
        },
        {
          "country": "Scotland",
          "count": 16
        },
        {
          "country": "Sri Lanka",
          "count": 16
        },
        {
          "country": "Cambodia",
          "count": 13
        },
        {
          "country": "France",
          "count": 12
        },
        {
          "country": "Hungary",
          "count": 12
        },
        {
          "country": "Malta",
          "count": 12
        },
        {
          "country": "Mauritius",
          "count": 12
        },
        {
          "country": "Bulgaria",
          "count": 11
        },
        {
          "country": "Romania",
          "count": 10
        },
        {
          "country": "Spain",
          "count": 10
        },
        {
          "country": "Afghanistan",
          "count": 9
        },
        {
          "country": "Japan",
          "count": 9
        },
        {
          "country": "Singapore",
          "count": 9
        },
        {
          "country": "Belgium",
          "count": 8
        },
        {
          "country": "Canada",
          "count": 8
        },
        {
          "country": "Venezuela",
          "count": 8
        },
        {
          "country": "Ecuador",
          "count": 7
        },
        {
          "country": "Myanmar",
          "count": 7
        },
        {
          "country": "Timor-Leste",
          "count": 7
        },
        {
          "country": "Sudan",
          "count": 6
        },
        {
          "country": "Uganda",
          "count": 6
        },
        {
          "country": "United Arab Emirates",
          "count": 6
        },
        {
          "country": "Estonia",
          "count": 5
        },
        {
          "country": "Israel",
          "count": 5
        },
        {
          "country": "Macau (SAR of China)",
          "count": 5
        },
        {
          "country": "Zimbabwe",
          "count": 5
        },
        {
          "country": "Albania",
          "count": 4
        },
        {
          "country": "Burundi",
          "count": 4
        },
        {
          "country": "Ethiopia",
          "count": 4
        },
        {
          "country": "Ghana",
          "count": 4
        },
        {
          "country": "Kenya",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Syria",
          "count": 4
        },
        {
          "country": "Bolivia",
          "count": 3
        },
        {
          "country": "Czechia",
          "count": 3
        },
        {
          "country": "Finland",
          "count": 3
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Montenegro",
          "count": 3
        },
        {
          "country": "Morocco",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Slovenia",
          "count": 3
        },
        {
          "country": "Switzerland",
          "count": 3
        },
        {
          "country": "Uzbekistan",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Nepal",
          "count": 2072
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 379
        },
        {
          "country": "India",
          "count": 273
        },
        {
          "country": "Brazil",
          "count": 262
        },
        {
          "country": "Bangladesh",
          "count": 260
        },
        {
          "country": "Philippines",
          "count": 236
        },
        {
          "country": "Colombia",
          "count": 165
        },
        {
          "country": "New Zealand",
          "count": 136
        },
        {
          "country": "Indonesia",
          "count": 107
        },
        {
          "country": "Thailand",
          "count": 103
        },
        {
          "country": "Mongolia",
          "count": 72
        },
        {
          "country": "Vietnam",
          "count": 61
        },
        {
          "country": "Japan",
          "count": 53
        },
        {
          "country": "England",
          "count": 43
        },
        {
          "country": "Malaysia",
          "count": 42
        },
        {
          "country": "Lebanon",
          "count": 29
        },
        {
          "country": "Italy",
          "count": 27
        },
        {
          "country": "North Macedonia",
          "count": 23
        },
        {
          "country": "Pakistan",
          "count": 23
        },
        {
          "country": "Poland",
          "count": 22
        },
        {
          "country": "Taiwan",
          "count": 20
        },
        {
          "country": "Peru",
          "count": 19
        },
        {
          "country": "United States of America",
          "count": 17
        },
        {
          "country": "France",
          "count": 16
        },
        {
          "country": "Chile",
          "count": 15
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 14
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 14
        },
        {
          "country": "Russian Federation",
          "count": 14
        },
        {
          "country": "Slovakia",
          "count": 14
        },
        {
          "country": "Ireland",
          "count": 13
        },
        {
          "country": "Canada",
          "count": 10
        },
        {
          "country": "Scotland",
          "count": 10
        },
        {
          "country": "Czechia",
          "count": 9
        },
        {
          "country": "Egypt",
          "count": 9
        },
        {
          "country": "Germany",
          "count": 9
        },
        {
          "country": "Mexico",
          "count": 9
        },
        {
          "country": "Iraq",
          "count": 8
        },
        {
          "country": "Netherlands",
          "count": 8
        },
        {
          "country": "South Africa",
          "count": 8
        },
        {
          "country": "Ukraine",
          "count": 8
        },
        {
          "country": "United Arab Emirates",
          "count": 8
        },
        {
          "country": "Estonia",
          "count": 7
        },
        {
          "country": "Portugal",
          "count": 7
        },
        {
          "country": "Nigeria",
          "count": 6
        },
        {
          "country": "Serbia",
          "count": 6
        },
        {
          "country": "Singapore",
          "count": 6
        },
        {
          "country": "Sweden",
          "count": 6
        },
        {
          "country": "Argentina",
          "count": 5
        },
        {
          "country": "Ecuador",
          "count": 5
        },
        {
          "country": "Iran",
          "count": 5
        },
        {
          "country": "Kuwait",
          "count": 5
        },
        {
          "country": "Mauritius",
          "count": 5
        },
        {
          "country": "Belgium",
          "count": 4
        },
        {
          "country": "Jordan",
          "count": 4
        },
        {
          "country": "Malta",
          "count": 4
        },
        {
          "country": "Myanmar",
          "count": 4
        },
        {
          "country": "Venezuela",
          "count": 4
        },
        {
          "country": "Zimbabwe",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 3
        },
        {
          "country": "Bulgaria",
          "count": 3
        },
        {
          "country": "Lithuania",
          "count": 3
        },
        {
          "country": "Moldova",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        },
        {
          "country": "Sri Lanka",
          "count": 3
        },
        {
          "country": "Turkey",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "rosebery",
    "name": "Rosebery",
    "totals": {
      "all": 6723,
      "locals": 3360,
      "internationals": 3363
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1468
        },
        {
          "country": "England",
          "count": 497
        },
        {
          "country": "Greece",
          "count": 354
        },
        {
          "country": "Ireland",
          "count": 345
        },
        {
          "country": "Indonesia",
          "count": 303
        },
        {
          "country": "New Zealand",
          "count": 269
        },
        {
          "country": "India",
          "count": 208
        },
        {
          "country": "Philippines",
          "count": 189
        },
        {
          "country": "Brazil",
          "count": 186
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 148
        },
        {
          "country": "Colombia",
          "count": 136
        },
        {
          "country": "Italy",
          "count": 127
        },
        {
          "country": "Malaysia",
          "count": 125
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 116
        },
        {
          "country": "Vietnam",
          "count": 106
        },
        {
          "country": "Turkey",
          "count": 95
        },
        {
          "country": "Russian Federation",
          "count": 90
        },
        {
          "country": "South Africa",
          "count": 87
        },
        {
          "country": "Bangladesh",
          "count": 85
        },
        {
          "country": "United States of America",
          "count": 81
        },
        {
          "country": "Iran",
          "count": 78
        },
        {
          "country": "Thailand",
          "count": 78
        },
        {
          "country": "Ukraine",
          "count": 78
        },
        {
          "country": "Cyprus",
          "count": 71
        },
        {
          "country": "Singapore",
          "count": 65
        },
        {
          "country": "Northern Ireland",
          "count": 62
        },
        {
          "country": "Scotland",
          "count": 59
        },
        {
          "country": "Germany",
          "count": 54
        },
        {
          "country": "Taiwan",
          "count": 53
        },
        {
          "country": "France",
          "count": 52
        },
        {
          "country": "Poland",
          "count": 51
        },
        {
          "country": "Lebanon",
          "count": 50
        },
        {
          "country": "Japan",
          "count": 49
        },
        {
          "country": "Portugal",
          "count": 47
        },
        {
          "country": "Egypt",
          "count": 45
        },
        {
          "country": "Chile",
          "count": 43
        },
        {
          "country": "Canada",
          "count": 42
        },
        {
          "country": "Spain",
          "count": 32
        },
        {
          "country": "Serbia",
          "count": 31
        },
        {
          "country": "Sri Lanka",
          "count": 31
        },
        {
          "country": "Malta",
          "count": 30
        },
        {
          "country": "Croatia",
          "count": 28
        },
        {
          "country": "Pakistan",
          "count": 28
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 27
        },
        {
          "country": "Hungary",
          "count": 26
        },
        {
          "country": "Slovakia",
          "count": 24
        },
        {
          "country": "Wales",
          "count": 24
        },
        {
          "country": "Argentina",
          "count": 22
        },
        {
          "country": "Peru",
          "count": 21
        },
        {
          "country": "Ecuador",
          "count": 20
        },
        {
          "country": "Iraq",
          "count": 18
        },
        {
          "country": "Uruguay",
          "count": 18
        },
        {
          "country": "Israel",
          "count": 17
        },
        {
          "country": "Czechia",
          "count": 16
        },
        {
          "country": "Mauritius",
          "count": 15
        },
        {
          "country": "Mongolia",
          "count": 15
        },
        {
          "country": "Cambodia",
          "count": 14
        },
        {
          "country": "Netherlands",
          "count": 13
        },
        {
          "country": "North Macedonia",
          "count": 13
        },
        {
          "country": "Sweden",
          "count": 13
        },
        {
          "country": "Mexico",
          "count": 10
        },
        {
          "country": "Moldova",
          "count": 10
        },
        {
          "country": "Nepal",
          "count": 10
        },
        {
          "country": "United Arab Emirates",
          "count": 10
        },
        {
          "country": "Georgia",
          "count": 9
        },
        {
          "country": "Saudi Arabia",
          "count": 9
        },
        {
          "country": "Austria",
          "count": 8
        },
        {
          "country": "Belarus",
          "count": 8
        },
        {
          "country": "Sudan",
          "count": 8
        },
        {
          "country": "Bulgaria",
          "count": 7
        },
        {
          "country": "Denmark",
          "count": 7
        },
        {
          "country": "Syria",
          "count": 7
        },
        {
          "country": "Timor-Leste",
          "count": 7
        },
        {
          "country": "Belgium",
          "count": 6
        },
        {
          "country": "Lithuania",
          "count": 6
        },
        {
          "country": "Macau (SAR of China)",
          "count": 6
        },
        {
          "country": "Zimbabwe",
          "count": 6
        },
        {
          "country": "Cuba",
          "count": 5
        },
        {
          "country": "El Salvador",
          "count": 5
        },
        {
          "country": "Finland",
          "count": 5
        },
        {
          "country": "Romania",
          "count": 5
        },
        {
          "country": "Afghanistan",
          "count": 4
        },
        {
          "country": "Bolivia",
          "count": 4
        },
        {
          "country": "Ghana",
          "count": 4
        },
        {
          "country": "Guatemala",
          "count": 4
        },
        {
          "country": "Kenya",
          "count": 4
        },
        {
          "country": "Kyrgyzstan",
          "count": 4
        },
        {
          "country": "Switzerland",
          "count": 4
        },
        {
          "country": "Azerbaijan",
          "count": 3
        },
        {
          "country": "Estonia",
          "count": 3
        },
        {
          "country": "Jordan",
          "count": 3
        },
        {
          "country": "Myanmar",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Norway",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 350
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 347
        },
        {
          "country": "England",
          "count": 228
        },
        {
          "country": "Ireland",
          "count": 143
        },
        {
          "country": "Philippines",
          "count": 143
        },
        {
          "country": "Indonesia",
          "count": 136
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 109
        },
        {
          "country": "India",
          "count": 87
        },
        {
          "country": "New Zealand",
          "count": 83
        },
        {
          "country": "Turkey",
          "count": 81
        },
        {
          "country": "Italy",
          "count": 78
        },
        {
          "country": "Cyprus",
          "count": 71
        },
        {
          "country": "Ukraine",
          "count": 71
        },
        {
          "country": "Russian Federation",
          "count": 66
        },
        {
          "country": "Vietnam",
          "count": 65
        },
        {
          "country": "Bangladesh",
          "count": 62
        },
        {
          "country": "South Africa",
          "count": 62
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 57
        },
        {
          "country": "Brazil",
          "count": 53
        },
        {
          "country": "Colombia",
          "count": 53
        },
        {
          "country": "Lebanon",
          "count": 50
        },
        {
          "country": "Iran",
          "count": 49
        },
        {
          "country": "Malaysia",
          "count": 43
        },
        {
          "country": "Thailand",
          "count": 43
        },
        {
          "country": "Portugal",
          "count": 42
        },
        {
          "country": "United States of America",
          "count": 40
        },
        {
          "country": "Egypt",
          "count": 39
        },
        {
          "country": "Poland",
          "count": 31
        },
        {
          "country": "Chile",
          "count": 29
        },
        {
          "country": "Scotland",
          "count": 29
        },
        {
          "country": "Croatia",
          "count": 28
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 27
        },
        {
          "country": "Serbia",
          "count": 26
        },
        {
          "country": "Canada",
          "count": 25
        },
        {
          "country": "Malta",
          "count": 25
        },
        {
          "country": "Taiwan",
          "count": 24
        },
        {
          "country": "Germany",
          "count": 23
        },
        {
          "country": "Hungary",
          "count": 21
        },
        {
          "country": "Sri Lanka",
          "count": 20
        },
        {
          "country": "Iraq",
          "count": 18
        },
        {
          "country": "Spain",
          "count": 18
        },
        {
          "country": "Ecuador",
          "count": 17
        },
        {
          "country": "Singapore",
          "count": 16
        },
        {
          "country": "Uruguay",
          "count": 15
        },
        {
          "country": "France",
          "count": 13
        },
        {
          "country": "North Macedonia",
          "count": 13
        },
        {
          "country": "Northern Ireland",
          "count": 13
        },
        {
          "country": "Peru",
          "count": 13
        },
        {
          "country": "Slovakia",
          "count": 12
        },
        {
          "country": "Argentina",
          "count": 11
        },
        {
          "country": "Israel",
          "count": 11
        },
        {
          "country": "Mauritius",
          "count": 11
        },
        {
          "country": "Moldova",
          "count": 10
        },
        {
          "country": "Netherlands",
          "count": 10
        },
        {
          "country": "Pakistan",
          "count": 9
        },
        {
          "country": "Sweden",
          "count": 9
        },
        {
          "country": "Austria",
          "count": 8
        },
        {
          "country": "Belarus",
          "count": 8
        },
        {
          "country": "Czechia",
          "count": 8
        },
        {
          "country": "Sudan",
          "count": 8
        },
        {
          "country": "Cambodia",
          "count": 7
        },
        {
          "country": "Syria",
          "count": 7
        },
        {
          "country": "Timor-Leste",
          "count": 7
        },
        {
          "country": "Wales",
          "count": 7
        },
        {
          "country": "Japan",
          "count": 6
        },
        {
          "country": "United Arab Emirates",
          "count": 6
        },
        {
          "country": "Zimbabwe",
          "count": 6
        },
        {
          "country": "Cuba",
          "count": 5
        },
        {
          "country": "Finland",
          "count": 5
        },
        {
          "country": "Romania",
          "count": 5
        },
        {
          "country": "Afghanistan",
          "count": 4
        },
        {
          "country": "Bolivia",
          "count": 4
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Georgia",
          "count": 4
        },
        {
          "country": "Ghana",
          "count": 4
        },
        {
          "country": "Kenya",
          "count": 4
        },
        {
          "country": "Kyrgyzstan",
          "count": 4
        },
        {
          "country": "Nepal",
          "count": 4
        },
        {
          "country": "Switzerland",
          "count": 4
        },
        {
          "country": "Azerbaijan",
          "count": 3
        },
        {
          "country": "Denmark",
          "count": 3
        },
        {
          "country": "Jordan",
          "count": 3
        },
        {
          "country": "Macau (SAR of China)",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Mongolia",
          "count": 3
        },
        {
          "country": "Myanmar",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1121
        },
        {
          "country": "England",
          "count": 269
        },
        {
          "country": "Ireland",
          "count": 202
        },
        {
          "country": "New Zealand",
          "count": 186
        },
        {
          "country": "Indonesia",
          "count": 167
        },
        {
          "country": "Brazil",
          "count": 133
        },
        {
          "country": "India",
          "count": 121
        },
        {
          "country": "Colombia",
          "count": 83
        },
        {
          "country": "Malaysia",
          "count": 82
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 59
        },
        {
          "country": "Italy",
          "count": 49
        },
        {
          "country": "Northern Ireland",
          "count": 49
        },
        {
          "country": "Singapore",
          "count": 49
        },
        {
          "country": "Philippines",
          "count": 46
        },
        {
          "country": "Japan",
          "count": 43
        },
        {
          "country": "United States of America",
          "count": 41
        },
        {
          "country": "Vietnam",
          "count": 41
        },
        {
          "country": "France",
          "count": 39
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 39
        },
        {
          "country": "Thailand",
          "count": 35
        },
        {
          "country": "Germany",
          "count": 31
        },
        {
          "country": "Scotland",
          "count": 30
        },
        {
          "country": "Iran",
          "count": 29
        },
        {
          "country": "Taiwan",
          "count": 29
        },
        {
          "country": "South Africa",
          "count": 25
        },
        {
          "country": "Russian Federation",
          "count": 24
        },
        {
          "country": "Bangladesh",
          "count": 23
        },
        {
          "country": "Poland",
          "count": 20
        },
        {
          "country": "Pakistan",
          "count": 19
        },
        {
          "country": "Canada",
          "count": 17
        },
        {
          "country": "Wales",
          "count": 17
        },
        {
          "country": "Chile",
          "count": 14
        },
        {
          "country": "Spain",
          "count": 14
        },
        {
          "country": "Turkey",
          "count": 14
        },
        {
          "country": "Mongolia",
          "count": 12
        },
        {
          "country": "Slovakia",
          "count": 12
        },
        {
          "country": "Argentina",
          "count": 11
        },
        {
          "country": "Sri Lanka",
          "count": 11
        },
        {
          "country": "Saudi Arabia",
          "count": 9
        },
        {
          "country": "Czechia",
          "count": 8
        },
        {
          "country": "Peru",
          "count": 8
        },
        {
          "country": "Cambodia",
          "count": 7
        },
        {
          "country": "Mexico",
          "count": 7
        },
        {
          "country": "Ukraine",
          "count": 7
        },
        {
          "country": "Belgium",
          "count": 6
        },
        {
          "country": "Egypt",
          "count": 6
        },
        {
          "country": "Israel",
          "count": 6
        },
        {
          "country": "Lithuania",
          "count": 6
        },
        {
          "country": "Nepal",
          "count": 6
        },
        {
          "country": "El Salvador",
          "count": 5
        },
        {
          "country": "Georgia",
          "count": 5
        },
        {
          "country": "Hungary",
          "count": 5
        },
        {
          "country": "Malta",
          "count": 5
        },
        {
          "country": "Portugal",
          "count": 5
        },
        {
          "country": "Serbia",
          "count": 5
        },
        {
          "country": "Denmark",
          "count": 4
        },
        {
          "country": "Greece",
          "count": 4
        },
        {
          "country": "Guatemala",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Sweden",
          "count": 4
        },
        {
          "country": "United Arab Emirates",
          "count": 4
        },
        {
          "country": "Bulgaria",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Estonia",
          "count": 3
        },
        {
          "country": "Macau (SAR of China)",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Norway",
          "count": 3
        },
        {
          "country": "Uruguay",
          "count": 3
        },
        {
          "country": "Venezuela",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "sandringham",
    "name": "Sandringham",
    "totals": {
      "all": 338,
      "locals": 279,
      "internationals": 59
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 60
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 30
        },
        {
          "country": "Egypt",
          "count": 23
        },
        {
          "country": "England",
          "count": 21
        },
        {
          "country": "New Zealand",
          "count": 20
        },
        {
          "country": "North Macedonia",
          "count": 20
        },
        {
          "country": "Ireland",
          "count": 16
        },
        {
          "country": "Lebanon",
          "count": 11
        },
        {
          "country": "South Africa",
          "count": 10
        },
        {
          "country": "Cyprus",
          "count": 8
        },
        {
          "country": "Malaysia",
          "count": 7
        },
        {
          "country": "Portugal",
          "count": 7
        },
        {
          "country": "Germany",
          "count": 6
        },
        {
          "country": "Nigeria",
          "count": 6
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 5
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 5
        },
        {
          "country": "Scotland",
          "count": 5
        },
        {
          "country": "United States of America",
          "count": 5
        },
        {
          "country": "Vietnam",
          "count": 5
        },
        {
          "country": "Austria",
          "count": 4
        },
        {
          "country": "Canada",
          "count": 4
        },
        {
          "country": "Iran",
          "count": 4
        },
        {
          "country": "Italy",
          "count": 4
        },
        {
          "country": "Philippines",
          "count": 4
        },
        {
          "country": "Brazil",
          "count": 3
        },
        {
          "country": "Chile",
          "count": 3
        },
        {
          "country": "India",
          "count": 3
        },
        {
          "country": "Indonesia",
          "count": 3
        },
        {
          "country": "Romania",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 60
        },
        {
          "country": "Egypt",
          "count": 20
        },
        {
          "country": "North Macedonia",
          "count": 20
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 18
        },
        {
          "country": "England",
          "count": 15
        },
        {
          "country": "Lebanon",
          "count": 11
        },
        {
          "country": "New Zealand",
          "count": 9
        },
        {
          "country": "Cyprus",
          "count": 8
        },
        {
          "country": "Ireland",
          "count": 8
        },
        {
          "country": "Portugal",
          "count": 7
        },
        {
          "country": "South Africa",
          "count": 7
        },
        {
          "country": "Germany",
          "count": 6
        },
        {
          "country": "Nigeria",
          "count": 6
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 5
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 5
        },
        {
          "country": "Scotland",
          "count": 5
        },
        {
          "country": "United States of America",
          "count": 5
        },
        {
          "country": "Vietnam",
          "count": 5
        },
        {
          "country": "Austria",
          "count": 4
        },
        {
          "country": "Iran",
          "count": 4
        },
        {
          "country": "Italy",
          "count": 4
        },
        {
          "country": "Malaysia",
          "count": 4
        },
        {
          "country": "Philippines",
          "count": 4
        },
        {
          "country": "Chile",
          "count": 3
        },
        {
          "country": "India",
          "count": 3
        },
        {
          "country": "Indonesia",
          "count": 3
        },
        {
          "country": "Romania",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 12
        },
        {
          "country": "New Zealand",
          "count": 11
        },
        {
          "country": "Ireland",
          "count": 8
        },
        {
          "country": "England",
          "count": 6
        },
        {
          "country": "Canada",
          "count": 4
        },
        {
          "country": "Brazil",
          "count": 3
        },
        {
          "country": "Egypt",
          "count": 3
        },
        {
          "country": "Malaysia",
          "count": 3
        },
        {
          "country": "South Africa",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "sans-souci",
    "name": "Sans Souci",
    "totals": {
      "all": 3177,
      "locals": 2602,
      "internationals": 575
    },
    "mixes": {
      "all": [
        {
          "country": "Greece",
          "count": 469
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 258
        },
        {
          "country": "Egypt",
          "count": 217
        },
        {
          "country": "England",
          "count": 174
        },
        {
          "country": "New Zealand",
          "count": 132
        },
        {
          "country": "North Macedonia",
          "count": 112
        },
        {
          "country": "Lebanon",
          "count": 98
        },
        {
          "country": "Italy",
          "count": 94
        },
        {
          "country": "Portugal",
          "count": 94
        },
        {
          "country": "Philippines",
          "count": 93
        },
        {
          "country": "Cyprus",
          "count": 61
        },
        {
          "country": "India",
          "count": 60
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 58
        },
        {
          "country": "Vietnam",
          "count": 58
        },
        {
          "country": "Chile",
          "count": 51
        },
        {
          "country": "Brazil",
          "count": 48
        },
        {
          "country": "South Africa",
          "count": 48
        },
        {
          "country": "Serbia",
          "count": 47
        },
        {
          "country": "Croatia",
          "count": 46
        },
        {
          "country": "Thailand",
          "count": 44
        },
        {
          "country": "Uruguay",
          "count": 44
        },
        {
          "country": "Colombia",
          "count": 43
        },
        {
          "country": "Turkey",
          "count": 41
        },
        {
          "country": "Malta",
          "count": 40
        },
        {
          "country": "Scotland",
          "count": 40
        },
        {
          "country": "Germany",
          "count": 37
        },
        {
          "country": "Malaysia",
          "count": 37
        },
        {
          "country": "Ireland",
          "count": 36
        },
        {
          "country": "Indonesia",
          "count": 35
        },
        {
          "country": "Russian Federation",
          "count": 33
        },
        {
          "country": "Spain",
          "count": 31
        },
        {
          "country": "United States of America",
          "count": 24
        },
        {
          "country": "Argentina",
          "count": 22
        },
        {
          "country": "France",
          "count": 21
        },
        {
          "country": "Poland",
          "count": 21
        },
        {
          "country": "Iraq",
          "count": 20
        },
        {
          "country": "Canada",
          "count": 19
        },
        {
          "country": "Sri Lanka",
          "count": 19
        },
        {
          "country": "Iran",
          "count": 17
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 15
        },
        {
          "country": "Cambodia",
          "count": 13
        },
        {
          "country": "Ukraine",
          "count": 13
        },
        {
          "country": "Japan",
          "count": 12
        },
        {
          "country": "Jordan",
          "count": 12
        },
        {
          "country": "Hungary",
          "count": 11
        },
        {
          "country": "Northern Ireland",
          "count": 11
        },
        {
          "country": "Singapore",
          "count": 11
        },
        {
          "country": "Bangladesh",
          "count": 10
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 10
        },
        {
          "country": "Netherlands",
          "count": 10
        },
        {
          "country": "Sudan",
          "count": 10
        },
        {
          "country": "Venezuela",
          "count": 10
        },
        {
          "country": "Syria",
          "count": 9
        },
        {
          "country": "Taiwan",
          "count": 8
        },
        {
          "country": "Wales",
          "count": 8
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 7
        },
        {
          "country": "Kuwait",
          "count": 7
        },
        {
          "country": "Mauritius",
          "count": 7
        },
        {
          "country": "Zimbabwe",
          "count": 7
        },
        {
          "country": "Romania",
          "count": 6
        },
        {
          "country": "Switzerland",
          "count": 6
        },
        {
          "country": "Afghanistan",
          "count": 5
        },
        {
          "country": "Albania",
          "count": 5
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Kazakhstan",
          "count": 5
        },
        {
          "country": "Peru",
          "count": 5
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Finland",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Malawi",
          "count": 3
        },
        {
          "country": "Mozambique",
          "count": 3
        },
        {
          "country": "Slovenia",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        },
        {
          "country": "Uzbekistan",
          "count": 3
        },
        {
          "country": "Zambia",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Greece",
          "count": 445
        },
        {
          "country": "Egypt",
          "count": 211
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 192
        },
        {
          "country": "England",
          "count": 117
        },
        {
          "country": "North Macedonia",
          "count": 109
        },
        {
          "country": "Lebanon",
          "count": 93
        },
        {
          "country": "Portugal",
          "count": 79
        },
        {
          "country": "Italy",
          "count": 75
        },
        {
          "country": "Philippines",
          "count": 74
        },
        {
          "country": "Cyprus",
          "count": 61
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 55
        },
        {
          "country": "New Zealand",
          "count": 51
        },
        {
          "country": "Vietnam",
          "count": 51
        },
        {
          "country": "Serbia",
          "count": 47
        },
        {
          "country": "Croatia",
          "count": 46
        },
        {
          "country": "Uruguay",
          "count": 44
        },
        {
          "country": "India",
          "count": 43
        },
        {
          "country": "Turkey",
          "count": 41
        },
        {
          "country": "Malta",
          "count": 40
        },
        {
          "country": "Chile",
          "count": 39
        },
        {
          "country": "Malaysia",
          "count": 34
        },
        {
          "country": "South Africa",
          "count": 32
        },
        {
          "country": "Spain",
          "count": 31
        },
        {
          "country": "Thailand",
          "count": 30
        },
        {
          "country": "Ireland",
          "count": 29
        },
        {
          "country": "Colombia",
          "count": 28
        },
        {
          "country": "Scotland",
          "count": 28
        },
        {
          "country": "Russian Federation",
          "count": 27
        },
        {
          "country": "Germany",
          "count": 25
        },
        {
          "country": "Argentina",
          "count": 22
        },
        {
          "country": "Brazil",
          "count": 22
        },
        {
          "country": "Indonesia",
          "count": 21
        },
        {
          "country": "Poland",
          "count": 18
        },
        {
          "country": "Iran",
          "count": 17
        },
        {
          "country": "France",
          "count": 16
        },
        {
          "country": "Iraq",
          "count": 16
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 15
        },
        {
          "country": "United States of America",
          "count": 15
        },
        {
          "country": "Canada",
          "count": 14
        },
        {
          "country": "Sri Lanka",
          "count": 13
        },
        {
          "country": "Ukraine",
          "count": 13
        },
        {
          "country": "Jordan",
          "count": 12
        },
        {
          "country": "Bangladesh",
          "count": 10
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 10
        },
        {
          "country": "Sudan",
          "count": 10
        },
        {
          "country": "Venezuela",
          "count": 10
        },
        {
          "country": "Syria",
          "count": 9
        },
        {
          "country": "Hungary",
          "count": 8
        },
        {
          "country": "Taiwan",
          "count": 8
        },
        {
          "country": "Gaza Strip and West Bank",
          "count": 7
        },
        {
          "country": "Kuwait",
          "count": 7
        },
        {
          "country": "Mauritius",
          "count": 7
        },
        {
          "country": "Singapore",
          "count": 7
        },
        {
          "country": "Zimbabwe",
          "count": 7
        },
        {
          "country": "Japan",
          "count": 6
        },
        {
          "country": "Netherlands",
          "count": 6
        },
        {
          "country": "Northern Ireland",
          "count": 6
        },
        {
          "country": "Romania",
          "count": 6
        },
        {
          "country": "Switzerland",
          "count": 6
        },
        {
          "country": "Afghanistan",
          "count": 5
        },
        {
          "country": "Albania",
          "count": 5
        },
        {
          "country": "Cambodia",
          "count": 5
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Kazakhstan",
          "count": 5
        },
        {
          "country": "Peru",
          "count": 5
        },
        {
          "country": "Wales",
          "count": 5
        },
        {
          "country": "Finland",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Malawi",
          "count": 3
        },
        {
          "country": "Mozambique",
          "count": 3
        },
        {
          "country": "Slovenia",
          "count": 3
        },
        {
          "country": "Sweden",
          "count": 3
        },
        {
          "country": "Uzbekistan",
          "count": 3
        },
        {
          "country": "Zambia",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "New Zealand",
          "count": 81
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 66
        },
        {
          "country": "England",
          "count": 57
        },
        {
          "country": "Brazil",
          "count": 26
        },
        {
          "country": "Greece",
          "count": 24
        },
        {
          "country": "Italy",
          "count": 19
        },
        {
          "country": "Philippines",
          "count": 19
        },
        {
          "country": "India",
          "count": 17
        },
        {
          "country": "South Africa",
          "count": 16
        },
        {
          "country": "Colombia",
          "count": 15
        },
        {
          "country": "Portugal",
          "count": 15
        },
        {
          "country": "Indonesia",
          "count": 14
        },
        {
          "country": "Thailand",
          "count": 14
        },
        {
          "country": "Chile",
          "count": 12
        },
        {
          "country": "Germany",
          "count": 12
        },
        {
          "country": "Scotland",
          "count": 12
        },
        {
          "country": "United States of America",
          "count": 9
        },
        {
          "country": "Cambodia",
          "count": 8
        },
        {
          "country": "Ireland",
          "count": 7
        },
        {
          "country": "Vietnam",
          "count": 7
        },
        {
          "country": "Egypt",
          "count": 6
        },
        {
          "country": "Japan",
          "count": 6
        },
        {
          "country": "Russian Federation",
          "count": 6
        },
        {
          "country": "Sri Lanka",
          "count": 6
        },
        {
          "country": "Canada",
          "count": 5
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Lebanon",
          "count": 5
        },
        {
          "country": "Northern Ireland",
          "count": 5
        },
        {
          "country": "Bulgaria",
          "count": 4
        },
        {
          "country": "Iraq",
          "count": 4
        },
        {
          "country": "Netherlands",
          "count": 4
        },
        {
          "country": "Singapore",
          "count": 4
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 3
        },
        {
          "country": "Hungary",
          "count": 3
        },
        {
          "country": "Kenya",
          "count": 3
        },
        {
          "country": "Malaysia",
          "count": 3
        },
        {
          "country": "North Macedonia",
          "count": 3
        },
        {
          "country": "Poland",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "turrella",
    "name": "Turrella",
    "totals": {
      "all": 1312,
      "locals": 629,
      "internationals": 683
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 173
        },
        {
          "country": "Lebanon",
          "count": 161
        },
        {
          "country": "Colombia",
          "count": 101
        },
        {
          "country": "Mongolia",
          "count": 80
        },
        {
          "country": "Vietnam",
          "count": 75
        },
        {
          "country": "North Macedonia",
          "count": 73
        },
        {
          "country": "Philippines",
          "count": 66
        },
        {
          "country": "Brazil",
          "count": 51
        },
        {
          "country": "England",
          "count": 35
        },
        {
          "country": "Thailand",
          "count": 32
        },
        {
          "country": "India",
          "count": 31
        },
        {
          "country": "Indonesia",
          "count": 31
        },
        {
          "country": "Malaysia",
          "count": 27
        },
        {
          "country": "New Zealand",
          "count": 26
        },
        {
          "country": "United States of America",
          "count": 24
        },
        {
          "country": "Nepal",
          "count": 22
        },
        {
          "country": "Venezuela",
          "count": 20
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 19
        },
        {
          "country": "Italy",
          "count": 15
        },
        {
          "country": "Greece",
          "count": 14
        },
        {
          "country": "Bangladesh",
          "count": 13
        },
        {
          "country": "Ireland",
          "count": 12
        },
        {
          "country": "Pakistan",
          "count": 12
        },
        {
          "country": "Chile",
          "count": 10
        },
        {
          "country": "Peru",
          "count": 10
        },
        {
          "country": "Ukraine",
          "count": 10
        },
        {
          "country": "Kuwait",
          "count": 9
        },
        {
          "country": "Singapore",
          "count": 9
        },
        {
          "country": "South Africa",
          "count": 9
        },
        {
          "country": "Afghanistan",
          "count": 7
        },
        {
          "country": "Cambodia",
          "count": 7
        },
        {
          "country": "Egypt",
          "count": 7
        },
        {
          "country": "Taiwan",
          "count": 7
        },
        {
          "country": "Germany",
          "count": 6
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 6
        },
        {
          "country": "United Arab Emirates",
          "count": 6
        },
        {
          "country": "Belarus",
          "count": 5
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Iran",
          "count": 5
        },
        {
          "country": "Japan",
          "count": 5
        },
        {
          "country": "Portugal",
          "count": 5
        },
        {
          "country": "Turkey",
          "count": 5
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Poland",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Uzbekistan",
          "count": 4
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Russian Federation",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        },
        {
          "country": "Sudan",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "Lebanon",
          "count": 152
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 84
        },
        {
          "country": "North Macedonia",
          "count": 73
        },
        {
          "country": "Vietnam",
          "count": 37
        },
        {
          "country": "Philippines",
          "count": 24
        },
        {
          "country": "England",
          "count": 18
        },
        {
          "country": "India",
          "count": 15
        },
        {
          "country": "Greece",
          "count": 14
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 14
        },
        {
          "country": "Thailand",
          "count": 14
        },
        {
          "country": "Indonesia",
          "count": 10
        },
        {
          "country": "Italy",
          "count": 10
        },
        {
          "country": "United States of America",
          "count": 10
        },
        {
          "country": "Colombia",
          "count": 9
        },
        {
          "country": "Kuwait",
          "count": 9
        },
        {
          "country": "Afghanistan",
          "count": 7
        },
        {
          "country": "Cambodia",
          "count": 7
        },
        {
          "country": "Bangladesh",
          "count": 6
        },
        {
          "country": "Malaysia",
          "count": 6
        },
        {
          "country": "Ukraine",
          "count": 6
        },
        {
          "country": "Belarus",
          "count": 5
        },
        {
          "country": "Iran",
          "count": 5
        },
        {
          "country": "Ireland",
          "count": 5
        },
        {
          "country": "Portugal",
          "count": 5
        },
        {
          "country": "Venezuela",
          "count": 5
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 4
        },
        {
          "country": "Chile",
          "count": 4
        },
        {
          "country": "Mauritius",
          "count": 4
        },
        {
          "country": "Poland",
          "count": 4
        },
        {
          "country": "South Africa",
          "count": 4
        },
        {
          "country": "Uruguay",
          "count": 4
        },
        {
          "country": "Egypt",
          "count": 3
        },
        {
          "country": "New Zealand",
          "count": 3
        },
        {
          "country": "Nigeria",
          "count": 3
        },
        {
          "country": "Pakistan",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        },
        {
          "country": "Sudan",
          "count": 3
        },
        {
          "country": "Taiwan",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        },
        {
          "country": "Wales",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "Colombia",
          "count": 92
        },
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 89
        },
        {
          "country": "Mongolia",
          "count": 80
        },
        {
          "country": "Brazil",
          "count": 51
        },
        {
          "country": "Philippines",
          "count": 42
        },
        {
          "country": "Vietnam",
          "count": 38
        },
        {
          "country": "New Zealand",
          "count": 23
        },
        {
          "country": "Nepal",
          "count": 22
        },
        {
          "country": "Indonesia",
          "count": 21
        },
        {
          "country": "Malaysia",
          "count": 21
        },
        {
          "country": "Thailand",
          "count": 18
        },
        {
          "country": "England",
          "count": 17
        },
        {
          "country": "India",
          "count": 16
        },
        {
          "country": "Venezuela",
          "count": 15
        },
        {
          "country": "United States of America",
          "count": 14
        },
        {
          "country": "Peru",
          "count": 10
        },
        {
          "country": "Lebanon",
          "count": 9
        },
        {
          "country": "Pakistan",
          "count": 9
        },
        {
          "country": "Singapore",
          "count": 9
        },
        {
          "country": "Bangladesh",
          "count": 7
        },
        {
          "country": "Ireland",
          "count": 7
        },
        {
          "country": "Chile",
          "count": 6
        },
        {
          "country": "Germany",
          "count": 6
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 6
        },
        {
          "country": "France",
          "count": 5
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 5
        },
        {
          "country": "Italy",
          "count": 5
        },
        {
          "country": "Japan",
          "count": 5
        },
        {
          "country": "South Africa",
          "count": 5
        },
        {
          "country": "Turkey",
          "count": 5
        },
        {
          "country": "Argentina",
          "count": 4
        },
        {
          "country": "Egypt",
          "count": 4
        },
        {
          "country": "Saudi Arabia",
          "count": 4
        },
        {
          "country": "Taiwan",
          "count": 4
        },
        {
          "country": "Ukraine",
          "count": 4
        },
        {
          "country": "Uzbekistan",
          "count": 4
        },
        {
          "country": "Russian Federation",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        }
      ]
    }
  },
  {
    "slug": "wolli-creek",
    "name": "Wolli Creek",
    "totals": {
      "all": 7512,
      "locals": 2054,
      "internationals": 5458
    },
    "mixes": {
      "all": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 2151
        },
        {
          "country": "Mongolia",
          "count": 513
        },
        {
          "country": "Indonesia",
          "count": 456
        },
        {
          "country": "Colombia",
          "count": 424
        },
        {
          "country": "Brazil",
          "count": 387
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 279
        },
        {
          "country": "Philippines",
          "count": 273
        },
        {
          "country": "India",
          "count": 261
        },
        {
          "country": "Thailand",
          "count": 255
        },
        {
          "country": "Vietnam",
          "count": 247
        },
        {
          "country": "Nepal",
          "count": 234
        },
        {
          "country": "Malaysia",
          "count": 230
        },
        {
          "country": "England",
          "count": 142
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 142
        },
        {
          "country": "New Zealand",
          "count": 130
        },
        {
          "country": "Taiwan",
          "count": 113
        },
        {
          "country": "Bangladesh",
          "count": 86
        },
        {
          "country": "Singapore",
          "count": 75
        },
        {
          "country": "Japan",
          "count": 69
        },
        {
          "country": "Italy",
          "count": 57
        },
        {
          "country": "Chile",
          "count": 47
        },
        {
          "country": "South Africa",
          "count": 45
        },
        {
          "country": "Lebanon",
          "count": 44
        },
        {
          "country": "Poland",
          "count": 43
        },
        {
          "country": "Ireland",
          "count": 40
        },
        {
          "country": "Russian Federation",
          "count": 38
        },
        {
          "country": "United States of America",
          "count": 37
        },
        {
          "country": "Pakistan",
          "count": 34
        },
        {
          "country": "Turkey",
          "count": 31
        },
        {
          "country": "Sri Lanka",
          "count": 27
        },
        {
          "country": "Canada",
          "count": 26
        },
        {
          "country": "Egypt",
          "count": 26
        },
        {
          "country": "France",
          "count": 26
        },
        {
          "country": "North Macedonia",
          "count": 25
        },
        {
          "country": "Peru",
          "count": 25
        },
        {
          "country": "Iran",
          "count": 23
        },
        {
          "country": "Myanmar",
          "count": 21
        },
        {
          "country": "Saudi Arabia",
          "count": 21
        },
        {
          "country": "Greece",
          "count": 19
        },
        {
          "country": "Slovakia",
          "count": 19
        },
        {
          "country": "Germany",
          "count": 18
        },
        {
          "country": "Cambodia",
          "count": 17
        },
        {
          "country": "Argentina",
          "count": 16
        },
        {
          "country": "Ukraine",
          "count": 14
        },
        {
          "country": "Mexico",
          "count": 13
        },
        {
          "country": "Netherlands",
          "count": 12
        },
        {
          "country": "Scotland",
          "count": 12
        },
        {
          "country": "Sweden",
          "count": 12
        },
        {
          "country": "United Arab Emirates",
          "count": 12
        },
        {
          "country": "Bulgaria",
          "count": 11
        },
        {
          "country": "Jordan",
          "count": 11
        },
        {
          "country": "Ecuador",
          "count": 10
        },
        {
          "country": "Macau (SAR of China)",
          "count": 10
        },
        {
          "country": "Czechia",
          "count": 9
        },
        {
          "country": "Northern Ireland",
          "count": 9
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 8
        },
        {
          "country": "Denmark",
          "count": 8
        },
        {
          "country": "Laos",
          "count": 8
        },
        {
          "country": "Lithuania",
          "count": 8
        },
        {
          "country": "Venezuela",
          "count": 8
        },
        {
          "country": "Kuwait",
          "count": 7
        },
        {
          "country": "Morocco",
          "count": 7
        },
        {
          "country": "Nigeria",
          "count": 6
        },
        {
          "country": "Portugal",
          "count": 6
        },
        {
          "country": "Serbia",
          "count": 6
        },
        {
          "country": "Romania",
          "count": 5
        },
        {
          "country": "Afghanistan",
          "count": 4
        },
        {
          "country": "Bahrain",
          "count": 4
        },
        {
          "country": "Bhutan",
          "count": 4
        },
        {
          "country": "Estonia",
          "count": 4
        },
        {
          "country": "Hungary",
          "count": 4
        },
        {
          "country": "Norway",
          "count": 4
        },
        {
          "country": "Timor-Leste",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Croatia",
          "count": 3
        },
        {
          "country": "Iraq",
          "count": 3
        },
        {
          "country": "Mauritius",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        },
        {
          "country": "Sudan",
          "count": 3
        },
        {
          "country": "Switzerland",
          "count": 3
        },
        {
          "country": "Syria",
          "count": 3
        }
      ],
      "locals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 492
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 162
        },
        {
          "country": "Philippines",
          "count": 152
        },
        {
          "country": "India",
          "count": 97
        },
        {
          "country": "Indonesia",
          "count": 97
        },
        {
          "country": "Thailand",
          "count": 91
        },
        {
          "country": "Vietnam",
          "count": 77
        },
        {
          "country": "Malaysia",
          "count": 58
        },
        {
          "country": "England",
          "count": 56
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 49
        },
        {
          "country": "Bangladesh",
          "count": 46
        },
        {
          "country": "Lebanon",
          "count": 40
        },
        {
          "country": "Taiwan",
          "count": 39
        },
        {
          "country": "Singapore",
          "count": 30
        },
        {
          "country": "Colombia",
          "count": 29
        },
        {
          "country": "South Africa",
          "count": 28
        },
        {
          "country": "Brazil",
          "count": 26
        },
        {
          "country": "New Zealand",
          "count": 26
        },
        {
          "country": "Italy",
          "count": 25
        },
        {
          "country": "Ireland",
          "count": 22
        },
        {
          "country": "North Macedonia",
          "count": 22
        },
        {
          "country": "Russian Federation",
          "count": 21
        },
        {
          "country": "Chile",
          "count": 18
        },
        {
          "country": "Nepal",
          "count": 18
        },
        {
          "country": "Turkey",
          "count": 18
        },
        {
          "country": "Egypt",
          "count": 16
        },
        {
          "country": "Greece",
          "count": 13
        },
        {
          "country": "Sri Lanka",
          "count": 13
        },
        {
          "country": "Iran",
          "count": 12
        },
        {
          "country": "Pakistan",
          "count": 12
        },
        {
          "country": "France",
          "count": 11
        },
        {
          "country": "United States of America",
          "count": 11
        },
        {
          "country": "Germany",
          "count": 9
        },
        {
          "country": "United Arab Emirates",
          "count": 9
        },
        {
          "country": "Bosnia and Herzegovina",
          "count": 8
        },
        {
          "country": "Cambodia",
          "count": 8
        },
        {
          "country": "Poland",
          "count": 8
        },
        {
          "country": "Kuwait",
          "count": 7
        },
        {
          "country": "Morocco",
          "count": 7
        },
        {
          "country": "Canada",
          "count": 6
        },
        {
          "country": "Jordan",
          "count": 6
        },
        {
          "country": "Nigeria",
          "count": 6
        },
        {
          "country": "Scotland",
          "count": 6
        },
        {
          "country": "Serbia",
          "count": 6
        },
        {
          "country": "Slovakia",
          "count": 6
        },
        {
          "country": "Sweden",
          "count": 6
        },
        {
          "country": "Czechia",
          "count": 5
        },
        {
          "country": "Denmark",
          "count": 5
        },
        {
          "country": "Laos",
          "count": 5
        },
        {
          "country": "Mongolia",
          "count": 5
        },
        {
          "country": "Northern Ireland",
          "count": 5
        },
        {
          "country": "Romania",
          "count": 5
        },
        {
          "country": "Afghanistan",
          "count": 4
        },
        {
          "country": "Hungary",
          "count": 4
        },
        {
          "country": "Macau (SAR of China)",
          "count": 4
        },
        {
          "country": "Myanmar",
          "count": 4
        },
        {
          "country": "Timor-Leste",
          "count": 4
        },
        {
          "country": "Austria",
          "count": 3
        },
        {
          "country": "Bulgaria",
          "count": 3
        },
        {
          "country": "Croatia",
          "count": 3
        },
        {
          "country": "Ecuador",
          "count": 3
        },
        {
          "country": "Japan",
          "count": 3
        },
        {
          "country": "Mauritius",
          "count": 3
        },
        {
          "country": "Mexico",
          "count": 3
        },
        {
          "country": "Netherlands",
          "count": 3
        },
        {
          "country": "Peru",
          "count": 3
        },
        {
          "country": "Portugal",
          "count": 3
        },
        {
          "country": "Sudan",
          "count": 3
        },
        {
          "country": "Switzerland",
          "count": 3
        },
        {
          "country": "Ukraine",
          "count": 3
        }
      ],
      "internationals": [
        {
          "country": "China (excludes SARs and Taiwan)",
          "count": 1659
        },
        {
          "country": "Mongolia",
          "count": 508
        },
        {
          "country": "Colombia",
          "count": 395
        },
        {
          "country": "Brazil",
          "count": 361
        },
        {
          "country": "Indonesia",
          "count": 359
        },
        {
          "country": "Nepal",
          "count": 216
        },
        {
          "country": "Malaysia",
          "count": 172
        },
        {
          "country": "Vietnam",
          "count": 170
        },
        {
          "country": "India",
          "count": 164
        },
        {
          "country": "Thailand",
          "count": 164
        },
        {
          "country": "Philippines",
          "count": 121
        },
        {
          "country": "Hong Kong (SAR of China)",
          "count": 117
        },
        {
          "country": "New Zealand",
          "count": 104
        },
        {
          "country": "Korea, Republic of (South)",
          "count": 93
        },
        {
          "country": "England",
          "count": 86
        },
        {
          "country": "Taiwan",
          "count": 74
        },
        {
          "country": "Japan",
          "count": 66
        },
        {
          "country": "Singapore",
          "count": 45
        },
        {
          "country": "Bangladesh",
          "count": 40
        },
        {
          "country": "Poland",
          "count": 35
        },
        {
          "country": "Italy",
          "count": 32
        },
        {
          "country": "Chile",
          "count": 29
        },
        {
          "country": "United States of America",
          "count": 26
        },
        {
          "country": "Pakistan",
          "count": 22
        },
        {
          "country": "Peru",
          "count": 22
        },
        {
          "country": "Saudi Arabia",
          "count": 21
        },
        {
          "country": "Canada",
          "count": 20
        },
        {
          "country": "Ireland",
          "count": 18
        },
        {
          "country": "Myanmar",
          "count": 17
        },
        {
          "country": "Russian Federation",
          "count": 17
        },
        {
          "country": "South Africa",
          "count": 17
        },
        {
          "country": "Argentina",
          "count": 16
        },
        {
          "country": "France",
          "count": 15
        },
        {
          "country": "Sri Lanka",
          "count": 14
        },
        {
          "country": "Slovakia",
          "count": 13
        },
        {
          "country": "Turkey",
          "count": 13
        },
        {
          "country": "Iran",
          "count": 11
        },
        {
          "country": "Ukraine",
          "count": 11
        },
        {
          "country": "Egypt",
          "count": 10
        },
        {
          "country": "Mexico",
          "count": 10
        },
        {
          "country": "Cambodia",
          "count": 9
        },
        {
          "country": "Germany",
          "count": 9
        },
        {
          "country": "Netherlands",
          "count": 9
        },
        {
          "country": "Bulgaria",
          "count": 8
        },
        {
          "country": "Lithuania",
          "count": 8
        },
        {
          "country": "Venezuela",
          "count": 8
        },
        {
          "country": "Ecuador",
          "count": 7
        },
        {
          "country": "Greece",
          "count": 6
        },
        {
          "country": "Macau (SAR of China)",
          "count": 6
        },
        {
          "country": "Scotland",
          "count": 6
        },
        {
          "country": "Sweden",
          "count": 6
        },
        {
          "country": "Jordan",
          "count": 5
        },
        {
          "country": "Bahrain",
          "count": 4
        },
        {
          "country": "Bhutan",
          "count": 4
        },
        {
          "country": "Czechia",
          "count": 4
        },
        {
          "country": "Estonia",
          "count": 4
        },
        {
          "country": "Lebanon",
          "count": 4
        },
        {
          "country": "Northern Ireland",
          "count": 4
        },
        {
          "country": "Norway",
          "count": 4
        },
        {
          "country": "Wales",
          "count": 4
        },
        {
          "country": "Belgium",
          "count": 3
        },
        {
          "country": "Denmark",
          "count": 3
        },
        {
          "country": "Iraq",
          "count": 3
        },
        {
          "country": "Laos",
          "count": 3
        },
        {
          "country": "North Macedonia",
          "count": 3
        },
        {
          "country": "Portugal",
          "count": 3
        },
        {
          "country": "Spain",
          "count": 3
        },
        {
          "country": "Syria",
          "count": 3
        },
        {
          "country": "United Arab Emirates",
          "count": 3
        }
      ]
    }
  }
];

export function getWolliSuburbStatsMode(value: string | null | undefined): WolliSuburbStatsMode {
  return WOLLI_SUBURB_STATS_MODES.some((mode) => mode.id === value) ? (value as WolliSuburbStatsMode) : 'all';
}

export function getWolliSuburbStatsBySlug(slug: string | null | undefined) {
  return WOLLI_SUBURB_STATS.find((suburb) => suburb.slug === slug) || WOLLI_SUBURB_STATS.find((suburb) => suburb.slug === WOLLI_DEFAULT_SUBURB_STATS_SLUG) || WOLLI_SUBURB_STATS[0];
}

export function formatWolliStatsNumber(value: number) {
  return new Intl.NumberFormat('en-AU').format(value);
}

export function getWolliCountryDisplayName(country: string) {
  if (country === 'China (excludes SARs and Taiwan)') return 'China';
  if (country === 'Korea, Republic of (South)') return 'South Korea';
  if (country === 'United States of America') return 'USA';
  return country.replace(' (NSW)', '');
}
