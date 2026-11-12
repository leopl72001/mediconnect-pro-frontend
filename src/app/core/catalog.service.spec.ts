import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let catalog: CatalogService;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    catalog = TestBed.inject(CatalogService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('consulta los médicos reales en el endpoint Spring Boot', () => {
    let names: string[] = [];
    catalog.doctors().subscribe(doctors => {
      names = doctors.map(d => `${d.firstName} ${d.lastName}`);
    });
    const request = requests.expectOne('/api/v1/doctors');
    expect(request.request.method).toBe('GET');
    request.flush([{
      id: '9ebf05c8-2e0a-476b-a513-0b5f97288e17',
      firstName: 'Laura', lastName: 'Gomez',
      specialtyId: 'd00e2b8f-53ba-4f33-87b0-daf1d16766cc',
      specialtyName: 'Medicina general'
    }]);
    expect(names).toEqual(['Laura Gomez']);
  });

  it('consulta las especialidades reales', () => {
    let count = 0;
    catalog.specialties().subscribe(data => count = data.length);
    requests.expectOne('/api/v1/specialties').flush([{ id: '1', name: 'Cardiología' }]);
    expect(count).toBe(1);
  });

  it('consulta los consultorios del backend', () => {
    let firstName = '';
    catalog.offices().subscribe(data => firstName = data[0].name);
    requests.expectOne('/api/v1/offices').flush([{
      id: '1', name: 'Consultorio 101', address: 'Sede centro',
      roomNumber: '101', active: true
    }]);
    expect(firstName).toBe('Consultorio 101');
  });
});
