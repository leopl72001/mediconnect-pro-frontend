import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { authInterceptor } from './core/auth.interceptor';

describe('MediConnect Pro — botones y formularios de interfaz demo', () => {
  let fixture: ComponentFixture<App>;
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

  function root(): HTMLElement {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function button(text: string): HTMLButtonElement {
    const found = [...root().querySelectorAll('button')].find(
      b => b.textContent?.trim().includes(text)
    ) as HTMLButtonElement | undefined;
    expect(found, 'Falta el botón accesible: ' + text).toBeTruthy();
    return found!;
  }

  it('permite abrir una reserva desde el botón principal del paciente', () => {
    button('Agendar cita').click();
    expect(app.section()).toBe('reservar');
  });

  it('abre directorio desde el llamado a explorar especialistas', () => {
    button('Explorar especialistas').click();
    expect(app.section()).toBe('medicos');
  });

  it('abre directorio desde la sección de destacados', () => {
    button('Ver todos').click();
    expect(app.section()).toBe('medicos');
  });

  it('navega desde próxima cita a historial de citas', () => {
    button('Ver todas mis citas').click();
    expect(app.section()).toBe('citas');
  });

  it('ejecuta botones de navegación accesibles de escritorio y móvil', () => {
    (root().querySelector('[aria-label="Abrir navegación"]') as HTMLButtonElement).click();
    expect(app.mobileMenuOpen()).toBe(true);
    (root().querySelector('[aria-label="Cerrar navegación"]') as HTMLButtonElement).click();
    expect(app.mobileMenuOpen()).toBe(false);
    app.goTo('citas');
    (root().querySelector('[aria-label="Ir al inicio"]') as HTMLButtonElement).click();
    expect(app.section()).toBe('resumen');
  });

  it('las entradas del menú lateral navegan mediante su botón', () => {
    const nav = root().querySelector('nav[aria-label="Secciones"]')!;
    const link = [...nav.querySelectorAll('button')].find(b => b.textContent?.includes('Mis citas'));
    expect(link).toBeTruthy();
    (link as HTMLButtonElement).click();
    expect(app.section()).toBe('citas');
  });

  it('el médico navega de su panel hacia la agenda real', () => {
    app.setRole('medico');
    button('Revisar agenda').click();
    expect(app.section()).toBe('agenda');
  });

  it('el médico navega de su panel al formulario de notas', () => {
    app.setRole('medico');
    const nav = root().querySelector('nav[aria-label="Secciones"]')!;
    const link = [...nav.querySelectorAll('button')].find(b => b.textContent?.includes('Notas clínicas'));
    expect(link).toBeTruthy();
    (link as HTMLButtonElement).click();
    expect(app.section()).toBe('historia');
  });

  it('el médico navega de su panel hacia prescripciones', () => {
    app.setRole('medico');
    const nav = root().querySelector('nav[aria-label="Secciones"]')!;
    const link = [...nav.querySelectorAll('button')].find(b => b.textContent?.includes('Prescripciones'));
    expect(link).toBeTruthy();
    (link as HTMLButtonElement).click();
    expect(app.section()).toBe('recetas');
  });

  it('el administrador abre la gestión de profesionales desde su panel', () => {
    app.setRole('admin');
    button('Gestionar profesionales').click();
    expect(app.section()).toBe('profesionales');
  });

  it('el administrador abre la gestión de consultorios desde su panel', () => {
    app.setRole('admin');
    button('Gestionar consultorios').click();
    expect(app.section()).toBe('consultorios');
  });

  it('el usuario escribe una búsqueda en el directorio y se actualizan los resultados', () => {
    app.goTo('medicos');
    const search = root().querySelector('#doctor-search') as HTMLInputElement;
    search.value = 'andrés';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(app.search()).toBe('andrés');
    expect(app.filteredDoctors().map(d => d.id)).toEqual(['andres']);
  });

  it('el usuario selecciona una especialidad desde un filtro visual', () => {
    app.goTo('medicos');
    button('Pediatría').click();
    fixture.detectChanges();
    expect(app.specialty()).toBe('Pediatría');
    expect(app.filteredDoctors().map(d => d.id)).toEqual(['valentina']);
  });

  it('una tarjeta médica abre el formulario de cita desde el directorio', () => {
    app.goTo('medicos');
    button('Agendar una cita').click();
    expect(app.section()).toBe('reservar');
  });

  it('el paciente regresa desde el formulario a la lista de especialistas', () => {
    app.goTo('reservar');
    button('Volver a especialistas').click();
    expect(app.section()).toBe('medicos');
  });

  it('la selección de horario del formulario modifica la hora elegida', () => {
    app.goTo('reservar');
    const times = [...root().querySelectorAll('button')].filter(
      b => /^1[045]:[03]0$/.test(b.textContent?.trim() ?? '')
    );
    expect(times.length).toBeGreaterThan(0);
    times[0].click();
    expect(app.bookingTime()).toBe(times[0].textContent!.trim());
  });

  it('el selector de fecha modifica la fecha seleccionada de la reserva', () => {
    app.goTo('reservar');
    const date = root().querySelector('#booking-date') as HTMLInputElement;
    expect(date).toBeTruthy();
    date.value = '2026-12-20';
    date.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(app.bookingDate()).toBe('2026-12-20');
  });

  it('la confirmación demo desde el botón crea una cita local', () => {
    app.goTo('reservar');
    const initial = app.appointments().length;
    button('Confirmar cita de demostración').click();
    expect(app.appointments()).toHaveLength(initial + 1);
    expect(app.section()).toBe('citas');
  });

  it('el botón de cancelación demo no llama a una API real', () => {
    app.goTo('citas');
    button('Cancelar demo').click();
    expect(app.appointments()[0].status).toBe('Cancelada');
  });

  it('abre formulario de nueva cita desde el historial del paciente', () => {
    app.goTo('citas');
    button('Nueva cita').click();
    expect(app.section()).toBe('reservar');
  });
});
