import { describe, expect, it } from 'vitest';
import {
  HENDRYS_TURNING_2_EVENT_ROUTE,
  HENDRYS_TURNING_2_NOTICEBOARD_BANNER_URL,
  getNoticeboardBannerSequence,
} from './curated-noticeboard-banners';

describe('curated noticeboard banners', () => {
  it("shows the Hendry's banner until Sunday 4pm Sydney time", () => {
    const banners = getNoticeboardBannerSequence([], {
      now: new Date('2026-06-14T05:59:59.000Z'),
      appVariant: 'burb_mate',
    });
    const hendrysBanner = banners.find((banner) => banner.id === 'curated-hendrys-turning-2-2026');

    expect(hendrysBanner).toMatchObject({
      url: HENDRYS_TURNING_2_NOTICEBOARD_BANNER_URL,
      link: HENDRYS_TURNING_2_EVENT_ROUTE,
      app_variant: 'all',
      placement: 'noticeboard',
    });
  });

  it("hides the Hendry's banner after Sunday 4pm Sydney time", () => {
    const banners = getNoticeboardBannerSequence([], {
      now: new Date('2026-06-14T06:00:01.000Z'),
      appVariant: 'ghar',
    });

    expect(banners.some((banner) => banner.id === 'curated-hendrys-turning-2-2026')).toBe(false);
  });
});
