import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_MEDIA_BYTES, MAX_SOURCE_BYTES, prepareMedia, safeWebpFilename, supportedMediaType } from './media-processing';

describe('preparación de imágenes ficticias', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('acepta solo los cuatro tipos admitidos y los nombres quedan saneados', () => {
    for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) {
      expect(supportedMediaType(mime)).toBe(true);
    }
    for (const mime of ['', 'image/svg+xml', 'text/html', 'application/x-msdownload']) {
      expect(supportedMediaType(mime)).toBe(false);
    }
    expect(safeWebpFilename('documento de prueba.png')).toBe('documento_de_prueba.webp');
    expect(safeWebpFilename('a'.repeat(80) + '.jpg')).toHaveLength(75);
  });

  it('rechaza imágenes vacías o mayores que el máximo de origen antes de decodificarlas', async () => {
    const decode = vi.fn();
    vi.stubGlobal('createImageBitmap', decode);
    await expect(prepareMedia(new File([], 'vacia.png', { type: 'image/png' }))).rejects.toThrow('15 MB');
    await expect(prepareMedia(new File([new Uint8Array(MAX_SOURCE_BYTES + 1)], 'grande.png', { type: 'image/png' })))
      .rejects.toThrow('15 MB');
    expect(decode).not.toHaveBeenCalled();
  });

  it('mantiene intacto un PDF ficticio permitido', async () => {
    const input = new File(['documento ficticio'], 'prueba.pdf', { type: 'application/pdf' });
    expect(await prepareMedia(input)).toBe(input);
  });

  function mockCanvas(width: number, height: number, output: Blob | null, hasContext = true) {
    const close = vi.fn();
    const drawImage = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width, height, close }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue((hasContext ? { drawImage } : null) as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation(callback => callback(output));
    return { close, drawImage };
  }

  it('convierte JPG a WebP y limita el lado mayor a 1600 píxeles', async () => {
    const blob = new Blob(['imagen-ficticia'], { type: 'image/webp' });
    const canvas = mockCanvas(3200, 1600, blob);
    const result = await prepareMedia(new File(['entrada'], 'Foto peligrosa.jpg', { type: 'image/jpeg' }));
    expect(result.type).toBe('image/webp');
    expect(result.name).toBe('Foto_peligrosa.webp');
    expect(canvas.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 800);
    expect(canvas.close).toHaveBeenCalledOnce();
  });

  it('cierra siempre el bitmap si Canvas no está disponible', async () => {
    const canvas = mockCanvas(100, 100, null, false);
    await expect(prepareMedia(new File(['a'], 'prueba.png', { type: 'image/png' })))
      .rejects.toThrow('Canvas');
    expect(canvas.close).toHaveBeenCalledOnce();
  });

  it('rechaza respuesta nula o de tipo equivocado al convertir a WebP', async () => {
    const canvas = mockCanvas(100, 100, new Blob(['wrong'], { type: 'image/jpeg' }));
    await expect(prepareMedia(new File(['a'], 'prueba.png', { type: 'image/png' })))
      .rejects.toThrow('formato WebP');
    expect(canvas.close).toHaveBeenCalledOnce();
  });

  it('rechaza imágenes WebP procesadas con más de cinco megabytes', async () => {
    const canvas = mockCanvas(100, 100,
      new Blob([new Uint8Array(MAX_MEDIA_BYTES + 1)], { type: 'image/webp' }));
    await expect(prepareMedia(new File(['a'], 'prueba.png', { type: 'image/png' })))
      .rejects.toThrow('5 MB');
    expect(canvas.close).toHaveBeenCalledOnce();
  });
});
