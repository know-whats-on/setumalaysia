const WIKIMEDIA_COMMONS_HOST = 'commons.wikimedia.org';
const WIKIMEDIA_UPLOAD_HOST = 'upload.wikimedia.org';

function normalizeWikimediaWidth(width: number) {
  const rounded = Math.round(width);
  if (!Number.isFinite(rounded) || rounded <= 0) return 1200;
  return Math.max(320, Math.min(rounded, 2400));
}

function isWikimediaRedirectPath(parsed: URL) {
  if (parsed.hostname !== WIKIMEDIA_COMMONS_HOST) return false;

  if (parsed.pathname.startsWith('/wiki/Special:FilePath/')) return true;
  if (parsed.pathname.startsWith('/wiki/Special:Redirect/file/')) return true;

  const title = parsed.searchParams.get('title') || '';
  return title.startsWith('Special:Redirect/file/');
}

function buildWikimediaUploadThumbUrl(parsed: URL, width: number) {
  if (parsed.hostname !== WIKIMEDIA_UPLOAD_HOST) return null;
  if (!parsed.pathname.startsWith('/wikipedia/commons/')) return null;
  if (parsed.pathname.startsWith('/wikipedia/commons/thumb/')) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);
  const commonsIndex = segments.indexOf('commons');
  if (commonsIndex < 0) return null;

  const hashFirst = segments[commonsIndex + 1] || '';
  const hashSecond = segments[commonsIndex + 2] || '';
  const fileName = segments.slice(commonsIndex + 3).join('/');
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (!hashFirst || !hashSecond || !fileName) return null;
  if (['svg', 'pdf', 'djvu'].includes(extension)) return null;

  parsed.pathname =
    `/wikipedia/commons/thumb/${hashFirst}/${hashSecond}/${fileName}/${normalizeWikimediaWidth(width)}px-${fileName}`;
  parsed.search = '';
  return parsed.toString();
}

export function optimizeCityGuideImageUrl(url: unknown, width: number) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    if (isWikimediaRedirectPath(parsed)) {
      parsed.searchParams.set('width', String(normalizeWikimediaWidth(width)));
    }

    const wikimediaThumbUrl = buildWikimediaUploadThumbUrl(parsed, width);
    if (wikimediaThumbUrl) {
      return wikimediaThumbUrl;
    }

    return parsed.toString();
  } catch {
    return raw;
  }
}

export function optimizeCityGuideCoverImageUrl(url: unknown) {
  return optimizeCityGuideImageUrl(url, 1400);
}

export function optimizeCityGuidePlaceImageUrl(url: unknown) {
  return optimizeCityGuideImageUrl(url, 1200);
}
