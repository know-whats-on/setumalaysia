import { getYouTubeVideoId } from './youtube';

export { getYouTubeVideoId };

const SETU_YOUTUBE_TOKEN_PREFIX = 'SETU_YOUTUBE::';

export function normalizeSetuMarkdownContent(input: string) {
  return String(input || '').replace(
    /^\s{0,3}(?:#{1,6}\s*)?\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/gm,
    (fullMatch, rawTitle: string, rawUrl: string) => {
      const videoId = getYouTubeVideoId(rawUrl);
      if (!videoId) return fullMatch;
      return `${SETU_YOUTUBE_TOKEN_PREFIX}${videoId}::${encodeURIComponent(rawTitle)}`;
    },
  );
}

export function parseSetuYouTubeToken(value: string) {
  const match = String(value || '')
    .trim()
    .match(/^SETU_YOUTUBE::([A-Za-z0-9_-]{11})::(.+)$/);

  if (!match) return null;

  return {
    videoId: match[1],
    title: decodeURIComponent(match[2]),
  };
}

export function slugifySetuValue(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stripMarkdownForPdf(input: string): string {
  return String(input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/>\s*/g, '')
    .replace(/^[-*+]\s*\[\s*\]\s*/gm, '- ')
    .replace(/^[-*+]\s*\[x\]\s*/gim, '[x] ')
    .replace(/^[-*+]\s+/gm, '- ')
    .replace(/^(\d+)\.\s+/gm, '$1. ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
