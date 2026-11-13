import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { MediaApiService } from '../../core/media-api.service';
import { PendingMediaQueue, type PendingMedia } from '../../core/pending-media-queue';
import { PrivateMediaPage } from './private-media';

describe('PrivateMediaPage — renderizado de archivos privados y cola offline', () => {
  const owner = signal({ email: 'patient@example.test' });
  const pending: PendingMedia = {
    id: 'queue-1', owner: 'patient@example.test', filename: 'pendiente-demo.pdf',
    contentType: 'application/pdf', size: 1024,
    createdAt: '2026-11-12T10:00:00Z', data: new Blob(['demo'])
  };
  const files = [
    { id: 'file-1', filename: 'archivo-demo.pdf', contentType: 'application/pdf', size: 1024,
      uploadedAt: '2026-11-12T11:00:00Z' },
    { id: 'file-2', filename: 'foto-demo.webp', contentType: 'image/webp', size: 2048,
      uploadedAt: '2026-11-12T12:00:00Z' }
  ];
  let fixture: ComponentFixture<PrivateMediaPage>;
  let page: PrivateMediaPage;
  let api: {
    mine: ReturnType<typeof vi.fn>; upload: ReturnType<typeof vi.fn>;
    download: ReturnType<typeof vi.fn>;
  };
  let queue: {
    list: ReturnType<typeof vi.fn>; add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      mine: vi.fn(() => of([])), upload: vi.fn(() => of({})),
      download: vi.fn(() => of(new Blob(['demo'])))
    };
    queue = {
      list: vi.fn(async () => []), add: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined)
    };
    await TestBed.configureTestingModule({
      imports: [PrivateMediaPage],
      providers: [
        { provide: AuthService, useValue: { user: owner } },
        { provide: MediaApiService, useValue: api },
        { provide: PendingMediaQueue, useValue: queue }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(PrivateMediaPage);
    page = fixture.componentInstance;
    page.online.set(false);
    fixture.detectChanges();
  });

  function root(): HTMLElement {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra advertencia de seguridad y estado offline sin archivos', () => {
    const html = root();
    expect(html.textContent).toContain('Mis archivos privados');
    expect(html.textContent).toContain('Sin conexión: cola offline');
    expect(html.textContent).toContain('sin cifrado');
    expect(html.textContent).toContain('No hay archivos pendientes');
    expect(html.textContent).toContain('Todavía no tienes archivos');
  });

  it('muestra el estado conectado sin simular sincronización', () => {
    page.online.set(true);
    const html = root();
    expect(html.textContent).toContain('Con conexión');
    expect(html.textContent).toContain('0 pendiente(s)');
  });

  it('renderiza PDF e imagen WebP real con botón de descarga', () => {
    page.files.set(files);
    const html = root();
    expect(html.textContent).toContain('archivo-demo.pdf');
    expect(html.textContent).toContain('foto-demo.webp');
    expect(html.querySelectorAll('button')).toBeTruthy();
    expect([...html.querySelectorAll('button')].filter(b => b.textContent?.includes('Descargar'))).toHaveLength(2);
  });

  it('muestra cada archivo pendiente y deja descartar solo fuera de sincronización', () => {
    page.pending.set([pending]);
    const html = root();
    expect(html.textContent).toContain('pendiente-demo.pdf');
    expect(html.textContent).toContain('1 pendiente(s)');
    const discard = [...html.querySelectorAll('button')].find(b => b.textContent?.includes('Descartar')) as HTMLButtonElement;
    expect(discard.disabled).toBe(false);
    page.syncing.set(true);
    root();
    expect(discard.disabled).toBe(true);
    expect(html.textContent).toContain('Sincronizando');
  });

  it('bloquea botón sincronizar mientras no hay internet y lo habilita cuando vuelve', () => {
    page.pending.set([pending]);
    const html = root();
    const action = [...html.querySelectorAll('button')].find(b => b.textContent?.includes('Sincronizar ahora')) as HTMLButtonElement;
    expect(action.disabled).toBe(true);
    page.online.set(true);
    root();
    expect(action.disabled).toBe(false);
  });

  it('muestra la carga de archivos reales y deshabilita actualizar', () => {
    page.loading.set(true);
    page.online.set(true);
    const html = root();
    expect(html.textContent).toContain('Consultando archivos privados');
    const action = [...html.querySelectorAll('button')].find(b => b.textContent?.includes('Actualizar archivos')) as HTMLButtonElement;
    expect(action.disabled).toBe(true);
  });

  it('muestra errores y confirmaciones reales en mensajes accesibles', () => {
    page.error.set('Error ficticio de permisos');
    page.message.set('Copia ficticia guardada');
    const html = root();
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('Error ficticio');
    expect(html.textContent).toContain('Copia ficticia guardada');
  });

  it('deshabilita selector de archivo durante procesamiento y cambia etiqueta', () => {
    page.processing.set(true);
    const html = root();
    expect(html.textContent).toContain('Procesando imagen');
    expect((html.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBe(true);
  });

  it('renderiza estado de colección vacía luego de recuperar conexión', () => {
    page.files.set([]);
    page.pending.set([]);
    page.online.set(true);
    const html = root();
    expect(html.textContent).toContain('No hay archivos pendientes');
    expect(html.textContent).toContain('Todavía no tienes archivos en MongoDB');
  });
});
