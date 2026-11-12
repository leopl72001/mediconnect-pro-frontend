import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('Autenticación JWT', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const fakeToken = (role: string) =>
    'header.' + btoa(JSON.stringify({
      sub: 'paciente@example.test',
      roles: [role],
      exp: Math.floor(Date.now() / 1000) + 3600
    })) + '.signature';

  it('inicia sesión con JWT sin enviar token en la petición de login', () => {
    const token = fakeToken('ROLE_PATIENT');
    auth.login('paciente@example.test', 'demo-password').subscribe();
    const login = httpMock.expectOne('/api/v1/auth/login');
    expect(login.request.method).toBe('POST');
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush({ accessToken: token, tokenType: 'Bearer' });

    expect(auth.authenticated()).toBe(true);
    expect(auth.user()?.role).toBe('ROLE_PATIENT');
    expect(auth.user()?.email).toBe('paciente@example.test');
    expect(auth.accessToken()).toBe(token);
  });

  it('adjunta JWT a peticiones de API y permite cerrar sesión', () => {
    const token = fakeToken('ROLE_DOCTOR');
    auth.login('paciente@example.test', 'demo-password').subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ accessToken: token, tokenType: 'Bearer' });

    const http = TestBed.inject(HttpClient);
    http.get('/api/v1/appointments/doctor/me').subscribe();
    const request = httpMock.expectOne('/api/v1/appointments/doctor/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer ' + token);
    request.flush([]);

    auth.logout();
    expect(auth.authenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
  });

  it('registra un paciente y luego inicia sesión automáticamente', () => {
    auth.register({ email: 'paciente@example.test', password: 'demo-password', firstName: 'Ana', lastName: 'Ruiz' }).subscribe();
    const register = httpMock.expectOne('/api/v1/auth/register');
    expect(register.request.method).toBe('POST');
    expect(register.request.headers.has('Authorization')).toBe(false);
    register.flush({ id: 'demo', email: 'paciente@example.test', role: 'ROLE_PATIENT' });

    const login = httpMock.expectOne('/api/v1/auth/login');
    login.flush({ accessToken: fakeToken('ROLE_PATIENT'), tokenType: 'Bearer' });
    expect(auth.authenticated()).toBe(true);
  });

  it('rechaza respuestas de login sin identidad válida', () => {
    let receivedError = false;
    auth.login('paciente@example.test', 'demo-password').subscribe({
      error: () => { receivedError = true; }
    });
    httpMock.expectOne('/api/v1/auth/login').flush({ accessToken: 'malformed', tokenType: 'Bearer' });
    expect(receivedError).toBe(true);
    expect(auth.authenticated()).toBe(false);
  });
});
