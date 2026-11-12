export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export function supportedMediaType(type: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(type);
}

export function safeWebpFilename(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 70) + '.webp';
}

/**
 * Converts test images to WebP in the user's browser, resizing to max 1600 px.
 * PDFs are not modified. The backend independently validates file signatures.
 */
export async function prepareMedia(file: File): Promise<File> {
  if (!supportedMediaType(file.type)) {
    throw new Error('Solo se permiten imagenes PNG/JPEG/WebP o documentos PDF.');
  }
  if (!file.size || file.size > MAX_SOURCE_BYTES) {
    throw new Error('El archivo original debe tener entre 1 byte y 15 MB.');
  }
  if (file.type === 'application/pdf') {
    if (file.size > MAX_MEDIA_BYTES) throw new Error('El PDF no debe superar 5 MB.');
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Tu navegador no permite procesar imagenes Canvas.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/webp', 0.8)
    );
    if (!blob || blob.type !== 'image/webp') {
      throw new Error('No fue posible generar el formato WebP.');
    }
    if (!blob.size || blob.size > MAX_MEDIA_BYTES) {
      throw new Error('La imagen procesada supera 5 MB.');
    }
    return new File([blob], safeWebpFilename(file.name), { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}
