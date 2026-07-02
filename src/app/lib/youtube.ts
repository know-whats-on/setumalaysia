export type YouTubeEmbedHost = 'youtube' | 'youtube-nocookie';

export function getYouTubeVideoId(url: string): string | null {
  const normalized = String(url || '').trim();
  if (!normalized) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(normalized)) return normalized;

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const watchId = parsed.searchParams.get('v');
      if (watchId && /^[A-Za-z0-9_-]{11}$/.test(watchId)) return watchId;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const embedIndex = pathParts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live' || part === 'v');
      if (embedIndex >= 0) {
        const embeddedId = pathParts[embedIndex + 1] || '';
        return /^[A-Za-z0-9_-]{11}$/.test(embeddedId) ? embeddedId : null;
      }
    }
  } catch {
    // Fall back to regex matching when the value is not a fully qualified URL.
  }

  const match = normalized.match(/(?:youtu\.be\/|watch\?v=|\/embed\/|\/shorts\/|\/live\/|\/v\/)([A-Za-z0-9_-]{11})/i);
  return match ? match[1] : null;
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    muted?: boolean;
    controls?: boolean;
    loop?: boolean;
    fullscreen?: boolean;
    disableKeyboard?: boolean;
    host?: YouTubeEmbedHost;
    origin?: string;
    widgetReferrer?: string;
  } = {},
) {
  const params = new URLSearchParams({
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    modestbranding: '1',
    iv_load_policy: '3',
    autoplay: options.autoplay === false ? '0' : '1',
    mute: options.muted === false ? '0' : '1',
    controls: options.controls === false ? '0' : '1',
    fs: options.fullscreen === false ? '0' : '1',
    disablekb: options.disableKeyboard === false ? '0' : '1',
  });

  if (options.origin) {
    params.set('origin', options.origin);
  }

  if (options.widgetReferrer) {
    params.set('widget_referrer', options.widgetReferrer);
  }

  if (options.loop !== false) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }

  const embedHost =
    options.host === 'youtube'
      ? 'https://www.youtube.com'
      : 'https://www.youtube-nocookie.com';

  return `${embedHost}/embed/${videoId}?${params.toString()}`;
}
