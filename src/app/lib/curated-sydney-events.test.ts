import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCuratedSydneyOfficialEvent,
  mergeCuratedSydneyOfficialEvents,
} from './curated-sydney-events';

const emptyMeta = {
  available_categories: [],
  available_tags: [],
};

describe('curated Sydney events', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves Hendry's Turning 2 until Sunday 4pm Sydney time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-14T05:59:59.000Z'));

    const event = getCuratedSydneyOfficialEvent('cityofsydney', 'hendrys-turning-2');

    expect(event).toMatchObject({
      source: 'cityofsydney',
      slug: 'hendrys-turning-2',
      title: "Hendry's is Turning 2",
      source_url: 'https://www.instagram.com/hendryscoffee',
      instagram_post_image_url: '/event-assets/hendrys-turning-2-feed.png',
      instagram_story_image_url: '/event-assets/hendrys-turning-2-story.png',
    });
  });

  it("hides Hendry's Turning 2 after Sunday 4pm Sydney time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-14T06:00:01.000Z'));

    expect(getCuratedSydneyOfficialEvent('cityofsydney', 'hendrys-turning-2')).toBeNull();
  });

  it("merges Hendry's Turning 2 into the visible Vibe event feed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T00:00:00.000Z'));

    const response = mergeCuratedSydneyOfficialEvents(
      {
        data: [],
        meta: emptyMeta,
      },
      {
        startDay: '2026-06-12',
        endDay: '2026-06-14',
        centerLat: -33.8688,
        centerLng: 151.2093,
        limit: 10,
      },
    );

    const hendrys = response.data.find((event) => event.slug === 'hendrys-turning-2');
    expect(hendrys).toMatchObject({
      lat: -33.877426,
      lng: 151.2158231,
    });
    expect(response.meta.available_tags.some((tag) => tag.id === 'matcha')).toBe(true);
  });

  it('serves the Starbucks Matcha BOGO event for the Hoodie promo route', () => {
    const event = getCuratedSydneyOfficialEvent('cityofsydney', 'starbucks-matcha-bogo-2026');

    expect(event).toMatchObject({
      source: 'cityofsydney',
      source_label: 'Starbucks Rewards',
      slug: 'starbucks-matcha-bogo-2026',
      title: 'Starbucks Matcha Buy 1, Get 1 Free',
      image_url:
        'https://pcgdqsdiidtiziypvqri.supabase.co/storage/v1/object/public/make-1d591b90-guide-assets/event-assets/starbucks-matcha-bogo-2026-feed.jpg',
      upcoming_date: '2026-06-22',
    });
  });

  it('merges the Starbucks Matcha BOGO event into the 22 June event feed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T00:00:00.000Z'));

    const response = mergeCuratedSydneyOfficialEvents(
      {
        data: [],
        meta: emptyMeta,
      },
      {
        startDay: '2026-06-22',
        endDay: '2026-06-22',
        limit: 10,
      },
    );

    const starbucks = response.data.find((event) => event.slug === 'starbucks-matcha-bogo-2026');
    expect(starbucks).toMatchObject({
      source: 'cityofsydney',
      categories: ['Food & drink', 'Special events'],
      tags: ['Starbucks', 'Matcha', 'Rewards', 'Buy one get one free'],
    });
    expect(response.meta.available_categories.some((category) => category.id === 'food-drink')).toBe(true);
  });
});
