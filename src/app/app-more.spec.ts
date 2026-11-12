import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('MediConnect Pro — cálculos de citas y menús', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  function app() {
    return TestBed.createComponent(App).componentInstance;
  }

  const doctors = [
    { id: 'd1', firstName: 'Laura', lastName: 'Prueba', specialtyId: 's1', specialtyName: 'Medicina general' },
    { id: 'd2', firstName: 'Carlos', lastName: 'Ficticio', specialtyId: 's2', specialtyName: 'Cardiología' }
  ];
  const offices = [
    { id: 'o1', name: 'Consultorio Ficticio', address: 'Calle de prueba', roomNumber: '101', active: true }
  ];

  it('combina filtro de especialidad y texto sin distinguir mayúsculas', () => {
    const root = app();
    root.realDoctors.set(doctors);
    root.search.set('car');
    expect(root.realFilteredDoctors().map(d => d.id)).toEqual(['d2']);
    root.specialty.set('Medicina general');
    expect(root.realFilteredDoctors()).toEqual([]);
    root.search.set('');
    expect(root.realFilteredDoctors().map(d => d.id)).toEqual(['d1']);
  });

  it('calcula especialidades disponibles sin duplicados y separa demo de datos reales', () => {
    const root = app();
    root.realDoctors.set([...doctors, doctors[0]]);
    expect(root.availableSpecialties()).toEqual(['Todas', 'Medicina general', 'Cardiología']);
    root.enterDemo();
    expect(root.availableSpecialties()).toEqual(root.specialties);
  });

  it('resuelve el nombre del profesional y consultorio asignados', () => {
    const root = app();
    root.realDoctors.set(doctors);
    root.realOffices.set(offices);
    root.bookingDoctorId.set('d1');
    root.bookingOfficeId.set('o1');
    expect(root.realSelectedDoctor()?.firstName).toBe('Laura');
    expect(root.realSelectedOffice()?.name).toBe('Consultorio Ficticio');
    expect(root.selectedRealDoctorName()).toBe('Laura Prueba');
    root.bookingDoctorId.set('inexistente');
    expect(root.realSelectedDoctor()).toBeNull();
    expect(root.selectedRealDoctorName()).toBe('Sin seleccionar');
  });

  it('cuenta únicamente citas futuras programadas', () => {
    const root = app();
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    const past = new Date(Date.now() - 10 * 86400000).toISOString();
    root.realAppointments.set([
      { id: '1', doctorId: 'd1', officeId: 'o1', startTime: future, endTime: future, status: 'SCHEDULED' },
      { id: '2', doctorId: 'd1', officeId: 'o1', startTime: past, endTime: past, status: 'SCHEDULED' },
      { id: '3', doctorId: 'd1', officeId: 'o1', startTime: future, endTime: future, status: 'CANCELLED' }
    ]);
    expect(root.realUpcomingAppointments().map(a => a.id)).toEqual(['1']);
  });

  it('presenta etiquetas seguras para médicos y consultorios desconocidos', () => {
    const root = app();
    const appointment = {
      id: '1', doctorId: 'missing', officeId: 'missing',
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
      status: 'SCHEDULED' as const
    };
    expect(root.realAppointmentDoctor(appointment)).toBe('Profesional registrado');
    expect(root.realAppointmentOffice(appointment)).toBe('Consultorio');
    root.realDoctors.set(doctors);
    root.realOffices.set(offices);
    expect(root.realAppointmentDoctor({ ...appointment, doctorId: 'd1' })).toBe('Laura Prueba');
    expect(root.realAppointmentOffice({ ...appointment, officeId: 'o1' })).toBe('Consultorio Ficticio');
  });

  it('bloquea la reserva real del médico y de visitantes no autenticados', () => {
    const root = app();
    root.openBooking('d1');
    expect(root.notice()).toContain('médicos registrados');
    root.role.set('medico');
    root.openBooking('d1');
    expect(root.notice()).toContain('Solo los pacientes');
  });

  it('la navegación oculta el menú móvil y limpia notificaciones anteriores', () => {
    const root = app();
    root.enterDemo();
    root.mobileMenuOpen.set(true);
    root.notice.set('Notificación anterior');
    root.goTo('citas');
    expect(root.section()).toBe('citas');
    expect(root.mobileMenuOpen()).toBe(false);
    expect(root.notice()).toBe('');
    expect(root.getPageTitle()).toBe('Mis citas');
  });

  it('distingue vista administrativa de panel principal', () => {
    const root = app();
    root.enterDemo();
    root.setRole('admin');
    expect(root.adminView()).toBe('resumen');
    root.goTo('consultorios');
    expect(root.adminView()).toBe('consultorios');
    expect(root.getPageTitle()).toBe('Consultorios');
    root.goTo('profesionales');
    expect(root.adminView()).toBe('profesionales');
  });
});
