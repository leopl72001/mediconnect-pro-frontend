import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../core/auth.service';
import { AuthPage } from './auth-page';

describe('AuthPage — acceso seguro y validaciones', () => {
  let fixture: ComponentFixture<AuthPage>;
  let page: AuthPage;
  let auth: { login: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    auth = {
      login: vi.fn(() => of({ email: 'demo@example.test', role: 'ROLE_PATIENT' })),
      register: vi.fn(() => of({ email: 'demo@example.test', role: 'ROLE_PATIENT' }))
    };
    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [{ provide: AuthService, useValue: auth }]
    }).compileComponents();
    fixture = TestBed.createComponent(AuthPage);
    page = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  it('inicia sesión solo con datos completos y limpia la contraseña al aceptar', () => {
    page.email = ' demo@example.test ';
    page.password = 'sample-secret';
    page.submit();
    expect(auth.login).toHaveBeenCalledWith('demo@example.test', 'sample-secret');
    expect(page.password).toBe('');
    expect(page.busy()).toBe(false);
    expect(page.errorMessage()).toBe('');
  });

  it('no permite login sin correo o contraseña', () => {
    page.email = ' ';
    page.password = 'password';
    page.submit();
    expect(auth.login).not.toHaveBeenCalled();
    expect(page.errorMessage()).toContain('Revisa los datos');
    page.email = 'demo@example.test';
    page.password = '';
    page.submit();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('cambia al formulario de registro y elimina errores anteriores', () => {
    page.errorMessage.set('error anterior');
    page.selectMode('register');
    expect(page.mode()).toBe('register');
    expect(page.errorMessage()).toBe('');
  });

  it('rechaza registro sin nombre o contraseña de ocho caracteres', () => {
    page.selectMode('register');
    page.email = 'demo@example.test';
    page.password = '1234567';
    page.firstName = 'Ana';
    page.lastName = 'Prueba';
    page.submit();
    expect(auth.register).not.toHaveBeenCalled();
    expect(page.errorMessage()).toContain('8 caracteres');
    page.password = 'long-password';
    page.firstName = '';
    page.submit();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('envía registro con campos saneados y limpia contraseña', () => {
    page.selectMode('register');
    page.email = ' demo@example.test ';
    page.password = 'long-password';
    page.firstName = ' Ana ';
    page.lastName = ' Prueba ';
    page.submit();
    expect(auth.register).toHaveBeenCalledWith({
      email: 'demo@example.test', password: 'long-password',
      firstName: 'Ana', lastName: 'Prueba'
    });
    expect(page.password).toBe('');
    expect(page.busy()).toBe(false);
  });

  it('bloquea peticiones duplicadas mientras se procesa una solicitud', () => {
    page.email = 'demo@example.test';
    page.password = 'long-password';
    page.busy.set(true);
    page.submit();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('distingue errores HTTP de conexión, permisos, duplicado y validación', () => {
    page.email = 'demo@example.test';
    page.password = 'long-password';
    for (const [status, message] of [
      [0, 'Docker'], [401, 'incorrectos'], [409, 'registrado'],
      [400, 'no válidos'], [500, 'más tarde']
    ] as const) {
      auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      page.submit();
      expect(page.errorMessage()).toContain(message);
      expect(page.busy()).toBe(false);
    }
  });

  it('informa errores de JWT inválido sin reemplazar la identidad', () => {
    page.email = 'demo@example.test';
    page.password = 'long-password';
    auth.login.mockReturnValue(throwError(() => new Error('JWT inválido')));
    page.submit();
    expect(page.errorMessage()).toContain('JWT inválido');
    expect(page.busy()).toBe(false);
  });
});
