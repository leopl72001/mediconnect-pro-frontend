import { Injectable, signal } from '@angular/core';

export interface AppointmentRealtimeEvent {
  appointmentId: string;
  status: 'SCHEDULED' | 'CANCELLED';
  timestamp: string;
  sequence: number;
}

/**
 * JWT is sent in an Authorization header using fetch streaming.
 * Native EventSource does not support Authorization headers; we never put tokens in URLs.
 */
@Injectable({ providedIn: 'root' })
export class AppointmentNotifications {
  readonly connected = signal(false);
  readonly lastEvent = signal<AppointmentRealtimeEvent | null>(null);

  private token: string | null = null;
  private controller: AbortController | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private counter = 0;

  connect(token: string): void {
    if (this.token === token) return;
    this.disconnect();
    this.token = token;
    void this.listen(token);
  }

  disconnect(): void {
    this.token = null;
    this.controller?.abort();
    this.controller = null;
    if (this.retry !== null) clearTimeout(this.retry);
    this.retry = null;
    this.connected.set(false);
    this.lastEvent.set(null);
  }

  private async listen(token: string): Promise<void> {
    if (token !== this.token) return;
    const controller = new AbortController();
    this.controller = controller;
    try {
      const response = await fetch('/api/v1/notifications/stream', {
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store',
        signal: controller.signal
      });

      if (response.status === 401 || response.status === 403) {
        // Do not endlessly retry expired or forbidden credentials.
        this.token = null;
        return;
      }
      if (!response.ok || !response.body) throw new Error('SSE no disponible');

      this.connected.set(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        // Process complete SSE frames only (LF or CRLF).
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? '';
        for (const frame of frames) this.consume(frame);
      }
    } catch {
      // Network errors lead to a bounded delay before reconnecting.
    } finally {
      if (this.controller === controller) this.controller = null;
      this.connected.set(false);
      if (this.token === token && !controller.signal.aborted) {
        this.retry = setTimeout(() => {
          this.retry = null;
          void this.listen(token);
        }, 3000);
      }
    }
  }

  private consume(frame: string): void {
    const lines = frame.split(/\r?\n/);
    const name = lines.find(line => line.startsWith('event:'))?.slice(6).trim();
    if (name !== 'appointment-changed') return;
    const payload = lines.filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim()).join('\n');
    if (!payload) return;

    try {
      const event = JSON.parse(payload) as Partial<AppointmentRealtimeEvent>;
      if (!event.appointmentId ||
          (event.status !== 'SCHEDULED' && event.status !== 'CANCELLED') ||
          !event.timestamp) return;
      this.lastEvent.set({
        appointmentId: event.appointmentId,
        status: event.status,
        timestamp: event.timestamp,
        sequence: ++this.counter
      });
    } catch {
      // Ignore malformed stream frames instead of disrupting the interface.
    }
  }
}
