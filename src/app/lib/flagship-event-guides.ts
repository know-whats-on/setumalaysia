import type { CityGuide, CityGuidePlace } from "./api";
import type { TargetableAppVariant } from "./app-variant";

export type FlagshipEventStatus = "live" | "countdown" | "past";

export type FlagshipEventTheme =
  | "neon"
  | "fireworks"
  | "moonlit"
  | "riverfire"
  | "showground"
  | "winter-light"
  | "botanic-light"
  | "spring-bloom"
  | "solstice"
  | "voices"
  | "sunset-market"
  | "tropical"
  | "beach-gallery"
  | "surf-arts"
  | "laneway-arts"
  | "culture-mosaic"
  | "coastal-folk"
  | "stage";

type FlagshipEventLiveSection = {
  name: string;
  description: string;
  imageUrl?: string;
  navigationLink?: string;
  lat?: number;
  lng?: number;
};

export type FlagshipEventGuideEntry = {
  slug: string;
  city: string;
  citySlug: string;
  state: string;
  title: string;
  sourceUrl: string;
  sourceLabel: string;
  imageSourceUrl?: string;
  coverImageUrl: string;
  bannerImageUrl: string;
  startDate: string;
  endDate: string;
  timezone: string;
  displayDate: string;
  theme: FlagshipEventTheme;
  intro: string;
  countdownCopy: string;
  position: number;
  lat: number;
  lng: number;
  pinInGuideFeed?: boolean;
  surfaceInGuideFeed?: boolean;
  liveSections?: FlagshipEventLiveSection[];
};

const APP_VARIANT_ALL = "all" satisfies TargetableAppVariant;

const FLAGSHIP_IMAGE_PATH_PATTERN = /\.(?:avif|jpe?g|png|webp)(?:$|[?#])/i;
const FLAGSHIP_IMAGE_EXTENSION_PARAM_PATTERN =
  /(?:^|&)extension=(?:avif|jpe?g|png|webp)(?:&|$)/i;

export function isValidFlagshipImageUrl(value: string) {
  const imageUrl = String(value || "").trim();
  if (!imageUrl) return false;

  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    return (
      FLAGSHIP_IMAGE_PATH_PATTERN.test(parsed.pathname) ||
      FLAGSHIP_IMAGE_EXTENSION_PARAM_PATTERN.test(
        parsed.search.replace(/^\?/, ""),
      )
    );
  } catch {
    return false;
  }
}

function getFlagshipImageUrl(value: string, label: string) {
  const imageUrl = String(value || "").trim();
  if (!isValidFlagshipImageUrl(imageUrl)) {
    throw new Error(`${label} must be a direct HTTP(S) image URL.`);
  }
  return imageUrl;
}

export const FLAGSHIP_EVENT_GUIDES: FlagshipEventGuideEntry[] = [
  {
    slug: "vivid-sydney-2026",
    city: "Sydney",
    citySlug: "sydney",
    state: "NSW",
    title: "Vivid Sydney 2026",
    sourceUrl: "https://www.vividsydney.com/",
    sourceLabel: "Vivid Sydney",
    coverImageUrl:
      "https://www.vividsydney.com/sites/default/files/2026-05/Vivid-Sydney2026.png",
    bannerImageUrl:
      "https://www.vividsydney.com/sites/default/files/2026-05/Vivid-Sydney2026.png",
    startDate: "2026-05-22",
    endDate: "2026-06-13",
    timezone: "Australia/Sydney",
    displayDate: "22 May-13 Jun 2026",
    theme: "neon",
    intro:
      "Sydney shifts into its night-time festival mode for Vivid, with harbour light walks, projections, music, food and ideas across the city.",
    countdownCopy:
      "The city is preparing for Vivid Sydney. Event sections will open here when the festival is live.",
    position: -1000,
    lat: -33.8568,
    lng: 151.2153,
    surfaceInGuideFeed: false,
    liveSections: [
      {
        name: "Light Walk and harbour projections",
        description:
          "Start with the harbour foreshore, Circular Quay and nearby projection zones for the most recognisable Vivid night route.",
      },
      {
        name: "Music, ideas and food program",
        description:
          "Use the official program for ticketed sessions, talks and late-night dining before you lock in a meeting time.",
      },
      {
        name: "Getting around after dark",
        description:
          "Plan train, ferry or light rail exits before you arrive. The busiest nights usually need a simpler meeting point.",
      },
    ],
  },
  {
    slug: "kings-birthday-sydney-2026",
    city: "Sydney",
    citySlug: "sydney",
    state: "NSW",
    title: "King's Birthday Weekend: Government House Sydney",
    sourceUrl:
      "https://www.governor.nsw.gov.au/government-house/kingsbirthdaythehouse",
    sourceLabel: "Governor of New South Wales",
    coverImageUrl:
      "https://www.governor.nsw.gov.au/assets/Uploads/images/345618262-227580309969341-7780192131802541607-n__FitMaxWzEyMDAsMTIwMF0.jpg",
    bannerImageUrl:
      "https://www.governor.nsw.gov.au/assets/Uploads/images/345618262-227580309969341-7780192131802541607-n__FitMaxWzEyMDAsMTIwMF0.jpg",
    startDate: "2026-06-07",
    endDate: "2026-06-07",
    timezone: "Australia/Sydney",
    displayDate: "7 Jun 2026",
    theme: "culture-mosaic",
    intro:
      "Government House opens the harbour-side house and gardens for the King's Birthday, with music, State Rooms, classic vehicles, Guide Dogs and picnic space inside the Sydney estate.",
    countdownCopy:
      "Government House Sydney is preparing its King's Birthday open day. Check the official source for access and weather updates before you leave.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -33.859925,
    lng: 151.215125,
    liveSections: [
      {
        name: "State Rooms and vice-regal table",
        description:
          "Explore the State Rooms, then look for the dining table dressed for a vice-regal occasion inside Government House.",
        imageUrl:
          "https://www.governor.nsw.gov.au/assets/Uploads/images/345618262-227580309969341-7780192131802541607-n__FitMaxWzEyMDAsMTIwMF0.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-33.859925,151.215125&travelmode=driving",
        lat: -33.859925,
        lng: 151.215125,
      },
      {
        name: "Police and Army Band music",
        description:
          "Plan time for the NSW Police Big Band on the Eastern Terrace and the Army Band vocalist and pianist in the Drawing Room.",
        imageUrl:
          "https://www.governor.nsw.gov.au/assets/images/galleries/kingsbirthdaythehouse/Police-Band-on-Arcade-1__FitMaxWzEyMDAsMTIwMF0.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-33.859925,151.215125&travelmode=driving",
        lat: -33.859925,
        lng: 151.215125,
      },
      {
        name: "Guide Dogs, gardens and King's Cypher",
        description:
          "Meet Guide Dogs and handlers, picnic in the gardens, follow the sculpture walk and take a photo with the two-metre King's Cypher.",
        imageUrl:
          "https://www.governor.nsw.gov.au/assets/images/galleries/kingsbirthdaythehouse/Guide-Dog__FitMaxWzEyMDAsMTIwMF0.JPG",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-33.859925,151.215125&travelmode=driving",
        lat: -33.859925,
        lng: 151.215125,
      },
    ],
  },
  {
    slug: "sydney-nye-2026",
    city: "Sydney",
    citySlug: "sydney",
    state: "NSW",
    title: "Sydney New Year's Eve 2026",
    sourceUrl:
      "https://www.nsw.gov.au/visiting-and-exploring-nsw/nsw-events/new-years-eve-sydney",
    sourceLabel: "NSW Government events",
    coverImageUrl:
      "https://www.nsw.gov.au/sites/default/files/atdw/44b6a7559c2800380bd35d733fed7620.jpeg",
    bannerImageUrl:
      "https://www.nsw.gov.au/sites/default/files/atdw/44b6a7559c2800380bd35d733fed7620.jpeg",
    startDate: "2026-12-31",
    endDate: "2026-12-31",
    timezone: "Australia/Sydney",
    displayDate: "31 Dec 2026",
    theme: "fireworks",
    intro:
      "The harbour becomes Sydney's biggest shared countdown, with fireworks, foreshore vantage points and late-night transport planning.",
    countdownCopy:
      "Keep this as the New Year's Eve planning shell until official vantage point and transport details are confirmed.",
    position: -990,
    lat: -33.8523,
    lng: 151.2108,
  },
  {
    slug: "rising-melbourne-2026",
    city: "Melbourne",
    citySlug: "melbourne",
    state: "VIC",
    title: "RISING Melbourne 2026",
    sourceUrl:
      "https://www.visitmelbourne.com/regions/Melbourne/whats-on/Art-and-exhibitions/RISING",
    sourceLabel: "Visit Melbourne",
    imageSourceUrl:
      "https://au.variety.com/2026/more/news/rising-unveils-expansive-2026-programme-34081/",
    coverImageUrl:
      "https://images-r2-1.thebrag.com/var/uploads/2026/03/rising-2026.jpg",
    bannerImageUrl:
      "https://images-r2-1.thebrag.com/var/uploads/2026/03/rising-2026.jpg",
    startDate: "2026-05-27",
    endDate: "2026-06-08",
    timezone: "Australia/Melbourne",
    displayDate: "27 May-8 Jun 2026",
    theme: "moonlit",
    intro:
      "RISING takes Melbourne into a winter arts mode, with after-dark performance, public art and city venues built for wandering.",
    countdownCopy:
      "RISING is on the way. Event sections will switch on here as live program details are ready.",
    position: -1000,
    lat: -37.8176,
    lng: 144.9671,
    liveSections: [
      {
        name: "Night-time city program",
        description:
          "Treat the CBD as the main route: cluster nearby venues, public works and food stops into one easy night plan.",
      },
      {
        name: "Ticketed sessions",
        description:
          "Use the official source for current ticket availability and keep a backup free or outdoor stop nearby.",
      },
    ],
  },
  {
    slug: "kings-birthday-melbourne-2026",
    city: "Melbourne",
    citySlug: "melbourne",
    state: "VIC",
    title: "King's Birthday Weekend: Free Melbourne",
    sourceUrl:
      "https://whatson.melbourne.vic.gov.au/article/whats-free-in-melbourne-on-the-june-kings-birthday-long-weekend",
    sourceLabel: "What's On Melbourne",
    coverImageUrl:
      "https://whatson.melbourne.vic.gov.au/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjU4YmQ4YjYxLTU1NWMtNDE2ZS1iZGNlLTJhMDExN2UzNjM2ZCIsInB1ciI6ImJsb2JfaWQifX0=--e81edc3a118442de003bbe1ddda520af5d3dee6b/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fbGltaXQiOlsxMDAwLDYwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--0d1dec94e96bf59e4e90ca4a7c11e516560ab297/47e74ebb-79e9-44b5-952d-4a058bacb6bc.jpg",
    bannerImageUrl:
      "https://whatson.melbourne.vic.gov.au/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjU4YmQ4YjYxLTU1NWMtNDE2ZS1iZGNlLTJhMDExN2UzNjM2ZCIsInB1ciI6ImJsb2JfaWQifX0=--e81edc3a118442de003bbe1ddda520af5d3dee6b/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fbGltaXQiOlsxMDAwLDYwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--0d1dec94e96bf59e4e90ca4a7c11e516560ab297/47e74ebb-79e9-44b5-952d-4a058bacb6bc.jpg",
    startDate: "2026-06-07",
    endDate: "2026-06-08",
    timezone: "Australia/Melbourne",
    displayDate: "7-8 Jun 2026",
    theme: "moonlit",
    intro:
      "Melbourne's King's Birthday long weekend has a city-centre mix of free cultural stops, food events and the Big Freeze match-day ritual.",
    countdownCopy:
      "Melbourne's King's Birthday weekend guide is ready for planning. Check the official source for the latest free-event schedule.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -37.81774,
    lng: 144.969156,
    liveSections: [
      {
        name: "Taste of Portugal at Queen Victoria Market",
        description:
          "Use the market as a daytime food stop, with Portuguese stalls, music and a clear meet-up point around the Queen Victoria Market sheds.",
        imageUrl:
          "https://whatson.melbourne.vic.gov.au/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjU4YmQ4YjYxLTU1NWMtNDE2ZS1iZGNlLTJhMDExN2UzNjM2ZCIsInB1ciI6ImJsb2JfaWQifX0=--e81edc3a118442de003bbe1ddda520af5d3dee6b/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fbGltaXQiOlsxMDAwLDYwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--0d1dec94e96bf59e4e90ca4a7c11e516560ab297/47e74ebb-79e9-44b5-952d-4a058bacb6bc.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-37.8076,144.9568&travelmode=driving",
        lat: -37.8076,
        lng: 144.9568,
      },
      {
        name: "Big Freeze match-day stop at the MCG",
        description:
          "Head to the MCG precinct for the King's Birthday football crowd and Big Freeze atmosphere, then use Richmond or Jolimont as simple exits.",
        imageUrl:
          "https://whatson.melbourne.vic.gov.au/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjU4YmQ4YjYxLTU1NWMtNDE2ZS1iZGNlLTJhMDExN2UzNjM2ZCIsInB1ciI6ImJsb2JfaWQifX0=--e81edc3a118442de003bbe1ddda520af5d3dee6b/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fbGltaXQiOlsxMDAwLDYwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--0d1dec94e96bf59e4e90ca4a7c11e516560ab297/47e74ebb-79e9-44b5-952d-4a058bacb6bc.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-37.819967,144.983449&travelmode=driving",
        lat: -37.819967,
        lng: 144.983449,
      },
      {
        name: "RISING city wander",
        description:
          "Keep Federation Square as the anchor point for free RISING-era city wandering, then branch into nearby galleries, laneways and evening venues.",
        imageUrl:
          "https://whatson.melbourne.vic.gov.au/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjU4YmQ4YjYxLTU1NWMtNDE2ZS1iZGNlLTJhMDExN2UzNjM2ZCIsInB1ciI6ImJsb2JfaWQifX0=--e81edc3a118442de003bbe1ddda520af5d3dee6b/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fbGltaXQiOlsxMDAwLDYwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--0d1dec94e96bf59e4e90ca4a7c11e516560ab297/47e74ebb-79e9-44b5-952d-4a058bacb6bc.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-37.81774,144.969156&travelmode=driving",
        lat: -37.81774,
        lng: 144.969156,
      },
    ],
  },
  {
    slug: "brisbane-festival-riverfire-2026",
    city: "Brisbane",
    citySlug: "brisbane",
    state: "QLD",
    title: "Brisbane Festival / Riverfire 2026",
    sourceUrl: "https://www.brisbanefestival.com.au/2026-program",
    sourceLabel: "Brisbane Festival",
    imageSourceUrl: "https://www.brisbanefestival.com.au/",
    coverImageUrl:
      "https://www.brisbanefestival.com.au/api/asset/generated/w1200-h630/riverfire-by-art-credit-jd-lin_48a6467a?extension=jpg",
    bannerImageUrl:
      "https://www.brisbanefestival.com.au/api/asset/generated/w1200-h630/riverfire-by-art-credit-jd-lin_48a6467a?extension=jpg",
    startDate: "2026-09-04",
    endDate: "2026-09-26",
    timezone: "Australia/Brisbane",
    displayDate: "4-26 Sep 2026",
    theme: "riverfire",
    intro:
      "Brisbane Festival turns the river city into a spring arts program, with Riverfire as the skyline-scale anchor.",
    countdownCopy:
      "Use this countdown shell until the detailed 2026 program and Riverfire planning sections are ready.",
    position: -1000,
    lat: -27.4705,
    lng: 153.026,
  },
  {
    slug: "ekka-brisbane-2026",
    city: "Brisbane",
    citySlug: "brisbane",
    state: "QLD",
    title: "Ekka 2026",
    sourceUrl: "https://www.ekka.com.au/dates/",
    sourceLabel: "Ekka",
    imageSourceUrl: "https://www.ekka.com.au/",
    coverImageUrl:
      "https://www.ekka.com.au/media/otinxwzo/ekka2024-3006-12947.jpg?width=1400&v=1dc102147805470",
    bannerImageUrl:
      "https://www.ekka.com.au/media/otinxwzo/ekka2024-3006-12947.jpg?width=1400&v=1dc102147805470",
    startDate: "2026-08-08",
    endDate: "2026-08-16",
    timezone: "Australia/Brisbane",
    displayDate: "8-16 Aug 2026",
    theme: "showground",
    intro:
      "Ekka is Brisbane's big showground week: rides, animals, food, showbags, competitions and night entertainment.",
    countdownCopy:
      "The Ekka guide is staged as a countdown until show schedules, tickets and daily highlights are ready.",
    position: -990,
    lat: -27.4504,
    lng: 153.0335,
  },
  {
    slug: "illuminate-adelaide-2026",
    city: "Adelaide",
    citySlug: "adelaide",
    state: "SA",
    title: "Illuminate Adelaide 2026",
    sourceUrl: "https://www.illuminateadelaide.com/",
    sourceLabel: "Illuminate Adelaide",
    coverImageUrl:
      "https://www.illuminateadelaide.com/media/f2xplhcu/ia26_homepage-banner_desktop-still.jpg?width=1920&height=1080&quality=85&v=1dcd152d55c6d40",
    bannerImageUrl:
      "https://www.illuminateadelaide.com/media/f2xplhcu/ia26_homepage-banner_desktop-still.jpg?width=1920&height=1080&quality=85&v=1dcd152d55c6d40",
    startDate: "2026-06-26",
    endDate: "2026-07-19",
    timezone: "Australia/Adelaide",
    displayDate: "26 Jun-19 Jul 2026",
    theme: "winter-light",
    intro:
      "Illuminate Adelaide brings a winter program of light, art, technology and city-night experiences into the CBD.",
    countdownCopy:
      "Keep this countdown live while program sections are prepared for the winter-light season.",
    position: -1000,
    lat: -34.9212,
    lng: 138.5995,
  },
  {
    slug: "kings-birthday-adelaide-2026",
    city: "Adelaide",
    citySlug: "adelaide",
    state: "SA",
    title: "King's Birthday Weekend: Adelaide Cabaret Festival",
    sourceUrl:
      "https://www.experienceadelaide.com.au/whats-on/adelaide-cabaret-festival/",
    sourceLabel: "Experience Adelaide",
    coverImageUrl:
      "https://assets.atdw-online.com.au/images/3148de104f5a432ee17809abca585ca9.jpeg?h=1200&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTdlZGMzMTVkYmRmZGUzNjU2Yjk1YiIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZjQ4YTQ0ZmVjYTNkZjJlNGFiOGMiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGVjYSJ9&rect=0%2C0%2C1600%2C1200&rot=360&w=1600",
    bannerImageUrl:
      "https://assets.atdw-online.com.au/images/3148de104f5a432ee17809abca585ca9.jpeg?h=1200&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTdlZGMzMTVkYmRmZGUzNjU2Yjk1YiIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZjQ4YTQ0ZmVjYTNkZjJlNGFiOGMiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGVjYSJ9&rect=0%2C0%2C1600%2C1200&rot=360&w=1600",
    startDate: "2026-06-04",
    endDate: "2026-06-21",
    timezone: "Australia/Adelaide",
    displayDate: "4-21 Jun 2026",
    theme: "stage",
    intro:
      "Adelaide Cabaret Festival turns the Festival Centre precinct into the city's King's Birthday weekend stage plan, with late shows, cabaret rooms and riverbank pre-show meeting spots.",
    countdownCopy:
      "Adelaide Cabaret Festival is nearly on. Use the official source for show times, ticketing and venue access.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -34.920092,
    lng: 138.595384,
    liveSections: [
      {
        name: "Festival Centre show base",
        description:
          "Use Adelaide Festival Centre as the starting point for cabaret sessions, ticket checks and easy riverbank meeting points before a show.",
        imageUrl:
          "https://assets.atdw-online.com.au/images/3148de104f5a432ee17809abca585ca9.jpeg?h=1200&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTdlZGMzMTVkYmRmZGUzNjU2Yjk1YiIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZjQ4YTQ0ZmVjYTNkZjJlNGFiOGMiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGVjYSJ9&rect=0%2C0%2C1600%2C1200&rot=360&w=1600",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-34.920092,138.595384&travelmode=driving",
        lat: -34.920092,
        lng: 138.595384,
      },
      {
        name: "Late cabaret and city dinner",
        description:
          "Pair an evening performance with dinner around King William Street or North Terrace, leaving enough time for ticket collection and seating.",
        imageUrl:
          "https://assets.atdw-online.com.au/images/3148de104f5a432ee17809abca585ca9.jpeg?h=1200&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTdlZGMzMTVkYmRmZGUzNjU2Yjk1YiIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZjQ4YTQ0ZmVjYTNkZjJlNGFiOGMiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGVjYSJ9&rect=0%2C0%2C1600%2C1200&rot=360&w=1600",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-34.920092,138.595384&travelmode=driving",
        lat: -34.920092,
        lng: 138.595384,
      },
    ],
  },
  {
    slug: "lightscape-kings-park-2026",
    city: "Perth",
    citySlug: "perth",
    state: "WA",
    title: "Lightscape Kings Park 2026",
    sourceUrl: "https://www.bgpa.wa.gov.au/kings-park/events/lightscape-2026",
    sourceLabel: "Botanic Gardens and Parks Authority",
    coverImageUrl:
      "https://www.bgpa.wa.gov.au/sites/default/files/styles/main_content_image_large_1200_800/public/2026-03/Masterworks-40.jpg?h=20512320&itok=gKe7EzjE",
    bannerImageUrl:
      "https://www.bgpa.wa.gov.au/sites/default/files/styles/main_content_image_large_1200_800/public/2026-03/Masterworks-40.jpg?h=20512320&itok=gKe7EzjE",
    startDate: "2026-06-05",
    endDate: "2026-07-26",
    timezone: "Australia/Perth",
    displayDate: "5 Jun-26 Jul 2026",
    theme: "botanic-light",
    intro:
      "Lightscape turns Kings Park into a night-time botanic trail, with illuminated paths, installations and skyline views.",
    countdownCopy:
      "Use this countdown shell until the trail highlights and ticket-planning sections go live.",
    position: -1000,
    lat: -31.9609,
    lng: 115.8324,
  },
  {
    slug: "floriade-canberra-2026",
    city: "Canberra",
    citySlug: "canberra",
    state: "ACT",
    title: "Floriade 2026",
    sourceUrl: "https://floriadeaustralia.com/faqs/",
    sourceLabel: "Floriade",
    imageSourceUrl: "https://floriadeaustralia.com/",
    coverImageUrl:
      "https://floriadeaustralia.com/app/uploads/2026/04/Floriade-2025-garden-bed-3-1-1536x1024.jpeg",
    bannerImageUrl:
      "https://floriadeaustralia.com/app/uploads/2026/04/Floriade-2025-garden-bed-3-1-1536x1024.jpeg",
    startDate: "2026-09-12",
    endDate: "2026-10-11",
    timezone: "Australia/Sydney",
    displayDate: "12 Sep-11 Oct 2026",
    theme: "spring-bloom",
    intro:
      "Floriade is Canberra's spring flagship, built around flower beds, public gardens, workshops and seasonal city visits.",
    countdownCopy:
      "The spring bloom page will stay in countdown mode until the 2026 program is ready to section out.",
    position: -1000,
    lat: -35.2894,
    lng: 149.1319,
  },
  {
    slug: "kings-birthday-canberra-2026",
    city: "Canberra",
    citySlug: "canberra",
    state: "ACT",
    title: "King's Birthday Weekend: Natural Nine Feast",
    sourceUrl:
      "https://events.canberra.com.au/whats-on/69f19b9c46fbe2a52b6ceadb/kings-birthday-feast-at-natural-nine-2",
    sourceLabel: "Events Canberra",
    coverImageUrl:
      "https://events.canberra.com.au/Atdw/Products/Events/kings-birthday-feast-at-natural-nine-2/223977/image-thumb__223977__auto_619210a57f8f5cb816d9701947cba815/69f19bdb46fbe2a52b6ceae3.webp",
    bannerImageUrl:
      "https://events.canberra.com.au/Atdw/Products/Events/kings-birthday-feast-at-natural-nine-2/223977/image-thumb__223977__auto_619210a57f8f5cb816d9701947cba815/69f19bdb46fbe2a52b6ceae3.webp",
    startDate: "2026-06-05",
    endDate: "2026-06-07",
    timezone: "Australia/Sydney",
    displayDate: "5-7 Jun 2026",
    theme: "stage",
    intro:
      "Natural Nine at Casino Canberra is running a King's Birthday weekend feast, giving the city a single-venue food plan close to Civic and Glebe Park.",
    countdownCopy:
      "Natural Nine's King's Birthday feast is almost here. Check the official source for booking details and sitting times.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -35.282968,
    lng: 149.134626,
    liveSections: [
      {
        name: "King's Birthday feast booking",
        description:
          "Make Natural Nine the main stop for banquet-style dining and chef specials, then keep the Casino Canberra entrance as the meet-up point.",
        imageUrl:
          "https://events.canberra.com.au/Atdw/Products/Events/kings-birthday-feast-at-natural-nine-2/223977/image-thumb__223977__auto_619210a57f8f5cb816d9701947cba815/69f19bdb46fbe2a52b6ceae3.webp",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-35.282968,149.134626&travelmode=driving",
        lat: -35.282968,
        lng: 149.134626,
      },
      {
        name: "Civic dinner walk",
        description:
          "Arrive through Civic, leave time for parking or light rail transfers, and use the nearby lake and Glebe Park edges for a pre-dinner stroll.",
        imageUrl:
          "https://events.canberra.com.au/Atdw/Products/Events/kings-birthday-feast-at-natural-nine-2/223977/image-thumb__223977__auto_619210a57f8f5cb816d9701947cba815/69f19bdb46fbe2a52b6ceae3.webp",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-35.282968,149.134626&travelmode=driving",
        lat: -35.282968,
        lng: 149.134626,
      },
    ],
  },
  {
    slug: "dark-mofo-hobart-2026",
    city: "Hobart",
    citySlug: "hobart",
    state: "TAS",
    title: "Dark Mofo 2026",
    sourceUrl: "https://mona.net.au/stuff-to-do/dark-mofo",
    sourceLabel: "Mona",
    coverImageUrl:
      "https://mona.net.au/opengraph-image-ox15pl.png?db7cb4fb348ab527",
    bannerImageUrl:
      "https://mona.net.au/opengraph-image-ox15pl.png?db7cb4fb348ab527",
    startDate: "2026-06-11",
    endDate: "2026-06-22",
    timezone: "Australia/Hobart",
    displayDate: "11-22 Jun 2026",
    theme: "solstice",
    intro:
      "Dark Mofo anchors Hobart's winter with a solstice program of art, music, night events and ritual-scale public moments.",
    countdownCopy:
      "Keep this as the solstice countdown shell until live event sections are ready.",
    position: -1000,
    lat: -42.8821,
    lng: 147.3272,
  },
  {
    slug: "kings-birthday-hobart-2026",
    city: "Hobart",
    citySlug: "hobart",
    state: "TAS",
    title: "King's Birthday Weekend: Farm Gate Market",
    sourceUrl: "https://farmgatemarket.com.au/",
    sourceLabel: "Farm Gate Market",
    imageSourceUrl:
      "https://commons.wikimedia.org/wiki/File:Hobart_FarmerMarket_003_2020.jpg",
    coverImageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8a/Hobart_FarmerMarket_003_2020.jpg",
    bannerImageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8a/Hobart_FarmerMarket_003_2020.jpg",
    startDate: "2026-06-07",
    endDate: "2026-06-07",
    timezone: "Australia/Hobart",
    displayDate: "7 Jun 2026",
    theme: "sunset-market",
    intro:
      "Farm Gate Market turns Bathurst Street into a Sunday King's Birthday weekend food route, with seasonal produce, street food, coffee and local makers in central Hobart.",
    countdownCopy:
      "Farm Gate Market is the Sunday morning anchor for Hobart's King's Birthday weekend. Check the official source for weather and stall updates.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -42.881249,
    lng: 147.325013,
    liveSections: [
      {
        name: "Bathurst Street produce run",
        description:
          "Start with fresh produce and pantry stalls along Bathurst Street, then choose a simple corner meet-up before the market gets busy.",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/8/8a/Hobart_FarmerMarket_003_2020.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-42.881249,147.325013&travelmode=driving",
        lat: -42.881249,
        lng: 147.325013,
      },
      {
        name: "Grub Hub brunch",
        description:
          "Use the market's Grub Hub as the brunch stop, with rotating street food vendors and coffee before a waterfront or city walk.",
        imageUrl:
          "https://upload.wikimedia.org/wikipedia/commons/8/8a/Hobart_FarmerMarket_003_2020.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-42.881249,147.325013&travelmode=driving",
        lat: -42.881249,
        lng: 147.325013,
      },
    ],
  },
  {
    slug: "festival-of-voices-hobart-2026",
    city: "Hobart",
    citySlug: "hobart",
    state: "TAS",
    title: "Festival of Voices 2026",
    sourceUrl:
      "https://www.hobartcity.com.au/Things-To-Do/Upcoming-events/Festival-of-Voices",
    sourceLabel: "City of Hobart",
    coverImageUrl:
      "https://www.hobartcity.com.au/files/assets/public2/v/1/events/events/festival-of-voices-2026.png?w=1200",
    bannerImageUrl:
      "https://www.hobartcity.com.au/files/assets/public2/v/1/events/events/festival-of-voices-2026.png?w=1200",
    startDate: "2026-07-03",
    endDate: "2026-07-12",
    timezone: "Australia/Hobart",
    displayDate: "3-12 Jul 2026",
    theme: "voices",
    intro:
      "Festival of Voices fills Hobart with choirs, concerts, workshops and warm indoor winter gatherings.",
    countdownCopy:
      "This page stays as a countdown and event-info shell until the live program sections are set.",
    position: -990,
    lat: -42.8826,
    lng: 147.3257,
  },
  {
    slug: "mindil-beach-sunset-market-2026",
    city: "Darwin",
    citySlug: "darwin",
    state: "NT",
    title: "Mindil Beach Sunset Market 2026",
    sourceUrl: "https://mindil.com.au/",
    sourceLabel: "Mindil Beach Sunset Market",
    imageSourceUrl: "https://mindil.com.au/private-events/",
    coverImageUrl:
      "https://mindil.com.au/assets/image-cache/Mindil%20beach%20Sunset%20-%20Web-1.2b8a3154.jpg",
    bannerImageUrl:
      "https://mindil.com.au/assets/image-cache/Mindil%20beach%20Sunset%20-%20Web-1.2b8a3154.jpg",
    startDate: "2026-04-30",
    endDate: "2026-10-29",
    timezone: "Australia/Darwin",
    displayDate: "Apr-Oct 2026 season",
    theme: "sunset-market",
    intro:
      "Mindil Beach Sunset Market is Darwin's dry-season ritual: beach sunsets, food stalls, crafts and relaxed evening meetups.",
    countdownCopy:
      "The market season is almost here. Live stall and sunset planning sections will appear during the season.",
    position: -1000,
    lat: -12.4472,
    lng: 130.8304,
    liveSections: [
      {
        name: "Sunset first, food after",
        description:
          "Arrive before dusk, choose a simple beach meeting point, then move through the food stalls once the light drops.",
      },
      {
        name: "Market browse route",
        description:
          "Use the market as a relaxed loop: food, craft stalls, music and a clear exit plan for the trip home.",
      },
    ],
  },
  {
    slug: "kings-birthday-darwin-2026",
    city: "Darwin",
    citySlug: "darwin",
    state: "NT",
    title: "King's Birthday Weekend: Darwin GleNTi Festival",
    sourceUrl:
      "https://northernterritory.com/us/en/darwin-and-surrounds/events/darwin-glenti-festival",
    sourceLabel: "Northern Territory",
    coverImageUrl:
      "https://images.northernterritory.com/atdw-cache/images/beb3051dad6fa8c799d5572fcc99109d.jpeg?rect=0%2C0%2C2133%2C1200&w=1200&h=630&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTRkZTBlMmI0ZjczMTAwNzI2NjMzMiIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZWI5MzQ0ZmVjYTNkZjJlMzIwY2EiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGY2NSJ9&fit=crop&auto=enhance%2Ccompress",
    bannerImageUrl:
      "https://images.northernterritory.com/atdw-cache/images/beb3051dad6fa8c799d5572fcc99109d.jpeg?rect=0%2C0%2C2133%2C1200&w=1200&h=630&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTRkZTBlMmI0ZjczMTAwNzI2NjMzMiIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZWI5MzQ0ZmVjYTNkZjJlMzIwY2EiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGY2NSJ9&fit=crop&auto=enhance%2Ccompress",
    startDate: "2026-06-06",
    endDate: "2026-06-07",
    timezone: "Australia/Darwin",
    displayDate: "6-7 Jun 2026",
    theme: "tropical",
    intro:
      "Darwin GleNTi Festival brings Greek food, music, dancing and family-friendly cultural programming to the Esplanade for the King's Birthday weekend.",
    countdownCopy:
      "Darwin GleNTi Festival is almost here. Check the official source for the latest program and venue notes.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -12.464177,
    lng: 130.839701,
    liveSections: [
      {
        name: "Greek food stalls and community plates",
        description:
          "Arrive hungry for Greek food stalls and shared plates, using the Esplanade festival area as the main meeting point.",
        imageUrl:
          "https://images.northernterritory.com/atdw-cache/images/beb3051dad6fa8c799d5572fcc99109d.jpeg?rect=0%2C0%2C2133%2C1200&w=1200&h=630&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTRkZTBlMmI0ZjczMTAwNzI2NjMzMiIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZWI5MzQ0ZmVjYTNkZjJlMzIwY2EiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGY2NSJ9&fit=crop&auto=enhance%2Ccompress",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-12.464177,130.839701&travelmode=driving",
        lat: -12.464177,
        lng: 130.839701,
      },
      {
        name: "Music, dancing and cultural displays",
        description:
          "Plan a longer stay for Greek music, traditional dancing, cultural displays and family-friendly entertainment through the festival day.",
        imageUrl:
          "https://images.northernterritory.com/atdw-cache/images/beb3051dad6fa8c799d5572fcc99109d.jpeg?rect=0%2C0%2C2133%2C1200&w=1200&h=630&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTRkZTBlMmI0ZjczMTAwNzI2NjMzMiIsImRpc3RyaWJ1dG9ySWQiOiI1NmIxZWI5MzQ0ZmVjYTNkZjJlMzIwY2EiLCJhcGlrZXlJZCI6IjU2YjFmNjNmMGNmMjEzYWQyMGRlZGY2NSJ9&fit=crop&auto=enhance%2Ccompress",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-12.464177,130.839701&travelmode=driving",
        lat: -12.464177,
        lng: 130.839701,
      },
    ],
  },
  {
    slug: "darwin-festival-2026",
    city: "Darwin",
    citySlug: "darwin",
    state: "NT",
    title: "Darwin Festival 2026",
    sourceUrl: "https://www.darwin.nt.gov.au/explore/whats-on/darwin-festival-1",
    sourceLabel: "City of Darwin",
    coverImageUrl:
      "https://www.darwin.nt.gov.au/sites/default/files/webform/submit_an_event/event-image-73493.jpeg",
    bannerImageUrl:
      "https://www.darwin.nt.gov.au/sites/default/files/webform/submit_an_event/event-image-73493.jpeg",
    startDate: "2026-08-06",
    endDate: "2026-08-23",
    timezone: "Australia/Darwin",
    displayDate: "6-23 Aug 2026",
    theme: "tropical",
    intro:
      "Darwin Festival brings the dry-season city together with performance, music, outdoor nights and Festival Park energy.",
    countdownCopy:
      "Use this tropical countdown shell until live program sections are ready.",
    position: -990,
    lat: -12.4634,
    lng: 130.8456,
  },
  {
    slug: "swell-sculpture-festival-2026",
    city: "Gold Coast",
    citySlug: "gold-coast",
    state: "QLD",
    title: "SWELL Sculpture Festival 2026",
    sourceUrl: "https://www.swellsculpture.com.au/",
    sourceLabel: "SWELL Sculpture Festival",
    coverImageUrl:
      "https://www.swellsculpture.com.au/wp-content/uploads/SWELL-Sculpture-Festival_Frederick-Beel_Verdant-Deployment_Image-Leximagery_LEXI8116-1.jpg",
    bannerImageUrl:
      "https://www.swellsculpture.com.au/wp-content/uploads/SWELL-Sculpture-Festival_Frederick-Beel_Verdant-Deployment_Image-Leximagery_LEXI8116-1.jpg",
    startDate: "2026-09-11",
    endDate: "2026-09-20",
    timezone: "Australia/Brisbane",
    displayDate: "11-20 Sep 2026",
    theme: "beach-gallery",
    intro:
      "SWELL turns the beach into an outdoor sculpture walk, with art, sand, ocean light and easy coastal wandering.",
    countdownCopy:
      "The beach gallery page is in countdown mode until sculpture and route sections are ready.",
    position: -1000,
    lat: -28.0896,
    lng: 153.4537,
  },
  {
    slug: "bleach-gold-coast-2026",
    city: "Gold Coast",
    citySlug: "gold-coast",
    state: "QLD",
    title: "BLEACH* Gold Coast 2026",
    sourceUrl: "https://www.hota.com.au/whats-on/live/festivals-and-series/bleach-2026",
    sourceLabel: "HOTA",
    coverImageUrl:
      "https://hota.com.au/generated/share-image/paul-dempsey-shotgun-karaoke-vol-ii-1920x1080-png-1780009920.jpg",
    bannerImageUrl:
      "https://hota.com.au/generated/share-image/paul-dempsey-shotgun-karaoke-vol-ii-1920x1080-png-1780009920.jpg",
    startDate: "2026-10-01",
    endDate: "2026-10-11",
    timezone: "Australia/Brisbane",
    displayDate: "1-11 Oct 2026",
    theme: "surf-arts",
    intro:
      "BLEACH* is the Gold Coast's contemporary arts festival, spread across coastal places, performance spaces and civic venues.",
    countdownCopy:
      "This surf-arts page stays as a countdown shell until the program can be split into live sections.",
    position: -990,
    lat: -28.0001,
    lng: 153.4169,
  },
  {
    slug: "new-annual-newcastle-2026",
    city: "Newcastle",
    citySlug: "newcastle",
    state: "NSW",
    title: "New Annual Newcastle 2026",
    sourceUrl: "https://linktr.ee/Newannualfestival",
    sourceLabel: "New Annual",
    coverImageUrl: "https://linktr.ee/og/image/Newannualfestival.jpg",
    bannerImageUrl: "https://linktr.ee/og/image/Newannualfestival.jpg",
    startDate: "2026-09-25",
    endDate: "2026-10-04",
    timezone: "Australia/Sydney",
    displayDate: "25 Sep-4 Oct 2026",
    theme: "laneway-arts",
    intro:
      "New Annual is Newcastle's city arts festival, built around local commissions, performance, public places and creative trails.",
    countdownCopy:
      "Keep this laneway arts page in countdown mode until the 2026 program sections are live.",
    position: -1000,
    lat: -32.9283,
    lng: 151.7817,
  },
  {
    slug: "kings-birthday-newcastle-2026",
    city: "Newcastle",
    citySlug: "newcastle",
    state: "NSW",
    title: "King's Birthday Weekend: Newcastle Harbour Cruise",
    sourceUrl:
      "https://events10.com.au/events/kings-birthday-long-weekend-degustation-lunch-newcastle-harbour-cruise/",
    sourceLabel: "Events10",
    coverImageUrl:
      "https://assets.atdw-online.com.au/images/828ee1d59a07bd9fc3c92e3f14d76bc9.jpeg?rect=0%2C150%2C1600%2C900&w=1600&h=900&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTNlMDNjMGFkY2I2ZmYyNDc5MzAyMCIsImRpc3RyaWJ1dG9ySWQiOiI2MjQ2NTYzZmZmZTU2Njg1NTBmMTg2MWYiLCJhcGlrZXlJZCI6IjYyNDY1NjNmZmZlNTY2ODU1MGYxODYyNSJ9",
    bannerImageUrl:
      "https://assets.atdw-online.com.au/images/828ee1d59a07bd9fc3c92e3f14d76bc9.jpeg?rect=0%2C150%2C1600%2C900&w=1600&h=900&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTNlMDNjMGFkY2I2ZmYyNDc5MzAyMCIsImRpc3RyaWJ1dG9ySWQiOiI2MjQ2NTYzZmZmZTU2Njg1NTBmMTg2MWYiLCJhcGlrZXlJZCI6IjYyNDY1NjNmZmZlNTY2ODU1MGYxODYyNSJ9",
    startDate: "2026-06-07",
    endDate: "2026-06-07",
    timezone: "Australia/Sydney",
    displayDate: "7 Jun 2026",
    theme: "coastal-folk",
    intro:
      "Newcastle's King's Birthday weekend harbour plan is a degustation lunch cruise from Queens Wharf, with water views and a fixed two-and-a-half-hour schedule.",
    countdownCopy:
      "The Newcastle Harbour Cruise is ready for King's Birthday weekend planning. Check the official source for ticket and boarding details.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -32.925539,
    lng: 151.780789,
    liveSections: [
      {
        name: "Queens Wharf boarding point",
        description:
          "Arrive at Queens Wharf early enough for boarding, ticket checks and a clear group meet-up before the harbour cruise departs.",
        imageUrl:
          "https://assets.atdw-online.com.au/images/828ee1d59a07bd9fc3c92e3f14d76bc9.jpeg?rect=0%2C150%2C1600%2C900&w=1600&h=900&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTNlMDNjMGFkY2I2ZmYyNDc5MzAyMCIsImRpc3RyaWJ1dG9ySWQiOiI2MjQ2NTYzZmZmZTU2Njg1NTBmMTg2MWYiLCJhcGlrZXlJZCI6IjYyNDY1NjNmZmZlNTY2ODU1MGYxODYyNSJ9",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-32.925539,151.780789&travelmode=driving",
        lat: -32.925539,
        lng: 151.780789,
      },
      {
        name: "Degustation lunch on the harbour",
        description:
          "Treat the cruise as the main lunch booking, then plan a simple Wharf Road exit or waterfront walk after disembarking.",
        imageUrl:
          "https://assets.atdw-online.com.au/images/828ee1d59a07bd9fc3c92e3f14d76bc9.jpeg?rect=0%2C150%2C1600%2C900&w=1600&h=900&rot=360&q=eyJ0eXBlIjoibGlzdGluZyIsImxpc3RpbmdJZCI6IjZhMTNlMDNjMGFkY2I2ZmYyNDc5MzAyMCIsImRpc3RyaWJ1dG9ySWQiOiI2MjQ2NTYzZmZmZTU2Njg1NTBmMTg2MWYiLCJhcGlrZXlJZCI6IjYyNDY1NjNmZmZlNTY2ODU1MGYxODYyNSJ9",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-32.925539,151.780789&travelmode=driving",
        lat: -32.925539,
        lng: 151.780789,
      },
    ],
  },
  {
    slug: "culture-mix-wollongong-2026",
    city: "Wollongong",
    citySlug: "wollongong",
    state: "NSW",
    title: "Culture Mix Wollongong 2026",
    sourceUrl:
      "https://www.wollongong.nsw.gov.au/council/news/articles/2026/april-2026/put-yourself-in-the-culture-mix-in-2026",
    sourceLabel: "Wollongong City Council",
    coverImageUrl:
      "https://www.wollongong.nsw.gov.au/__data/assets/image/0013/322222/culture-mix-2025.jpg",
    bannerImageUrl:
      "https://www.wollongong.nsw.gov.au/__data/assets/image/0013/322222/culture-mix-2025.jpg",
    startDate: "2026-09-26",
    endDate: "2026-09-26",
    timezone: "Australia/Sydney",
    displayDate: "26 Sep 2026",
    theme: "culture-mosaic",
    intro:
      "Culture Mix is Wollongong's city-centre celebration of music, dance, food, community stories and shared public space.",
    countdownCopy:
      "The culture mosaic page stays in countdown mode until the live program is ready.",
    position: -1000,
    lat: -34.4248,
    lng: 150.8931,
  },
  {
    slug: "kings-birthday-wollongong-2026",
    city: "Wollongong",
    citySlug: "wollongong",
    state: "NSW",
    title: "King's Birthday Weekend: Wollongong Running Festival",
    sourceUrl:
      "https://www.visitwollongong.com.au/event/wollongong-running-festival-2/",
    sourceLabel: "Destination Wollongong",
    coverImageUrl:
      "https://www.visitwollongong.com.au/wp-content/uploads/2026/02/69a0f35c7ceb64dd410b4c52-830x470.jpg",
    bannerImageUrl:
      "https://www.visitwollongong.com.au/wp-content/uploads/2026/02/69a0f35c7ceb64dd410b4c52-830x470.jpg",
    startDate: "2026-06-07",
    endDate: "2026-06-07",
    timezone: "Australia/Sydney",
    displayDate: "7 Jun 2026",
    theme: "beach-gallery",
    intro:
      "Wollongong Running Festival turns the foreshore into a King's Birthday weekend active plan, with race starts, supporter spots and post-run harbour time.",
    countdownCopy:
      "Wollongong Running Festival is nearly here. Check the official source for start times, course notes and road closures.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -34.424261,
    lng: 150.904374,
    liveSections: [
      {
        name: "Harbour Street race precinct",
        description:
          "Use the Lang Park and Harbour Street area as the race-day anchor for starts, bibs, supporters and post-run regrouping.",
        imageUrl:
          "https://www.visitwollongong.com.au/wp-content/uploads/2026/02/69a0f35c7ceb64dd410b4c52-830x470.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-34.424261,150.904374&travelmode=driving",
        lat: -34.424261,
        lng: 150.904374,
      },
      {
        name: "Foreshore recovery walk",
        description:
          "After the run, keep the group close to the harbour and beach paths for coffee, photos and an easy public-transport or parking exit.",
        imageUrl:
          "https://www.visitwollongong.com.au/wp-content/uploads/2026/02/69a0f35c7ceb64dd410b4c52-830x470.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-34.424261,150.904374&travelmode=driving",
        lat: -34.424261,
        lng: 150.904374,
      },
    ],
  },
  {
    slug: "national-celtic-folk-festival-geelong-2026",
    city: "Geelong",
    citySlug: "geelong",
    state: "VIC",
    title: "King's Birthday Weekend: National Celtic Folk Festival",
    sourceUrl:
      "https://www.nationalcelticfestival.com/nationalcelticfolkfestival",
    sourceLabel: "National Celtic Folk Festival",
    coverImageUrl:
      "https://static.wixstatic.com/media/ed8d70_fc1e67de7bfb43eba6fa9743c60222c8~mv2.jpg",
    bannerImageUrl:
      "https://static.wixstatic.com/media/ed8d70_fc1e67de7bfb43eba6fa9743c60222c8~mv2.jpg",
    startDate: "2026-06-05",
    endDate: "2026-06-08",
    timezone: "Australia/Melbourne",
    displayDate: "5-8 Jun 2026",
    theme: "coastal-folk",
    intro:
      "The National Celtic Folk Festival brings coastal folk music, dance, sessions and cultural programming to the Geelong region.",
    countdownCopy:
      "This coastal folk page is in countdown mode until live program sections are ready.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -38.115656,
    lng: 144.653063,
    liveSections: [
      {
        name: "Portarlington festival village",
        description:
          "Use Portarlington as the base for music stages, folk sessions, food and coastal movement between festival venues.",
        imageUrl:
          "https://static.wixstatic.com/media/ed8d70_fc1e67de7bfb43eba6fa9743c60222c8~mv2.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-38.115656,144.653063&travelmode=driving",
        lat: -38.115656,
        lng: 144.653063,
      },
      {
        name: "Music, dance and cultural workshops",
        description:
          "Build the day around ticketed concerts, dance sessions, family programming and free town-centre festival moments.",
        imageUrl:
          "https://static.wixstatic.com/media/ed8d70_fc1e67de7bfb43eba6fa9743c60222c8~mv2.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-38.115656,144.653063&travelmode=driving",
        lat: -38.115656,
        lng: 144.653063,
      },
    ],
  },
  {
    slug: "armidale-eisteddfod-2026",
    city: "Armidale",
    citySlug: "armidale",
    state: "NSW",
    title: "Armidale Eisteddfod 2026",
    sourceUrl:
      "https://www.armidale.nsw.gov.au/Our-region/Events/The-Armidale-Eisteddfod",
    sourceLabel: "Armidale Regional Council",
    coverImageUrl:
      "https://www.armidale.nsw.gov.au/files/content/mycity/v/1/events/the-armidale-eisteddfod/armidale-youth-orchestra-conductor-robert-van-gent.jpg?w=1200",
    bannerImageUrl:
      "https://www.armidale.nsw.gov.au/files/content/mycity/v/1/events/the-armidale-eisteddfod/armidale-youth-orchestra-conductor-robert-van-gent.jpg?w=1200",
    startDate: "2026-05-25",
    endDate: "2026-06-03",
    timezone: "Australia/Sydney",
    displayDate: "25 May-3 Jun 2026",
    theme: "stage",
    intro:
      "Armidale Eisteddfod brings local and regional performance into focus, with stage events across music, speech, drama and dance.",
    countdownCopy:
      "This performance page is ready to become a live guide while the Eisteddfod is running.",
    position: -1000,
    lat: -30.5143,
    lng: 151.6656,
    liveSections: [
      {
        name: "Performance schedule check",
        description:
          "Start with the official program, then choose a section of performances that fits your day and transport plan.",
      },
      {
        name: "Stage-day meetup plan",
        description:
          "Pick a simple venue meeting point and leave time between sessions for entry, warm-up and food breaks.",
      },
    ],
  },
  {
    slug: "kings-birthday-armidale-2026",
    city: "Armidale",
    citySlug: "armidale",
    state: "NSW",
    title: "King's Birthday Weekend: NERAM Winter Exhibitions",
    sourceUrl: "https://www.neram.com.au/",
    sourceLabel: "New England Regional Art Museum",
    coverImageUrl:
      "https://www.neram.com.au/content/uploads/2020/05/Neram_Hinton-Collection-2018-017-1.jpg",
    bannerImageUrl:
      "https://www.neram.com.au/content/uploads/2020/05/Neram_Hinton-Collection-2018-017-1.jpg",
    startDate: "2026-06-06",
    endDate: "2026-06-07",
    timezone: "Australia/Sydney",
    displayDate: "6-7 Jun 2026",
    theme: "stage",
    intro:
      "NERAM gives Armidale a winter King's Birthday weekend art plan, with gallery visits, current exhibitions, the Hinton collection and a compact Kentucky Street destination.",
    countdownCopy:
      "NERAM is ready for a King's Birthday weekend gallery visit. Check the official source for exhibition and opening-hour updates.",
    position: -2000,
    pinInGuideFeed: true,
    lat: -30.52526,
    lng: 151.664863,
    liveSections: [
      {
        name: "Winter Blooming and current exhibitions",
        description:
          "Start with NERAM's current exhibitions, including winter-season programming and shows closing around the long weekend.",
        imageUrl:
          "https://www.neram.com.au/content/uploads/2026/04/Community-Day-Swamp-Hens-and-Coots-Billy-Bung-Lagoon_oil-on-linen_705mm-x-500mm_2025.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-30.525260,151.664863&travelmode=driving",
        lat: -30.52526,
        lng: 151.664863,
      },
      {
        name: "Hinton collection and museum shop",
        description:
          "Leave time for Wonders of Hinton, the museum shop and a relaxed gallery loop before the 4pm close.",
        imageUrl:
          "https://www.neram.com.au/content/uploads/2020/05/Neram_Hinton-Collection-2018-017-1.jpg",
        navigationLink:
          "https://www.google.com/maps/dir/?api=1&destination=-30.525260,151.664863&travelmode=driving",
        lat: -30.52526,
        lng: 151.664863,
      },
    ],
  },
];

const FLAGSHIP_EVENT_GUIDES_BY_SLUG = new Map(
  FLAGSHIP_EVENT_GUIDES.map((guide) => [guide.slug, guide]),
);

function getDayKeyForTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "00";
  const day = parts.find((part) => part.type === "day")?.value || "00";
  return `${year}-${month}-${day}`;
}

function getUtcDayValue(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map((part) => Number(part));
  return Date.UTC(year, month - 1, day);
}

export function diffFlagshipEventDays(fromDayKey: string, toDayKey: string) {
  return Math.round(
    (getUtcDayValue(toDayKey) - getUtcDayValue(fromDayKey)) /
      (24 * 60 * 60 * 1000),
  );
}

export function getFlagshipEventStatus(
  entry: FlagshipEventGuideEntry,
  now = new Date(),
): FlagshipEventStatus {
  const today = getDayKeyForTimeZone(now, entry.timezone);
  if (today < entry.startDate) return "countdown";
  if (today > entry.endDate) return "past";
  return "live";
}

export function getFlagshipEventCountdownDays(
  entry: FlagshipEventGuideEntry,
  now = new Date(),
) {
  const today = getDayKeyForTimeZone(now, entry.timezone);
  const status = getFlagshipEventStatus(entry, now);
  return {
    status,
    daysUntilStart: diffFlagshipEventDays(today, entry.startDate),
    daysUntilEnd: diffFlagshipEventDays(today, entry.endDate),
  };
}

function buildFlagshipPlace(
  entry: FlagshipEventGuideEntry,
  place: FlagshipEventLiveSection,
  imageUrl: string,
  index: number,
): CityGuidePlace {
  return {
    id: `${entry.slug}-section-${index + 1}`,
    name: place.name,
    description: place.description,
    image_url: getFlagshipImageUrl(imageUrl, `${entry.slug} place image`),
    navigation_link: place.navigationLink || entry.sourceUrl,
    lat: place.lat ?? entry.lat,
    lng: place.lng ?? entry.lng,
    position: index,
  };
}

function buildPreviewPlace(entry: FlagshipEventGuideEntry): CityGuidePlace {
  return buildFlagshipPlace(
    entry,
    {
      name: "Event info and countdown",
      description: `${entry.countdownCopy}\n\nOfficial source: ${entry.sourceLabel}. Dates: ${entry.displayDate}.`,
    },
    entry.coverImageUrl,
    0,
  );
}

export function toFlagshipCityGuide(
  entry: FlagshipEventGuideEntry,
  now = new Date(),
): CityGuide {
  const status = getFlagshipEventStatus(entry, now);
  const sourceSections =
    status === "live" && entry.liveSections?.length
      ? entry.liveSections
      : null;
  const places = sourceSections
    ? sourceSections.map((section, index) =>
        buildFlagshipPlace(
          entry,
          section,
          section.imageUrl || entry.coverImageUrl,
          index,
        ),
      )
    : [buildPreviewPlace(entry)];

  return {
    id: `flagship-${entry.slug}`,
    slug: entry.slug,
    city: entry.city,
    city_slug: entry.citySlug,
    state: entry.state,
    title: entry.title,
    cover_image_url: getFlagshipImageUrl(
      entry.bannerImageUrl,
      `${entry.slug} banner image`,
    ),
    intro: entry.intro,
    app_variant: APP_VARIANT_ALL,
    position: entry.position,
    created_at: `${entry.startDate}T00:00:00.000Z`,
    updated_at: `${entry.startDate}T00:00:00.000Z`,
    places,
  };
}

export function getVisibleFlagshipEventGuideEntries(
  citySlug: string,
  now = new Date(),
) {
  return FLAGSHIP_EVENT_GUIDES.filter(
    (entry) =>
      entry.surfaceInGuideFeed !== false &&
      entry.citySlug === citySlug &&
      getFlagshipEventStatus(entry, now) !== "past",
  ).sort((left, right) => left.position - right.position);
}

export function getVisibleFlagshipEventGuides(
  citySlug: string,
  now = new Date(),
) {
  return getVisibleFlagshipEventGuideEntries(citySlug, now).map((entry) =>
    toFlagshipCityGuide(entry, now),
  );
}

export function mergeFlagshipEventGuides(
  citySlug: string,
  apiGuides: CityGuide[],
  now = new Date(),
) {
  const apiGuideSlugs = new Set(apiGuides.map((guide) => guide.slug));
  const staticGuides = getVisibleFlagshipEventGuides(citySlug, now).filter(
    (guide) => !apiGuideSlugs.has(guide.slug),
  );
  return [...staticGuides, ...apiGuides];
}

export function getFlagshipEventGuideMeta(
  guide: Pick<CityGuide, "slug" | "city" | "city_slug"> | null | undefined,
) {
  if (!guide) return null;
  const exact = FLAGSHIP_EVENT_GUIDES_BY_SLUG.get(guide.slug);
  if (exact) return exact;

  const citySlug = guide.city_slug || "";
  if (citySlug === "sydney" && guide.slug.startsWith("vivid-sydney-2026")) {
    return FLAGSHIP_EVENT_GUIDES_BY_SLUG.get("vivid-sydney-2026") || null;
  }

  return null;
}

export function getFlagshipEventThemeClass(entry: FlagshipEventGuideEntry) {
  return `hoodie-flagship-theme-${entry.theme}`;
}
