import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppointmentNotifications, parseAppointmentFrame } from './appointment-notifications';

describe('notificaciones SSE — validación de identidad y eventos', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const event = {
    appointmentId: 'appointment-fictional-id', status: 'SCHEDULED',
    timestamp: '2026-11-12T12:00:00Z'
  };

  it('rechaza eventos con campos ausentes, inválidos o maliciosos', () => {
    const bad = [
      {}, { ...event, appointmentId: null }, { ...event, status: 'ADMIN' },
      { ...event, timestamp: 42 }, { ...event, appointmentId: 123 }
    ];
    for (const candidate of bad) {
      expect(parseAppointmentFrame('event:appointment-changed\ndata:' + JSON.stringify(candidate)))
        .toBeNull();
    }
  });

  it('ignora tramas de otros eventos y tramas vacías', () => {
    expect(parseAppointmentFrame('')).toBeNull();
    expect(parseAppointmentFrame('event:appointment-created\ndata:' + JSON.stringify(event))).toBeNull();
    expect(parseAppointmentFrame('event:appointment-changed\ndata:')).toBeNull();
    expect(parseAppointmentFrame(':heartbeat')).toBeNull();
  });

  it('interpreta datos JSON divididos en varias líneas SSE', () => {
    const text = 'event: appointment-changed\r\ndata: {\r\ndata: "appointmentId": "c1",\r\ndata: "status": "CANCELLED",\r\ndata: "timestamp": "2026-11-12"\r\ndata: }';
    expect(parseAppointmentFrame(text)).toEqual({
      appointmentId: 'c1', status: 'CANCELLED', timestamp: '2026-11-12'
    });
  });

  it('envía cabecera JWT Bearer sin almacenar token en URL', async () => {
    const stub = vi.fn().mockResolvedValue({ status: 403, ok: false });
    vi.stubGlobal('fetch', stub);
    const service = TestBed.inject(AppointmentNotifications);
    service.connect('jwt-ficticio');
    await vi.waitFor(() => expect(stub).toHaveBeenCalledOnce());
    expect(stub.mock.calls[0][0]).toBe('/api/v1/notifications/stream');
    expect(stub.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-ficticio');
    expect(stub.mock.calls[0][1].cache).toBe('no-store');
    expect(service.connected()).toBe(false);
    service.disconnect();
  });

  it('no duplica suscripciones cuando la sesión usa el mismo JWT', async () => {
    const stub = vi.fn().mockResolvedValue({ status: 401, ok: false });
    vi.stubGlobal('fetch', stub);
    const service = TestBed.inject(AppointmentNotifications);
    service.connect('jwt-ficticio');
    service.connect('jwt-ficticio');
    await vi.waitFor(() => expect(stub).toHaveBeenCalledOnce());
    service.disconnect();
    expect(service.lastEvent()).toBeNull();
    expect(service.connected()).toBe(false);
  });

  it('consume un evento de reserva y una cancelación por el flujo real de bytes', async () => {
    const encoder = new TextEncoder();
    const payloads = [
      'event: appointment-changed\ndata: ' + JSON.stringify(event) + '\n\n',
      'event: appointment-changed\ndata: ' + JSON.stringify({ ...event, status: 'CANCELLED' }) + '\n\n'
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const payload of payloads) controller.enqueue(encoder.encode(payload));
        controller.close();
      }
    });
    const stub = vi.fn().mockResolvedValue(new Response(stream, {
      status: 200, headers: { 'Content-Type': 'text/event-stream' }
    }));
    vi.stubGlobal('fetch', stub);
    const service = TestBed.inject(AppointmentNotifications);
    service.connect('token-de-prueba');
    await vi.waitFor(() => expect(service.lastEvent()?.sequence).toBe(2));
    expect(service.lastEvent()?.status).toBe('CANCELLED');
    service.disconnect();
  });

  it('limpia último evento y marca desconexión tras cerrar conexión activa', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(
          'event: appointment-changed\ndata: ' + JSON.stringify(event) + '\n\n'
        ));
      }
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, { status: 200 })));
    const service = TestBed.inject(AppointmentNotifications);
    service.connect('token-prueba');
    await vi.waitFor(() => expect(service.lastEvent()?.status).toBe('SCHEDULED'));
    service.disconnect();
    expect(service.connected()).toBe(false);
    expect(service.lastEvent()).toBeNull();
  });
});
