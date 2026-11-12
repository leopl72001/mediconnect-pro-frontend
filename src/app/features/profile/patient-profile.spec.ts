import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PatientProfilePage } from './patient-profile';

describe('PatientProfilePage — perfiles persistidos en PostgreSQL', () => {
  let http: HttpTestingController;
  const profile = {
    id: 'fictional-id',
    email: 'paciente@example.test',
    firstName: 'Ana',
    lastName: 'Prueba',
    birthDate: null,
    phone: null,
    address: null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientProfilePage],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function openPage() {
    const fixture = TestBed.createComponent(PatientProfilePage);
    fixture.detectChanges();
    const request = http.expectOne('/api/v1/patients/me');
    expect(request.request.method).toBe('GET');
    return { fixture, request, component: fixture.componentInstance };
  }

  it('muestra el perfil real al cargar datos de la API', () => {
    const { fixture, request, component } = openPage();
    request.flush({ ...profile, birthDate: '2000-02-03', phone: '3000000000', address: 'Ficticia' });
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.phone).toBe('3000000000');
    expect(component.birthDate).toBe('2000-02-03');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ana Prueba');
  });

  it('informa de problemas al consultar el perfil sin datos previos', () => {
    const { request, component } = openPage();
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(component.loading()).toBe(false);
    expect(component.profile()).toBeNull();
    expect(component.error()).toContain('No se pudo consultar');
  });

  it('impide guardar cuando el perfil aún no se ha cargado', () => {
    const { request, component } = openPage();
    component.save();
    http.expectNone(r => r.method === 'PUT');
    request.flush(profile);
  });

  it('rechaza fecha de nacimiento igual a hoy sin llamar al backend', () => {
    const { request, component } = openPage();
    request.flush(profile);
    component.birthDate = component.today;
    component.save();
    expect(component.error()).toContain('anterior a hoy');
    http.expectNone(r => r.method === 'PUT');
  });

  it('normaliza contacto antes del PUT y presenta confirmación tras guardar', () => {
    const { request, component } = openPage();
    request.flush(profile);
    component.phone = ' 3000000000 ';
    component.address = ' Calle de prueba ';
    component.birthDate = '2000-01-01';
    component.save();
    const update = http.expectOne('/api/v1/patients/me');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({
      birthDate: '2000-01-01',
      phone: '3000000000',
      address: 'Calle de prueba'
    });
    update.flush({ ...profile, phone: '3000000000', address: 'Calle de prueba', birthDate: '2000-01-01' });
    expect(component.busy()).toBe(false);
    expect(component.message()).toContain('PostgreSQL');
  });

  it('muestra error al fallar un PUT y permite reintentar', () => {
    const { request, component } = openPage();
    request.flush(profile);
    component.phone = '3000000000';
    component.save();
    const update = http.expectOne('/api/v1/patients/me');
    update.flush({}, { status: 500, statusText: 'Server Error' });
    expect(component.busy()).toBe(false);
    expect(component.error()).toContain('No fue posible guardar');
  });
});
