import { isNativeShell } from './platform';

interface DownloadSetuPdfOptions {
  blob: Blob;
  fileName: string;
  title: string;
}

function sanitizeFileName(name: string) {
  return String(name || 'setu-guide.pdf')
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

async function sharePdfFromNativeShell(blob: Blob, fileName: string, title: string) {
  const [{ Directory, Filesystem }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  const result = await Filesystem.writeFile({
    path: `setu/${Date.now()}-${fileName}`,
    data: arrayBufferToBase64(await blob.arrayBuffer()),
    directory: Directory.Cache,
    recursive: true,
  });

  await Share.share({
    title,
    text: title,
    url: result.uri,
    dialogTitle: title,
  });
}

function downloadPdfInBrowser(blob: Blob, fileName: string) {
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

export async function downloadSetuPdf({ blob, fileName, title }: DownloadSetuPdfOptions) {
  const safeFileName = sanitizeFileName(fileName) || 'setu-guide.pdf';

  if (isNativeShell()) {
    try {
      await sharePdfFromNativeShell(blob, safeFileName, title);
      return;
    } catch (error) {
      console.error('GHAR SETU native PDF export failed:', error);
    }
  }

  downloadPdfInBrowser(blob, safeFileName);
}
