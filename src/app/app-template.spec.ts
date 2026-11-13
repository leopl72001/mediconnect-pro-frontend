import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { authInterceptor } from './core/auth.interceptor';

describe('MediConnect Pro — renderizado real por rol y pantalla demo', () => {
  let fixture: import('@angular/core/testing').ComponentFixture<App>;
  let app: App;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    app.enterDemo();
    fixture.detectChanges();
  });

  function render(section: Parameters<App['goTo']>[0]) {
    app.goTo(section);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('main')).not.toBeNull();
    expect(root.querySelector('h1')?.textContent).toContain(app.getPageTitle());
    return root;
  }

  it('presenta inicio del paciente, datos ficticios y tarjetas demo', () => {
    const root = render('resumen');
    expect(root.textContent).toContain('Entorno de demostración');
    expect(root.textContent).toContain('Paciente');
    expect(root.textContent).toContain('Carlos Pérez');
    expect(root.textContent).toContain('MediConnect');
  });

  it('permite recorrer las pantallas completas del paciente', () => {
    for (const section of ['medicos', 'citas', 'reservar', 'historia', 'recetas'] as const) {
      const root = render(section);
      expect(root.querySelector('header')).not.toBeNull();
    }
  });

  it('muestra búsqueda de especialistas y filtros al seleccionar medicina general', () => {
    const root = render('medicos');
    expect(root.querySelector('#doctor-search')).not.toBeNull();
    expect(root.textContent).toContain('Medicina general');
    app.specialty.set('Medicina general');
    fixture.detectChanges();
    expect(root.textContent).toContain('Dra. Laura Gómez');
    expect(root.textContent).not.toContain('Dr. Andrés Rodríguez');
  });

  it('renderiza estado vacío del directorio tras filtrar sin coincidencias', () => {
    const root = render('medicos');
    app.search.set('zzzz-inexistente');
    fixture.detectChanges();
    expect(root.textContent).toContain('0 profesionales');
    app.search.set('');
  });

  it('muestra la cita confirmada y la cita completada en demo', () => {
    const root = render('citas');
    expect(root.textContent).toContain('Dra. Laura Gómez');
    expect(root.textContent).toContain('Dr. Andrés Rodríguez');
  });

  it('expone selector de doctor y opciones de horarios de reserva', () => {
    const root = render('reservar');
    expect(root.textContent).toContain('Reservar una cita');
    expect(root.querySelector('input[type="date"]') || root.querySelector('select')).toBeTruthy();
  });

  it('el médico puede recorrer agenda, pacientes, notas y prescripciones', () => {
    app.setRole('medico');
    for (const section of ['resumen', 'agenda', 'pacientes', 'historia', 'recetas'] as const) {
      const root = render(section);
      expect(root.textContent).toContain('Médico');
    }
  });

  it('el administrador ve panel, profesionales, consultorios y reportes ilustrativos', () => {
    app.setRole('admin');
    for (const section of ['resumen', 'profesionales', 'consultorios', 'reportes'] as const) {
      const root = render(section);
      expect(root.textContent).toContain('Administrador');
    }
  });

  it('presenta aviso transitorio y permite cerrarlo desde la interfaz', () => {
    const root = render('resumen');
    app.notice.set('Aviso de prueba');
    fixture.detectChanges();
    const notice = root.querySelector('[role="status"]');
    expect(root.textContent).toContain('Aviso de prueba');
    const close = root.querySelector('[aria-label="Cerrar mensaje"]') as HTMLButtonElement;
    expect(close).toBeTruthy();
    close.click();
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Aviso de prueba');
  });

  it('muestra y oculta el menú móvil con controles de accesibilidad', () => {
    const root = render('resumen');
    app.mobileMenuOpen.set(true);
    fixture.detectChanges();
    expect(root.querySelector('[aria-label="Cerrar menú"]')).not.toBeNull();
    (root.querySelector('[aria-label="Cerrar menú"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(app.mobileMenuOpen()).toBe(false);
  });

  it('cambia de rol de demostración desde el selector de interfaz', () => {
    const root = render('resumen');
    const selector = root.querySelector('#demo-role') as HTMLSelectElement;
    expect(selector).toBeTruthy();
    selector.value = 'admin';
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(app.role()).toBe('admin');
    expect(root.textContent).toContain('Administrador');
  });

  it('el botón salir de demo vuelve a la pantalla de autenticación', () => {
    const root = render('resumen');
    const button = [...root.querySelectorAll('button')].find(b => b.textContent?.includes('Salir de demo'));
    expect(button).toBeTruthy();
    button!.click();
    fixture.detectChanges();
    expect(app.demoMode()).toBe(false);
    expect(root.textContent).toContain('Iniciar sesión');
  });

  it('permite crear y cancelar citas ficticias desde el estado del componente', () => {
    render('reservar');
    const count = app.appointments().length;
    app.confirmBooking();
    fixture.detectChanges();
    expect(app.appointments().length).toBe(count + 1);
    expect(app.section()).toBe('citas');
    const newest = app.appointments()[0];
    app.cancelAppointment(newest.id);
    fixture.detectChanges();
    expect(app.appointments()[0].status).toBe('Cancelada');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cancelada');
  });
});
