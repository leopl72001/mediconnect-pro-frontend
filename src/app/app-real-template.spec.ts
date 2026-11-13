import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { CatalogService } from './core/catalog.service';
import { AppointmentApiService } from './core/appointment-api.service';
import { AppointmentNotifications } from './core/appointment-notifications';
import { AdminApiService } from './core/admin-api.service';

describe('App — plantillas de sesión JWT ficticia y navegación por rol', () => {
  const principal = signal({
    email: 'patient@example.test', role: 'ROLE_PATIENT' as const
  });
  const doctor = {
    id: 'doctor-1', firstName: 'Ana', lastName: 'Ejemplo',
    specialtyId: 'specialty-1', specialtyName: 'Medicina general'
  };
  const office = {
    id: 'office-1', name: 'Consultorio Ejemplo', address: 'Calle ficticia',
    roomNumber: '101', active: true
  };
  const appointment = {
    id: 'appointment-1', doctorId: 'doctor-1', officeId: 'office-1',
    startTime: new Date(Date.now() + 10 * 86400000).toISOString(),
    endTime: new Date(Date.now() + 10 * 86400000 + 1800000).toISOString(),
    status: 'SCHEDULED' as const
  };
  let fixture: ComponentFixture<App>;
  let app: App;

  beforeEach(async () => {
    principal.set({ email: 'patient@example.test', role: 'ROLE_PATIENT' });
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        { provide: AuthService, useValue: {
          user: principal, authenticated: () => true,
          accessToken: () => 'jwt-ficticio', logout: vi.fn()
        } },
        { provide: CatalogService, useValue: {
          doctors: () => of([doctor]), offices: () => of([office]),
          specialties: () => of([{ id: 'specialty-1', name: 'Medicina general' }])
        } },
        { provide: AppointmentApiService, useValue: {
          mine: () => of([appointment]), doctorSchedule: () => of([appointment]),
          create: () => of(appointment), cancel: () => of({ ...appointment, status: 'CANCELLED' })
        } },
        { provide: AdminApiService, useValue: {
          createDoctor: () => of({ id: 'doctor-created' }),
          createOffice: () => of({ id: 'office-created' })
        } },
        { provide: AppointmentNotifications, useValue: {
          connected: signal(false), lastEvent: signal(null),
          connect: vi.fn(), disconnect: vi.fn()
        } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    fixture.detectChanges();
  });

  function render(section: Parameters<App['goTo']>[0]): HTMLElement {
    app.goTo(section);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('main')).not.toBeNull();
    return root;
  }

  it('muestra los especialistas reales y el estado JWT en lugar de demo', () => {
    const root = render('medicos');
    expect(root.textContent).toContain('Ana Ejemplo');
    expect(root.textContent).toContain('Sesión JWT');
    expect(root.textContent).toContain('Medicina general');
  });

  it('muestra lista de citas reales de paciente y sus consultorios', () => {
    const root = render('citas');
    expect(root.textContent).toContain('Ana Ejemplo');
    expect(root.textContent).toContain('Consultorio Ejemplo');
    expect(root.textContent).toContain('Mis citas');
  });

  it('dibuja el formulario real con selección de consultorio activo', () => {
    app.openBooking(doctor.id);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Reservar una cita');
    expect(root.textContent).toContain('Consultorio Ejemplo');
  });

  it('cambia a vista médica de agenda con registros asignados', () => {
    app.role.set('medico');
    const root = render('agenda');
    expect(root.textContent).toContain('Mi agenda');
    expect(root.textContent).toContain('Ana Ejemplo');
  });

  it('la pantalla médica de pacientes evita divulgar sus nombres', () => {
    app.role.set('medico');
    const root = render('pacientes');
    expect(root.textContent).toContain('Citas de pacientes asignadas');
    expect(root.textContent).toContain('privacidad');
  });

  it('presenta el tablero administrativo real sin estadísticas ficticias', () => {
    app.role.set('admin');
    const root = render('resumen');
    expect(root.textContent).toContain('Panel administrativo');
    expect(root.textContent).toContain('Médicos registrados');
    expect(root.textContent).toContain('Consultorios activos');
  });

  it('la administración real permite visualizar profesionales y consultorios', () => {
    app.role.set('admin');
    expect(render('profesionales').textContent).toContain('Registrar nuevo médico');
    expect(render('consultorios').textContent).toContain('Crear consultorio real');
  });

  it('el tablero administrativo informa límites de estadísticas reales', () => {
    app.role.set('admin');
    const root = render('reportes');
    expect(root.textContent).toContain('no se inventan cifras');
  });

  it('informa si SSE no está conectado y ofrece cerrar sesión real', () => {
    const root = render('resumen');
    expect(root.textContent).toContain('SSE reconectando');
    expect(root.textContent).toContain('Cerrar sesión');
  });
});
