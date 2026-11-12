import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClinicalApiService } from './clinical-api.service';

describe('ClinicalApiService', () => {
  let api: ClinicalApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    api = TestBed.inject(ClinicalApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('consulta notas privadas del paciente', () => {
    let total = 0;
    api.patientNotes().subscribe(data => total = data.length);
    const req = http.expectOne('/api/v1/clinical-notes/me');
    expect(req.request.method).toBe('GET');
    req.flush([{id:'n1',appointmentId:'a1',content:'Nota de prueba',createdBy:'medico@example.com',createdAt:'2026-11-11T13:00:00Z'}]);
    expect(total).toBe(1);
  });
  it('permite a un médico crear nota para una cita', () => {
    api.addNote('cita-1', 'Solo demostración').subscribe();
    const req=http.expectOne('/api/v1/appointments/cita-1/clinical-notes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({content:'Solo demostración'});
    req.flush({id:'n1',appointmentId:'cita-1',content:'Solo demostración',createdBy:'medico@example.com',createdAt:'2026-11-11T13:00:00Z'});
  });
  it('consulta recetas del paciente', () => {
    api.patientPrescriptions().subscribe();
    const req=http.expectOne('/api/v1/prescriptions/me');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
  it('crea una receta con una línea y validación backend', () => {
    const items=[{medication:'Tylenol',dosage:'SOLO DEMO',frequency:'NO ADMINISTRAR'}];
    api.addPrescription('cita-1',items).subscribe();
    const req=http.expectOne('/api/v1/appointments/cita-1/prescriptions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({items});
    req.flush({id:'p1',appointmentId:'cita-1',createdBy:'medico@example.com',createdAt:'2026-11-11T13:00:00Z',items:[]});
  });
});
