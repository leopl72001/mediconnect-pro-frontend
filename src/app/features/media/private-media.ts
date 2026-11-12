import { Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth.service';
import { MediaApiService, type MediaView } from '../../core/media-api.service';
import { MAX_MEDIA_BYTES, prepareMedia } from '../../core/media-processing';
import { PendingMediaQueue, type PendingMedia } from '../../core/pending-media-queue';

@Component({
  selector: 'app-private-media',
  templateUrl: './private-media.html'
})
export class PrivateMediaPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly api = inject(MediaApiService);
  private readonly queue = inject(PendingMediaQueue);
  private readonly destroyRef = inject(DestroyRef);
  readonly online = signal(navigator.onLine);
  readonly processing = signal(false);
  readonly syncing = signal(false);
  readonly loading = signal(false);
  readonly files = signal<MediaView[]>([]);
  readonly pending = signal<PendingMedia[]>([]);
  readonly message = signal('');
  readonly error = signal('');
  readonly maxBytes = MAX_MEDIA_BYTES;

  private readonly onOnline = () => {
    this.online.set(true);
    void this.synchronize();
  };
  private readonly onOffline = () => this.online.set(false);

  ngOnInit(): void {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    void this.loadPending();
    this.refresh();
    if (navigator.onLine) void this.synchronize();
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }

  private owner(): string {
    return this.auth.user()?.email ?? '';
  }

  private async loadPending(): Promise<void> {
    const owner = this.owner();
    if (!owner) return;
    try {
      const items = await this.queue.list(owner);
      if (owner === this.owner()) this.pending.set(items);
    } catch {
      this.error.set('No pudimos abrir la cola local. Comprueba los permisos del navegador.');
    }
  }

  refresh(): void {
    if (!this.online() || !this.owner()) return;
    this.loading.set(true);
    this.api.mine().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: data => this.files.set(data),
      error: err => this.error.set(err.status === 401
        ? 'Tu sesión venció; vuelve a iniciar sesión para ver los archivos.'
        : 'No se pudo consultar MongoDB. Comprueba el backend.')
    });
  }

  async onChoose(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const chosen = input.files?.item(0);
    input.value = '';
    if (!chosen || this.processing() || this.syncing()) return;
    this.error.set('');
    this.message.set('');
    this.processing.set(true);
    try {
      // Canvas conversion happens before storing in IndexedDB or sending over HTTP.
      const file = await prepareMedia(chosen);
      if (!this.online()) {
        await this.enqueue(file);
      } else {
        try {
          await firstValueFrom(this.api.upload(file));
          this.message.set('Archivo de prueba almacenado en MongoDB con acceso privado.');
          this.refresh();
        } catch (error) {
          if (error instanceof HttpErrorResponse && error.status === 0) {
            this.online.set(false);
            await this.enqueue(file);
          } else {
            this.error.set(this.uploadError(error));
          }
        }
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No fue posible procesar el archivo.');
    } finally {
      this.processing.set(false);
    }
  }

  private async enqueue(file: File): Promise<void> {
    await this.queue.add(this.owner(), file);
    await this.loadPending();
    this.message.set('Sin conexión: archivo de prueba guardado en la cola local. Se enviará cuando regreses a internet con sesión iniciada.');
  }

  async synchronize(): Promise<void> {
    const owner = this.owner();
    if (!this.online() || !owner || this.syncing()) return;
    this.syncing.set(true);
    this.error.set('');
    let success = 0;
    try {
      const entries = await this.queue.list(owner);
      for (const item of entries) {
        if (!this.online() || this.owner() !== owner) break;
        const file = new File([item.data], item.filename, { type: item.contentType });
        try {
          await firstValueFrom(this.api.upload(file));
          await this.queue.remove(item.id);
          success += 1;
        } catch (error) {
          if (error instanceof HttpErrorResponse && error.status === 0) {
            this.online.set(false);
          } else {
            this.error.set(this.uploadError(error) + ' Revisa el archivo pendiente.');
          }
          break; // Never delete the failed item. Preserve ordering.
        }
      }
      await this.loadPending();
      if (success) {
        this.message.set(`${success} archivo(s) sincronizado(s) con MongoDB.`);
        this.refresh();
      }
    } catch {
      this.error.set('No se pudo sincronizar la cola local. Intenta nuevamente.');
    } finally {
      this.syncing.set(false);
    }
  }

  async discard(id: string): Promise<void> {
    try {
      const belongsToMe = this.pending().some(item => item.id === id && item.owner === this.owner().toLowerCase());
      if (!belongsToMe) return;
      await this.queue.remove(id);
      await this.loadPending();
      this.message.set('Archivo pendiente descartado únicamente de este navegador.');
    } catch {
      this.error.set('No se pudo descartar el elemento pendiente.');
    }
  }

  download(file: MediaView): void {
    this.error.set('');
    this.api.download(file.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      },
      error: () => this.error.set('No fue posible descargar el archivo. Verifica tu sesión.')
    });
  }

  prettySize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private uploadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 413) return 'El servidor rechaza archivos mayores de 5 MB.';
      if (error.status === 400) return 'El servidor rechazó el formato o tamaño del archivo.';
      if (error.status === 401 || error.status === 403) return 'No tienes permisos o tu sesión venció.';
    }
    return 'No se pudo subir el archivo. Revisa Docker y vuelve a intentarlo.';
  }
}
