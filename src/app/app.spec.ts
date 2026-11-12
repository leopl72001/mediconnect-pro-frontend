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
});
