import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../core/auth.service';
import { AuthPage } from './auth-page';

describe('AuthPage — plantilla de acceso visible y accesible', () => {
  let fixture: ComponentFixture<AuthPage>;
  let page: AuthPage;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [{
        provide: AuthService, useValue: {
          login: vi.fn(() => of({})), register: vi.fn(() => of({}))
        }
      }]
    }).compileComponents();
    fixture = TestBed.createComponent(AuthPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
  });

  function html(): HTMLElement {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra formulario de ingreso con contraseña privada', () => {
    expect(html().textContent).toContain('¡Bienvenido de nuevo!');
    expect((html().querySelector('input[name="password"]') as HTMLInputElement).type).toBe('password');
    expect((html().querySelector('input[name="password"]') as HTMLInputElement).autocomplete).toBe('current-password');
  });

  it('cambia a registro con nombre, apellido y contraseña de mínimo ocho caracteres', () => {
    const register = [...html().querySelectorAll('button')].find(b => b.textContent?.includes('Registrarse'))!;
    register.click();
    expect(html().textContent).toContain('Crea tu cuenta');
    expect(html().querySelector('input[name="firstName"]')).not.toBeNull();
    expect(html().querySelector('input[name="lastName"]')).not.toBeNull();
    expect((html().querySelector('input[name="password"]') as HTMLInputElement).minLength).toBe(8);
  });

  it('informa errores de credenciales con un mensaje accesible', () => {
    page.errorMessage.set('Credenciales ficticias incorrectas');
    expect(html().querySelector('[role="alert"]')?.textContent).toContain('incorrectas');
  });

  it('bloquea ingreso durante validación del servidor y presenta conectando', () => {
    page.busy.set(true);
    const button = html().querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Conectando');
  });

  it('ofrece una opción de demostración sin iniciar sesión', () => {
    let emissions = 0;
    page.enterDemo.subscribe(() => emissions++);
    const button = [...html().querySelectorAll('button')].find(b => b.textContent?.includes('Explorar interfaz'));
    expect(button).toBeTruthy();
    button!.click();
    expect(emissions).toBe(1);
  });
});
