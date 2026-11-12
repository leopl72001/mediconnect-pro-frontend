import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppointmentNotifications, parseAppointmentFrame } from './appointment-notifications';

describe('AppointmentNotifications (SSE)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('interpreta un evento de cita nueva de Spring Boot', () => {
    const payload = JSON.stringify({
      appointmentId: 'c1', status: 'SCHEDULED', timestamp: '2026-11-11T20:00:00Z'
    });
    const event = parseAppointmentFrame(`event:appointment-changed\ndata:${payload}`);
    expect(event?.appointmentId).toBe('c1');
    expect(event?.status).toBe('SCHEDULED');
  });

  it('interpreta la cancelación y tolera saltos CRLF', () => {
    const payload = JSON.stringify({
      appointmentId: 'c2', status: 'CANCELLED', timestamp: '2026-11-11T20:00:00Z'
    });
    expect(parseAppointmentFrame(`event: appointment-changed\r\ndata: ${payload}`)?.status)
      .toBe('CANCELLED');
  });

  it('ignora comentarios heartbeat, eventos de control y datos incorrectos', () => {
    expect(parseAppointmentFrame(':heartbeat')).toBeNull();
    expect(parseAppointmentFrame('event:connected\ndata:{"status":"connected"}')).toBeNull();
    expect(parseAppointmentFrame('event:appointment-changed\ndata:invalid-json')).toBeNull();
    expect(parseAppointmentFrame('event:appointment-changed\ndata:{"appointmentId":"x","status":"unknown"}')).toBeNull();
  });

  it('conecta con Authorization Bearer y nunca envía JWT en la URL', () => {
    const fetchStub = vi.fn().mockResolvedValue({ status: 401, ok: false });
    vi.stubGlobal('fetch', fetchStub);

    const service = TestBed.inject(AppointmentNotifications);
    service.connect('jwt-secreto-de-prueba');

    expect(fetchStub).toHaveBeenCalledWith('/api/v1/notifications/stream', expect.objectContaining({
      headers: {
        Accept: 'text/event-stream',
        Authorization: 'Bearer jwt-secreto-de-prueba'
      }
    }));
    service.disconnect();
    expect(service.connected()).toBe(false);
  });
});
