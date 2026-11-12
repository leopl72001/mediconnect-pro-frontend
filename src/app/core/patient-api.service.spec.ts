import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PatientApiService } from './patient-api.service';

describe('PatientApiService', () => {
  let api: PatientApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(),provideHttpClientTesting()]});
    api=TestBed.inject(PatientApiService);
    http=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>http.verify());
  it('obtiene perfil de paciente', () => {
    api.mine().subscribe();
    const req=http.expectOne('/api/v1/patients/me');
    expect(req.request.method).toBe('GET');
    req.flush({id:'1',email:'paciente@test.com',firstName:'Ana',lastName:'Perez',birthDate:null,phone:null,address:null});
  });
  it('actualiza perfil de paciente',()=>{
    const body={birthDate:'1999-01-01',phone:'3000000000',address:'Prueba'};
    api.update(body).subscribe();
    const req=http.expectOne('/api/v1/patients/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({id:'1',email:'paciente@test.com',firstName:'Ana',lastName:'Perez',...body});
  });
});
