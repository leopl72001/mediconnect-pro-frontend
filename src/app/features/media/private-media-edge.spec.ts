import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { MediaApiService, type MediaView } from '../../core/media-api.service';
import { PendingMediaQueue, type PendingMedia } from '../../core/pending-media-queue';
import { PrivateMediaPage } from './private-media';

describe('PrivateMediaPage — errores y límites de privacidad', () => {
  const email = signal<{ email: string } | null>({ email: 'one@example.test' });
  const pending: PendingMedia = {
    id: 'id1', owner: 'one@example.test', filename: 'demo.pdf',
    contentType: 'application/pdf', size: 4,
    createdAt: '2026-11-12T10:00:00Z', data: new Blob(['demo'])
  };
  const file: MediaView = {
    id: 'server-id', filename: 'demo.pdf', contentType: 'application/pdf',
    size: 4, uploadedAt: '2026-11-12T10:00:00Z'
  };
  let fixture: ComponentFixture<PrivateMediaPage>;
  let page: PrivateMediaPage;
  let api: { mine: ReturnType<typeof vi.fn>; upload: ReturnType<typeof vi.fn>; download: ReturnType<typeof vi.fn> };
  let queue: { add: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    email.set({ email: 'one@example.test' });
    api = { mine: vi.fn(() => of([])), upload: vi.fn(() => of({})),
      download: vi.fn(() => of(new Blob(['test']))) };
    queue = { add: vi.fn(async () => undefined), list: vi.fn(async () => []),
      remove: vi.fn(async () => undefined) };
    await TestBed.configureTestingModule({
      imports: [PrivateMediaPage],
      providers: [
        { provide: AuthService, useValue: { user: email } },
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
    vi.unstubAllGlobals();
  });

  function select(f: File | null): Promise<void> {
    const input = { value: 'file-selected', files: { item: () => f } } as unknown as HTMLInputElement;
    return page.onChoose({ target: input } as unknown as Event);
  }

  it('no procesa selección vacía o mientras hay otra operación', async () => {
    await select(null);
    page.processing.set(true);
    await select(new File(['test'], 'demo.pdf', { type: 'application/pdf' }));
    page.processing.set(false);
    page.syncing.set(true);
    await select(new File(['test'], 'demo.pdf', { type: 'application/pdf' }));
    expect(api.upload).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rechaza extensión y tipo no permitido antes de subirlo', async () => {
    await select(new File(['demo'], 'script.html', { type: 'text/html' }));
    expect(page.error()).toContain('Solo se permiten');
    expect(page.processing()).toBe(false);
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('encola un PDF ficticio cuando la solicitud falla por desconexión de red', async () => {
    api.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await select(new File(['demo'], 'archivo.pdf', { type: 'application/pdf' }));
    expect(queue.add).toHaveBeenCalledOnce();
    expect(page.message()).toContain('cola local');
    expect(page.processing()).toBe(false);
  });

  it('rechaza guardar archivos cuando falla el almacenamiento local', async () => {
    page.online.set(false);
    queue.add.mockRejectedValue(new Error('QuotaExceededError'));
    await select(new File(['demo'], 'archivo.pdf', { type: 'application/pdf' }));
    expect(page.error()).toContain('QuotaExceededError');
    expect(page.processing()).toBe(false);
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('identifica permisos 403 y errores inesperados al subir', async () => {
    api.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    await select(new File(['demo'], 'archivo.pdf', { type: 'application/pdf' }));
    expect(page.error()).toContain('permisos');
    api.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await select(new File(['demo'], 'archivo.pdf', { type: 'application/pdf' }));
    expect(page.error()).toContain('Docker');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('detiene la sincronización cuando cambia la sesión de propietario', async () => {
    queue.list.mockImplementation(async () => {
      email.set({ email: 'two@example.test' });
      return [pending];
    });
    await page.synchronize();
    expect(api.upload).not.toHaveBeenCalled();
    expect(queue.remove).not.toHaveBeenCalled();
    expect(page.syncing()).toBe(false);
  });

  it('no repite sincronización mientras ya está en curso', async () => {
    page.syncing.set(true);
    await page.synchronize();
    expect(queue.list).not.toHaveBeenCalled();
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('conserva archivo sin borrar cuando sincronización falla por red', async () => {
    queue.list.mockResolvedValue([pending]);
    api.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await page.synchronize();
    expect(queue.remove).not.toHaveBeenCalled();
    expect(page.syncing()).toBe(false);
  });

  it('muestra error de cola si IndexedDB falla al consultar los archivos pendientes', async () => {
    queue.list.mockRejectedValue(new Error('indexedDB error'));
    await page.synchronize();
    expect(page.error()).toContain('sincronizar');
    expect(page.syncing()).toBe(false);
  });

  it('no descarta archivo y comunica error cuando falla la eliminación local', async () => {
    page.pending.set([pending]);
    queue.remove.mockRejectedValue(new Error('error'));
    await page.discard(pending.id);
    expect(page.error()).toContain('descartar');
  });

  it('no permite que una segunda sesión descarte archivos del usuario anterior', async () => {
    page.pending.set([pending]);
    email.set({ email: 'two@example.test' });
    await page.discard(pending.id);
    expect(queue.remove).not.toHaveBeenCalled();
  });

  it('reporta error de descarga privada sin exponer archivos', () => {
    api.download.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    page.download(file);
    expect(api.download).toHaveBeenCalledWith('server-id');
    expect(page.error()).toContain('sesión');
  });

  it('descarga creando una URL local y libera el enlace después', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:demo');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.useFakeTimers();
    try {
      page.download(file);
      expect(api.download).toHaveBeenCalledWith('server-id');
      expect(create).toHaveBeenCalledOnce();
      expect(click).toHaveBeenCalledOnce();
      vi.advanceTimersByTime(1501);
      expect(revoke).toHaveBeenCalledWith('blob:demo');
    } finally {
      vi.useRealTimers();
    }
  });

  it('refleja eventos del navegador y elimina sus listeners al destruirse', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    page.ngOnInit();
    expect(add).toHaveBeenCalledWith('offline', expect.any(Function));
    window.dispatchEvent(new Event('offline'));
    expect(page.online()).toBe(false);
    window.dispatchEvent(new Event('online'));
    expect(page.online()).toBe(true);
    page.ngOnDestroy();
    expect(remove).toHaveBeenCalledWith('online', expect.any(Function));
  });
});
