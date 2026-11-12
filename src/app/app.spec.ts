import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { authInterceptor } from './core/auth.interceptor';

describe('MediConnect Pro', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('muestra el formulario de inicio de sesión antes de autenticarse', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('¡Bienvenido de nuevo!');
    expect(text).toContain('Iniciar sesión');
  });

  it('permite explorar el panel del paciente en modo demo', () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.enterDemo();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tu salud,');
    expect(text).toContain('Entorno de demostración');
  });

  it('cambia al dashboard del médico exclusivamente en modo demo', () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.enterDemo();
    fixture.componentInstance.setRole('medico');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Agenda del día');
  });

  it('crea una cita local de ejemplo sin enviar una solicitud al backend', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.enterDemo();
    const initial = app.appointments().length;
    app.openBooking('andres');
    app.confirmBooking();
    fixture.detectChanges();
    expect(app.appointments().length).toBe(initial + 1);
    expect(app.section()).toBe('citas');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cita de demostración agregada');
  });

  it('impide cambiar de rol fuera del modo de demostración', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.setRole('admin');
    expect(app.role()).toBe('paciente');
    expect(app.demoMode()).toBe(false);
  });

  it('cambia de rol y vuelve a resumen solo en modo demo', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.enterDemo();
    app.goTo('medicos');
    app.mobileMenuOpen.set(true);
    app.notice.set('Anterior');
    app.setRole('medico');
    expect(app.role()).toBe('medico');
    expect(app.section()).toBe('resumen');
    expect(app.mobileMenuOpen()).toBe(false);
    expect(app.notice()).toBe('');
    expect(app.roleLabel()).toBe('Médico');
    expect(app.menu().some(item => item.id === 'agenda')).toBe(true);
    app.setRole('admin');
    expect(app.roleLabel()).toBe('Administrador');
    expect(app.menu().some(item => item.id === 'reportes')).toBe(true);
  });

  it('filtra especialistas de demostración por nombre y especialidad', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.enterDemo();
    app.search.set('andrés');
    expect(app.filteredDoctors().map(d => d.id)).toEqual(['andres']);
    app.search.set('');
    app.specialty.set('Pediatría');
    expect(app.filteredDoctors().map(d => d.id)).toEqual(['valentina']);
    app.specialty.set('Todas');
    expect(app.filteredDoctors().length).toBe(app.doctors.length);
  });

  it('cancela solamente citas confirmadas durante la demostración', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.cancelAppointment(1);
    expect(app.appointments().find(a => a.id === 1)?.status).toBe('Confirmada');
    app.enterDemo();
    app.cancelAppointment(1);
    expect(app.appointments().find(a => a.id === 1)?.status).toBe('Cancelada');
    expect(app.appointments().find(a => a.id === 2)?.status).toBe('Completada');
    expect(app.appointmentCount()).toBe(0);
  });

  it('no crea citas demo cuando faltan fecha u hora', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.enterDemo();
    const count = app.appointments().length;
    app.bookingDate.set('');
    app.confirmBooking();
    expect(app.appointments().length).toBe(count);
    expect(app.notice()).toBe('Selecciona una fecha y una hora.');
  });

  it('limpia los datos y el estado visual al abandonar el espacio', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.enterDemo();
    app.setRole('medico');
    app.goTo('agenda');
    app.notice.set('Prueba');
    app.catalogError.set('Error anterior');
    app.officesError.set('Error anterior');
    app.appointmentsError.set('Error anterior');
    app.leaveWorkspace();
    expect(app.demoMode()).toBe(false);
    expect(app.role()).toBe('paciente');
    expect(app.section()).toBe('resumen');
    expect(app.notice()).toBe('');
    expect(app.catalogError()).toBe('');
    expect(app.officesError()).toBe('');
    expect(app.appointmentsError()).toBe('');
  });

  it('distingue título clínico y menú por rol', () => {
    const app = TestBed.createComponent(App).componentInstance;
    app.enterDemo();
    app.goTo('historia');
    expect(app.getPageTitle()).toBe('Historia clínica');
    expect(app.clinicalRole()).toBe('paciente');
    app.setRole('medico');
    app.goTo('historia');
    expect(app.getPageTitle()).toBe('Notas clínicas');
    expect(app.clinicalRole()).toBe('medico');
    app.goTo('recetas');
    expect(app.getPageTitle()).toBe('Prescripciones');
    expect(app.clinicalKind()).toBe('recetas');
  });

});
