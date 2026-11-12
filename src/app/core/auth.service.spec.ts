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

  it('rechaza un JWT vencido aunque tenga identidad y rol conocidos', () => {
    const expired = 'header.' + btoa(JSON.stringify({
      sub: 'expired@example.test', roles: ['ROLE_PATIENT'], exp: Math.floor(Date.now() / 1000) - 60
    })) + '.signature';
    let message = '';
    auth.login('expired@example.test', 'demo').subscribe({ error: err => message = err.message });
    httpMock.expectOne('/api/v1/auth/login').flush({ accessToken: expired, tokenType: 'Bearer' });
    expect(message).toContain('sesión no válida');
    expect(auth.authenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
  });

  it('rechaza JWT sin identidad o con rol que no existe en MediConnect', () => {
    for (const claims of [
      { roles: ['ROLE_PATIENT'], exp: Math.floor(Date.now() / 1000) + 60 },
      { sub: 'test@example.test', roles: ['ROLE_SUPERUSER'], exp: Math.floor(Date.now() / 1000) + 60 }
    ]) {
      const token = 'header.' + btoa(JSON.stringify(claims)) + '.signature';
      let failed = false;
      auth.login('test@example.test', 'demo').subscribe({ error: () => failed = true });
      httpMock.expectOne('/api/v1/auth/login').flush({ accessToken: token, tokenType: 'Bearer' });
      expect(failed).toBe(true);
      expect(auth.authenticated()).toBe(false);
    }
  });

  it('selecciona un rol conocido si el JWT también incluye roles desconocidos', () => {
    const token = 'header.' + btoa(JSON.stringify({
      sub: 'doctor@example.test',
      roles: ['ROLE_UNKNOWN', 'ROLE_DOCTOR'],
      exp: Math.floor(Date.now() / 1000) + 3600
    })) + '.signature';
    auth.login('doctor@example.test', 'demo').subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ accessToken: token, tokenType: 'Bearer' });
    expect(auth.user()?.role).toBe('ROLE_DOCTOR');
  });

  it('mantiene la sesión cerrada si el servidor devuelve error de credenciales', () => {
    let status = 0;
    auth.login('test@example.test', 'bad-password').subscribe({ error: error => status = error.status });
    httpMock.expectOne('/api/v1/auth/login').flush(
      { message: 'Credenciales invalidas' }, { status: 401, statusText: 'Unauthorized' }
    );
    expect(status).toBe(401);
    expect(auth.authenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
  });

  it('no intenta iniciar sesión cuando el registro falla', () => {
    let status = 0;
    auth.register({
      email: 'duplicate@example.test', password: 'Password123!',
      firstName: 'Ana', lastName: 'Prueba'
    }).subscribe({ error: error => status = error.status });
    httpMock.expectOne('/api/v1/auth/register').flush(
      { message: 'Correo ya registrado' }, { status: 409, statusText: 'Conflict' }
    );
    expect(status).toBe(409);
    httpMock.expectNone('/api/v1/auth/login');
    expect(auth.authenticated()).toBe(false);
  });

  it('elimina JWT y usuario tras cerrar una sesión real', () => {
    auth.login('paciente@example.test', 'demo').subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({
      accessToken: fakeToken('ROLE_PATIENT'), tokenType: 'Bearer'
    });
    expect(auth.authenticated()).toBe(true);
    auth.logout();
    expect(auth.authenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(auth.accessToken()).toBeNull();
  });


  it('rechaza JWT con payload que no es JSON', () => {
    let message = '';
    auth.login('paciente@example.test', 'demo').subscribe({ error: error => message = error.message });
    httpMock.expectOne('/api/v1/auth/login').flush({
      accessToken: 'header.' + btoa('not-json') + '.signature',
      tokenType: 'Bearer'
    });
    expect(message).toContain('sesión no válida');
    expect(auth.authenticated()).toBe(false);
  });

  it('no adjunta un token al HTTP después de cerrar sesión', () => {
    auth.login('paciente@example.test', 'demo').subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({
      accessToken: fakeToken('ROLE_PATIENT'), tokenType: 'Bearer'
    });
    auth.logout();
    const http = TestBed.inject(HttpClient);
    http.get('/api/v1/specialties').subscribe();
    const request = httpMock.expectOne('/api/v1/specialties');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

});
