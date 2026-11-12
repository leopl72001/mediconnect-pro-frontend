import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi, describe, beforeEach, expect, it } from 'vitest';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { CatalogService } from './core/catalog.service';
import { AppointmentApiService } from './core/appointment-api.service';
import { AppointmentNotifications } from './core/appointment-notifications';

describe('MediConnect real API booking and cancel flows', () => {
  const doctor = { id: 'doctor1', firstName: 'Ana', lastName: 'Demo',
    specialtyId: 's1', specialtyName: 'Medicina general' };
  const office = { id: 'office1', name: 'Consultorio', address: 'Calle ficticia',
    roomNumber: '101', active: true };
  const future = new Date(Date.now() + 10 * 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  const appointment = { id: 'appointment1', doctorId: doctor.id, officeId: office.id,
    startTime: future, endTime: future, status: 'SCHEDULED' as const };
  let fixture: ComponentFixture<App>;
  let app: App;
  let catalog: {
    doctors: ReturnType<typeof vi.fn>; offices: ReturnType<typeof vi.fn>;
    specialties: ReturnType<typeof vi.fn>;
  };
  let api: {
    mine: ReturnType<typeof vi.fn>; doctorSchedule: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn>;
  };
  let auth: {
    user: ReturnType<typeof signal<null>>;
    authenticated: ReturnType<typeof vi.fn>;
    accessToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let realtime: { connected: ReturnType<typeof signal<boolean>>;
    lastEvent: ReturnType<typeof signal<null>>; connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    catalog = {
      doctors: vi.fn(() => of([doctor])), offices: vi.fn(() => of([office])),
      specialties: vi.fn(() => of([]))
    };
    api = {
      mine: vi.fn(() => of([appointment])), doctorSchedule: vi.fn(() => of([appointment])),
      create: vi.fn(() => of(appointment)),
      cancel: vi.fn(() => of({ ...appointment, status: 'CANCELLED' }))
    };
    auth = {
      user: signal(null), authenticated: vi.fn(() => true),
      accessToken: vi.fn(() => 'fake-jwt'), logout: vi.fn()
    };
    realtime = {
      connected: signal(false), lastEvent: signal(null),
      connect: vi.fn(), disconnect: vi.fn()
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: CatalogService, useValue: catalog },
        { provide: AppointmentApiService, useValue: api },
        { provide: AppointmentNotifications, useValue: realtime }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    app.role.set('paciente');
  });

  function readyBooking() {
    app.realDoctors.set([doctor]);
    app.realOffices.set([office]);
    app.bookingDoctorId.set(doctor.id);
    app.bookingOfficeId.set(office.id);
    const d = new Date(Date.now() + 10 * 86400000);
    app.bookingDate.set(d.toISOString().slice(0, 10));
    app.bookingTime.set('10:00');
  }

  it('obtiene médicos y permite manejar errores del catálogo', () => {
    app.loadRealDoctors();
    expect(app.realDoctors()).toEqual([doctor]);
    expect(app.catalogLoading()).toBe(false);
    catalog.doctors.mockReturnValue(throwError(() => new Error('Sin conexión')));
    app.loadRealDoctors();
    expect(app.catalogError()).toContain('especialistas');
    expect(app.catalogLoading()).toBe(false);
  });

  it('omite consultorios inactivos y preselecciona consultorio válido', () => {
    catalog.offices.mockReturnValue(of([office, { ...office, id: 'inactive', active: false }]));
    app.loadOffices();
    expect(app.realOffices()).toEqual([office]);
    expect(app.bookingOfficeId()).toBe('office1');
    expect(app.officesLoading()).toBe(false);
  });

  it('registra error al no poder consultar consultorios', () => {
    catalog.offices.mockReturnValue(throwError(() => new Error('No disponible')));
    app.loadOffices();
    expect(app.officesError()).toContain('consultorios');
    expect(app.officesLoading()).toBe(false);
  });

  it('consulta agenda propia y de médico sin mezclar cuentas', () => {
    app.loadRealAppointments();
    expect(api.mine).toHaveBeenCalledOnce();
    expect(api.doctorSchedule).not.toHaveBeenCalled();
    expect(app.realAppointments()).toEqual([appointment]);
    app.role.set('medico');
    app.loadRealAppointments();
    expect(api.doctorSchedule).toHaveBeenCalledOnce();
    expect(app.appointmentsLoading()).toBe(false);
  });

  it('la cuenta administradora no consulta citas de un paciente', () => {
    app.role.set('admin');
    app.loadRealAppointments();
    expect(api.mine).not.toHaveBeenCalled();
    expect(api.doctorSchedule).not.toHaveBeenCalled();
  });

  it('reporta errores al consultar la agenda sin filtrar datos de la API', () => {
    api.mine.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    app.loadRealAppointments();
    expect(app.appointmentsError()).toContain('agenda');
    expect(app.appointmentsLoading()).toBe(false);
  });

  it('rechaza reserva real cuando falta consultorio, médico, fecha o hora', () => {
    readyBooking();
    app.bookingOfficeId.set('desconocido');
    app.confirmRealBooking();
    expect(app.appointmentError()).toContain('Selecciona un profesional');
    expect(api.create).not.toHaveBeenCalled();
    readyBooking();
    app.bookingDate.set('');
    app.confirmRealBooking();
    expect(app.appointmentError()).toContain('Selecciona un profesional');
  });

  it('impide reservas reales en pasado sin llamar la API', () => {
    readyBooking();
    app.bookingDate.set('2020-01-01');
    app.confirmRealBooking();
    expect(app.appointmentError()).toContain('futuras');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('reserva en UTC con desplazamiento colombiano y actualiza agenda', () => {
    readyBooking();
    app.confirmRealBooking();
    expect(api.create).toHaveBeenCalledOnce();
    const request = api.create.mock.calls[0][0];
    expect(request.doctorId).toBe(doctor.id);
    expect(request.officeId).toBe(office.id);
    expect(new Date(request.endTime).getTime() - new Date(request.startTime).getTime()).toBe(30 * 60000);
    expect(app.notice()).toContain('PostgreSQL');
    expect(app.section()).toBe('citas');
    expect(app.appointmentBusy()).toBe(false);
    expect(api.mine).toHaveBeenCalled();
  });

  it('traduce errores de conflicto, validación, sesión y conexión al reservar', () => {
    readyBooking();
    for (const [status, message] of [
      [409, 'ya tiene una cita'], [400, 'no son válidos'],
      [401, 'sesión'], [403, 'sesión'], [500, 'Spring Boot']
    ] as const) {
      api.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      app.confirmRealBooking();
      expect(app.appointmentError()).toContain(message);
      expect(app.appointmentBusy()).toBe(false);
    }
  });

  it('bloquea la reserva cuando no es paciente o está ocupada', () => {
    readyBooking();
    app.role.set('medico');
    app.confirmRealBooking();
    expect(api.create).not.toHaveBeenCalled();
    app.role.set('paciente');
    app.appointmentBusy.set(true);
    app.confirmRealBooking();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('rechaza cancelaciones con 24 horas o menos de anticipación', () => {
    app.cancelRealAppointment({ ...appointment, startTime: new Date(Date.now() + 3600000).toISOString() });
    expect(app.notice()).toContain('24 horas');
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('permite cancelar una cita futura programada y actualiza su estado', () => {
    app.realAppointments.set([appointment]);
    app.cancelRealAppointment(appointment);
    expect(api.cancel).toHaveBeenCalledWith(appointment.id);
    expect(app.realAppointments()[0].status).toBe('CANCELLED');
    expect(app.notice()).toContain('cancelada');
    expect(app.appointmentBusy()).toBe(false);
  });

  it('informa política de cancelación y errores inesperados', () => {
    for (const [status, message] of [[400, '24 horas'], [500, 'No pudimos']] as const) {
      api.cancel.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      app.cancelRealAppointment(appointment);
      expect(app.notice()).toContain(message);
      expect(app.appointmentBusy()).toBe(false);
    }
  });

  it('no cancela una cita anulada, desde otro rol, ni mientras hay operación activa', () => {
    app.cancelRealAppointment({ ...appointment, status: 'CANCELLED' });
    app.role.set('medico');
    app.cancelRealAppointment(appointment);
    app.role.set('paciente');
    app.appointmentBusy.set(true);
    app.cancelRealAppointment(appointment);
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('muestra selector de reservas reales solo con médicos disponibles', () => {
    app.openBooking();
    expect(app.section()).toBe('medicos');
    expect(app.notice()).toContain('No hay médicos');
    app.realDoctors.set([doctor]);
    app.realOffices.set([office]);
    app.openBooking(doctor.id);
    expect(app.section()).toBe('reservar');
    expect(app.bookingDoctorId()).toBe(doctor.id);
  });

  it('mantiene sin realizar llamadas reales las reservas del modo demo', () => {
    app.enterDemo();
    app.bookingDoctorId.set('laura');
    app.confirmRealBooking();
    expect(api.create).not.toHaveBeenCalled();
    app.cancelRealAppointment(appointment);
    expect(api.cancel).not.toHaveBeenCalled();
  });

  it('limpia datos al abandonar el espacio y no conserva estado anterior', () => {
    app.realDoctors.set([doctor]);
    app.realOffices.set([office]);
    app.realAppointments.set([appointment]);
    app.leaveWorkspace();
    expect(app.realDoctors()).toEqual([]);
    expect(app.realOffices()).toEqual([]);
    expect(app.realAppointments()).toEqual([]);
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('formatea fechas de citas reales en español colombiano', () => {
    expect(app.realAppointmentDate('2026-12-15T15:00:00Z')).toContain('2026');
    expect(app.dateLabel('2026-12-15')).toContain('2026');
  });
});
