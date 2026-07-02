import { isNativeShell } from './platform';

interface DownloadAppFileOptions {
  blob: Blob;
  fileName: string;
  title: string;
  directoryName?: string;
}

function sanitizeFileName(name: string) {
  return String(name || 'download')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function shareFileFromNativeShell(blob: Blob, fileName: string, title: string, directoryName: string) {
  const [{ Directory, Filesystem }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  const result = await Filesystem.writeFile({
    path: `${directoryName}/${Date.now()}-${fileName}`,
    data: arrayBufferToBase64(await blob.arrayBuffer()),
    directory: Directory.Cache,
    recursive: true,
  });

  try {
    await Share.share({
      title,
      files: [result.uri],
      dialogTitle: title,
    });
  } catch (error) {
    console.warn('GHAR native file attachment share failed, retrying with URL fallback:', error);
    await Share.share({
      title,
      text: title,
      url: result.uri,
      dialogTitle: title,
    });
  }
}

function downloadFileInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

export async function downloadAppFile({
  blob,
  fileName,
  title,
  directoryName = 'exports',
}: DownloadAppFileOptions) {
  const safeFileName = sanitizeFileName(fileName) || 'download';

  if (isNativeShell()) {
    try {
      await shareFileFromNativeShell(blob, safeFileName, title, directoryName);
      return;
    } catch (error) {
      console.error('GHAR native file export failed:', error);
    }
  }

  downloadFileInBrowser(blob, safeFileName);
}
