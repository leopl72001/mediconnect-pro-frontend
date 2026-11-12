import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingMediaQueue } from './pending-media-queue';

describe('PendingMediaQueue — IndexedDB demo isolation', () => {
  const data = new Map<string, unknown>();
  const close = vi.fn();
  let queue: PendingMediaQueue;

  beforeEach(() => {
    data.clear();
    close.mockClear();
    const database = {
      close,
      objectStoreNames: { contains: vi.fn(() => false) },
      createObjectStore: vi.fn(),
      transaction: vi.fn(() => {
        const tx: {
          objectStore: (name: string) => unknown;
          oncomplete?: () => void;
          onerror?: () => void;
          onabort?: () => void;
        } = {
          objectStore: () => ({
            put(item: { id: string }) {
              data.set(item.id, item);
              queueMicrotask(() => tx.oncomplete?.());
            },
            delete(id: string) {
              data.delete(id);
              queueMicrotask(() => tx.oncomplete?.());
            },
            getAll() {
              const req: { result: unknown[]; onsuccess?: () => void; onerror?: () => void } = {
                result: [...data.values()]
              };
              queueMicrotask(() => req.onsuccess?.());
              return req;
            }
          })
        };
        return tx;
      })
    };
    vi.stubGlobal('indexedDB', {
      open: vi.fn(() => {
        const req: {
          result: typeof database;
          onupgradeneeded?: () => void;
          onsuccess?: () => void;
          onerror?: () => void;
          error: null;
        } = { result: database, error: null };
        queueMicrotask(() => {
          req.onupgradeneeded?.();
          req.onsuccess?.();
        });
        return req;
      })
    });
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'test-uuid-0001') });
    queue = TestBed.inject(PendingMediaQueue);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('guarda un PDF ficticio y normaliza el propietario', async () => {
    const file = new File(['archivo prueba'], 'ejemplo.pdf', { type: 'application/pdf' });
    await queue.add('PATIENT@Example.Test', file);
    const items = await queue.list('patient@example.test');
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('test-uuid-0001');
    expect(items[0].owner).toBe('patient@example.test');
    expect(items[0].filename).toBe('ejemplo.pdf');
    expect(items[0].contentType).toBe('application/pdf');
    expect(items[0].size).toBe(file.size);
    expect(items[0].createdAt).toBeTruthy();
    expect(close).toHaveBeenCalled();
  });

  it('no devuelve archivos de otros propietarios al listar', async () => {
    const file = new File(['ficticio'], 'prueba.pdf', { type: 'application/pdf' });
    await queue.add('patient@example.test', file);
    expect(await queue.list('other@example.test')).toEqual([]);
    expect(await queue.list('PATIENT@EXAMPLE.TEST')).toHaveLength(1);
  });

  it('elimina un archivo pendiente al confirmar que ya fue subido', async () => {
    const file = new File(['ficticio'], 'prueba.pdf', { type: 'application/pdf' });
    await queue.add('patient@example.test', file);
    expect(await queue.list('patient@example.test')).toHaveLength(1);
    await queue.remove('test-uuid-0001');
    expect(await queue.list('patient@example.test')).toEqual([]);
  });

  it('eliminar un identificador inexistente no afecta otros archivos', async () => {
    const file = new File(['ficticio'], 'prueba.pdf', { type: 'application/pdf' });
    await queue.add('patient@example.test', file);
    await queue.remove('missing-id');
    expect(await queue.list('patient@example.test')).toHaveLength(1);
  });

  it('rechaza correctamente si IndexedDB no está disponible', async () => {
    vi.stubGlobal('indexedDB', undefined);
    // The browser property exists but fails on first access when unavailable.
    const p = queue.list('patient@example.test');
    await expect(p).rejects.toThrow();
  });
});
