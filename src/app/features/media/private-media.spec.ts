import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { MediaApiService } from '../../core/media-api.service';
import { PendingMediaQueue } from '../../core/pending-media-queue';
import { PrivateMediaPage } from './private-media';

describe('Mis archivos privados — flujo local seguro', () => {
  const owner = 'patient@example.test';
  const user = signal<{ email: string; role: 'ROLE_PATIENT' } | null>({
    email: owner, role: 'ROLE_PATIENT'
  });
  const item = {
    id: 'demo-1', owner, filename: 'prueba.pdf', contentType: 'application/pdf',
    size: 12, createdAt: '2026-11-12T12:00:00Z',
    data: new Blob(['solo-prueba'], { type: 'application/pdf' })
  };
  let api: {
    mine: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
  };
  let queue: {
    list: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let fixture: ComponentFixture<PrivateMediaPage>;
  let page: PrivateMediaPage;

  beforeEach(async () => {
    user.set({ email: owner, role: 'ROLE_PATIENT' });
    api = {
      mine: vi.fn(() => of([])),
      upload: vi.fn(() => of({})),
      download: vi.fn(() => of(new Blob(['demo'])))
    };
    queue = {
      list: vi.fn(async () => []),
      add: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined)
    };
    await TestBed.configureTestingModule({
      imports: [PrivateMediaPage],
      providers: [
        { provide: AuthService, useValue: { user } },
        { provide: MediaApiService, useValue: api },
        { provide: PendingMediaQueue, useValue: queue }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(PrivateMediaPage);
    page = fixture.componentInstance;
    page.online.set(true);
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('formatea tamaños de archivos de prueba', () => {
    expect(page.prettySize(1)).toBe('1 KB');
    expect(page.prettySize(2048)).toBe('2 KB');
    expect(page.prettySize(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  it('carga archivos de la cuenta y termina el estado de carga', () => {
    const files = [{
      id: 'file-1', filename: 'prueba.pdf', contentType: 'application/pdf',
      size: 10, uploadedAt: '2026-11-12T12:00:00Z'
    }];
    api.mine.mockReturnValue(of(files));
    page.refresh();
    expect(page.files()).toEqual(files);
    expect(page.loading()).toBe(false);
    expect(api.mine).toHaveBeenCalledOnce();
  });

  it('no consulta los archivos si no hay sesión o no existe conexión', () => {
    user.set(null);
    page.refresh();
    expect(api.mine).not.toHaveBeenCalled();
    user.set({ email: owner, role: 'ROLE_PATIENT' });
    page.online.set(false);
    page.refresh();
    expect(api.mine).not.toHaveBeenCalled();
  });

  it('distingue error de sesión expirada de fallo del servidor', () => {
    api.mine.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    page.refresh();
    expect(page.error()).toContain('sesión venció');
    api.mine.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    page.refresh();
    expect(page.error()).toContain('MongoDB');
  });

  it('sincroniza archivos pendientes y los elimina solo después de subirlos', async () => {
    queue.list.mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
    page.pending.set([item]);
    await page.synchronize();
    expect(api.upload).toHaveBeenCalledOnce();
    expect(queue.remove).toHaveBeenCalledWith(item.id);
    expect(page.message()).toContain('1 archivo(s) sincronizado(s)');
    expect(page.syncing()).toBe(false);
    expect(page.pending()).toEqual([]);
  });

  it('conserva un archivo pendiente cuando la subida falla', async () => {
    queue.list.mockResolvedValue([item]);
    api.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 413 })));
    await page.synchronize();
    expect(queue.remove).not.toHaveBeenCalled();
    expect(page.error()).toContain('5 MB');
    expect(page.syncing()).toBe(false);
  });

  it('no envía la cola si la conexión está caída o la sesión está cerrada', async () => {
    page.online.set(false);
    await page.synchronize();
    expect(queue.list).not.toHaveBeenCalled();
    page.online.set(true);
    user.set(null);
    await page.synchronize();
    expect(queue.list).not.toHaveBeenCalled();
  });

  it('descarta únicamente archivos pendientes pertenecientes a la sesión', async () => {
    page.pending.set([item]);
    await page.discard('otro-id');
    expect(queue.remove).not.toHaveBeenCalled();
    await page.discard(item.id);
    expect(queue.remove).toHaveBeenCalledWith(item.id);
    expect(page.message()).toContain('descartado');
  });

  it('rechaza descartar un archivo atribuido a otro usuario', async () => {
    page.pending.set([{ ...item, owner: 'other@example.test' }]);
    await page.discard(item.id);
    expect(queue.remove).not.toHaveBeenCalled();
  });

  it('sube un PDF ficticio sin necesidad de Canvas', async () => {
    const file = new File(['solo demo'], 'prueba.pdf', { type: 'application/pdf' });
    const input = { files: { item: () => file }, value: 'test' } as unknown as HTMLInputElement;
    await page.onChoose({ target: input } as unknown as Event);
    expect(api.upload).toHaveBeenCalledOnce();
    expect(page.processing()).toBe(false);
    expect(page.message()).toContain('almacenado en MongoDB');
    expect(input.value).toBe('');
  });

  it('guarda en la cola un PDF de prueba si el navegador está offline', async () => {
    page.online.set(false);
    const file = new File(['solo demo'], 'prueba.pdf', { type: 'application/pdf' });
    const input = { files: { item: () => file }, value: '' } as unknown as HTMLInputElement;
    await page.onChoose({ target: input } as unknown as Event);
    expect(api.upload).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(owner, file);
    expect(page.message()).toContain('cola local');
  });

  it('no encola errores de servidor como si fueran desconexión', async () => {
    api.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const file = new File(['solo demo'], 'prueba.pdf', { type: 'application/pdf' });
    const input = { files: { item: () => file }, value: '' } as unknown as HTMLInputElement;
    await page.onChoose({ target: input } as unknown as Event);
    expect(page.error()).toContain('formato o tamaño');
    expect(queue.add).not.toHaveBeenCalled();
  });
});
