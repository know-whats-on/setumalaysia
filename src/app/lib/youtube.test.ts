import { describe, expect, it } from 'vitest';
import { buildYouTubeEmbedUrl, getYouTubeVideoId } from './youtube';

describe('youtube helpers', () => {
  it('extracts video ids from common youtube URLs', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=M7lc1UVf-VE')).toBe('M7lc1UVf-VE');
    expect(getYouTubeVideoId('https://youtu.be/M7lc1UVf-VE')).toBe('M7lc1UVf-VE');
    expect(getYouTubeVideoId('https://www.youtube.com/embed/M7lc1UVf-VE?rel=0')).toBe('M7lc1UVf-VE');
    expect(getYouTubeVideoId('https://youtube.com/shorts/oQHULCQ0nhc?feature=share')).toBe('oQHULCQ0nhc');
    expect(getYouTubeVideoId('https://youtube.com/shorts/3zI8wRlxz8c?feature=share')).toBe('3zI8wRlxz8c');
    expect(getYouTubeVideoId('https://youtube.com/shorts/6kdz9YeQNSE?feature=share')).toBe('6kdz9YeQNSE');
    expect(getYouTubeVideoId('https://youtube.com/shorts/IchTV03XVTs?feature=share')).toBe('IchTV03XVTs');
    expect(getYouTubeVideoId('https://youtube.com/shorts/oIYkPlja45M?feature=share')).toBe('oIYkPlja45M');
    expect(getYouTubeVideoId('https://youtube.com/shorts/GsA-MUGt59k?feature=share')).toBe('GsA-MUGt59k');
    expect(getYouTubeVideoId('https://youtube.com/shorts/F2Mr5k0aeEo?feature=share')).toBe('F2Mr5k0aeEo');
    expect(getYouTubeVideoId('https://youtube.com/shorts/t12CPc2q1T4?feature=share')).toBe('t12CPc2q1T4');
    expect(getYouTubeVideoId('https://youtube.com/shorts/G94N-9AoTV4?feature=share')).toBe('G94N-9AoTV4');
    expect(getYouTubeVideoId('M7lc1UVf-VE')).toBe('M7lc1UVf-VE');
  });

  it('returns null for invalid values', () => {
    expect(getYouTubeVideoId('')).toBeNull();
    expect(getYouTubeVideoId('https://example.com/watch?v=abc')).toBeNull();
    expect(getYouTubeVideoId('not-a-youtube-url')).toBeNull();
  });

  it('builds locked-down embed URLs for onboarding shorts', () => {
    const embedUrl = buildYouTubeEmbedUrl('M7lc1UVf-VE', {
      autoplay: true,
      muted: false,
      controls: false,
      loop: true,
      fullscreen: false,
      disableKeyboard: true,
      host: 'youtube-nocookie',
    });

    expect(embedUrl).toContain('https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?');
    expect(embedUrl).toContain('autoplay=1');
    expect(embedUrl).toContain('mute=0');
    expect(embedUrl).toContain('controls=0');
    expect(embedUrl).toContain('fs=0');
    expect(embedUrl).toContain('disablekb=1');
    expect(embedUrl).toContain('playlist=M7lc1UVf-VE');
  });

  it('supports app identity parameters for native embeds', () => {
    const embedUrl = buildYouTubeEmbedUrl('M7lc1UVf-VE', {
      autoplay: true,
      muted: true,
      controls: false,
      loop: true,
      fullscreen: false,
      disableKeyboard: true,
      host: 'youtube',
      origin: 'https://com.burbmate.app',
      widgetReferrer: 'https://com.burbmate.app',
    });

    expect(embedUrl).toContain('https://www.youtube.com/embed/M7lc1UVf-VE?');
    expect(embedUrl).toContain('origin=https%3A%2F%2Fcom.burbmate.app');
    expect(embedUrl).toContain('widget_referrer=https%3A%2F%2Fcom.burbmate.app');
  });
});
