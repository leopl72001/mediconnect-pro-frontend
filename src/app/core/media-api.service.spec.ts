import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MediaApiService } from './media-api.service';
import { MAX_MEDIA_BYTES, prepareMedia, safeWebpFilename, supportedMediaType } from './media-processing';

describe('MediaApiService', () => {
  let service: MediaApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MediaApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta solo archivos de la cuenta autenticada', () => {
    service.mine().subscribe();
    const req = http.expectOne('/api/v1/media/me');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('envía el archivo como FormData sin gestionar JWT por URL', () => {
    const file = new File(['dato-ficticio'], 'prueba.pdf', {type: 'application/pdf'});
    service.upload(file).subscribe();
    const req = http.expectOne('/api/v1/media/me');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect(req.request.body.get('file')).toBeInstanceOf(File);
    req.flush({ id: 'abc', filename: file.name, contentType: file.type,
      size: file.size, uploadedAt: '2026-11-12T12:00:00Z' });
  });

  it('descarga el archivo privado como blob', () => {
    service.download('abc').subscribe();
    const req = http.expectOne('/api/v1/media/me/abc');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['prueba'], {type:'application/pdf'}));
  });
});

describe('procesamiento local', () => {
  it('admite únicamente formatos permitidos', () => {
    expect(supportedMediaType('image/png')).toBe(true);
    expect(supportedMediaType('application/pdf')).toBe(true);
    expect(supportedMediaType('text/html')).toBe(false);
  });

  it('renombra a WebP y limpia rutas peligrosas', () => {
    expect(safeWebpFilename('../documento.jpg')).toBe('.._documento.webp');
  });

  it('rechaza PDF que supera 5 MB sin usar Canvas', async () => {
    const file = new File([new Uint8Array(MAX_MEDIA_BYTES + 1)], 'grande.pdf', {type:'application/pdf'});
    await expect(prepareMedia(file)).rejects.toThrow('5 MB');
  });

  it('rechaza HTML fingiendo ser un archivo aceptado', async () => {
    const file = new File(['<script/>'], 'bad.html', {type:'text/html'});
    await expect(prepareMedia(file)).rejects.toThrow('Solo se permiten');
  });
});
