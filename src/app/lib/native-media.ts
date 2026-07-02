import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { isNativeShell } from './platform';

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function captureEvidencePhoto(): Promise<File | null> {
  if (!isNativeShell()) return null;

  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
  });

  if (!photo.webPath) {
    return null;
  }

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const extension = photo.format ? `.${photo.format}` : '.jpeg';
  const fileName = sanitizeFileName(`ghar-evidence-${Date.now()}${extension}`);
  const type = blob.type || `image/${photo.format || 'jpeg'}`;

  return new File([blob], fileName, {
    type,
    lastModified: Date.now(),
  });
}
