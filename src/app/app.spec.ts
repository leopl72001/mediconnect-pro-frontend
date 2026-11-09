import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('MediConnect Pro', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('creates the application and shows a patient dashboard', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('MediConnect');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tu salud,');
  });

  it('switches to the doctor dashboard with Signals', () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance.setRole('medico');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Agenda del día');
  });

  it('creates a local demo appointment without a backend', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const initial = app.appointments().length;
    app.openBooking('andres');
    app.confirmBooking();
    fixture.detectChanges();
    expect(app.appointments().length).toBe(initial + 1);
    expect(app.section()).toBe('citas');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cita de demostración agregada');
  });
});
