import { Injectable } from '@angular/core';

export interface PendingMedia {
  id: string;
  owner: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  data: Blob;
}

/**
 * IndexedDB queue stores demo files only. Do not enqueue real clinical records:
 * browser storage is persistent and is not encrypted with a user-specific key.
 * Access is scoped in the application by the logged-in email, not by OS permissions.
 */
@Injectable({ providedIn: 'root' })
export class PendingMediaQueue {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('Este navegador no soporta IndexedDB.'));
        return;
      }
      const request = indexedDB.open('mediconnect-demo-media-v1', 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('pending')) {
          request.result.createObjectStore('pending', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(owner: string, file: File): Promise<void> {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('pending', 'readwrite');
        tx.objectStore('pending').put({
          id: crypto.randomUUID(),
          owner: owner.toLowerCase(),
          filename: file.name,
          contentType: file.type,
          size: file.size,
          data: file,
          createdAt: new Date().toISOString()
        } satisfies PendingMedia);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  async list(owner: string): Promise<PendingMedia[]> {
    const db = await this.open();
    try {
      const entries = await new Promise<PendingMedia[]>((resolve, reject) => {
        const request = db.transaction('pending', 'readonly').objectStore('pending').getAll();
        request.onsuccess = () => resolve(request.result as PendingMedia[]);
        request.onerror = () => reject(request.error);
      });
      return entries.filter(item => item.owner === owner.toLowerCase());
    } finally {
      db.close();
    }
  }

  async remove(id: string): Promise<void> {
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('pending', 'readwrite');
        tx.objectStore('pending').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }
}
