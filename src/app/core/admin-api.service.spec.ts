import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminApiService } from './admin-api.service';

describe('AdminApiService', () => {
  let api: AdminApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(),provideHttpClientTesting()]});
    api=TestBed.inject(AdminApiService);
    http=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>http.verify());
  it('crea consultorios activos como admin', () => {
    const body={name:'Prueba',address:'Sede prueba',roomNumber:'102',active:true};
    api.createOffice(body).subscribe();
    const req=http.expectOne('/api/v1/admin/offices');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({id:'a1'});
  });
  it('registra profesional con especialidad y contraseña temporal', () => {
    const body={email:'m@example.com',temporaryPassword:'secreto-demo',firstName:'M',lastName:'Prueba',medicalLicense:'DEMO-1',specialtyId:'s1'};
    api.createDoctor(body).subscribe();
    const req=http.expectOne('/api/v1/admin/doctors');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({id:'d1'});
  });
});
