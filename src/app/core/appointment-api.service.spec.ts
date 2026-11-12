import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppointmentApiService } from './appointment-api.service';
import { authInterceptor } from './auth.interceptor';

describe('AppointmentApiService', () => {
  let appointments: AppointmentApiService;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    appointments = TestBed.inject(AppointmentApiService);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  const example = {
    id: 'f190c0d1-c272-4e5e-a570-cd3f22301dd2',
    doctorId: 'd001', officeId: 'o001',
    startTime: '2026-12-15T14:00:00Z', endTime: '2026-12-15T14:30:00Z',
    status: 'SCHEDULED'
  };

  it('envía doctor, consultorio y timestamps UTC al crear la reserva', () => {
    const data = {
      doctorId: 'd001', officeId: 'o001',
      startTime: '2026-12-15T14:00:00Z', endTime: '2026-12-15T14:30:00Z'
    };
    let resultId = '';
    appointments.create(data).subscribe(result => resultId = result.id);
    const request = requests.expectOne('/api/v1/appointments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(data);
    request.flush(example);
    expect(resultId).toBe(example.id);
  });

  it('consulta las citas del paciente autenticado', () => {
    let count = 0;
    appointments.mine().subscribe(data => count = data.length);
    const request = requests.expectOne('/api/v1/appointments/me');
    expect(request.request.method).toBe('GET');
    request.flush([example]);
    expect(count).toBe(1);
  });

  it('consulta la agenda de doctor', () => {
    appointments.doctorSchedule().subscribe();
    const request = requests.expectOne('/api/v1/appointments/doctor/me');
    expect(request.request.method).toBe('GET');
    request.flush([example]);
  });

  it('cancela una cita existente con PATCH', () => {
    let status = '';
    appointments.cancel(example.id).subscribe(data => status = data.status);
    const request = requests.expectOne(`/api/v1/appointments/${example.id}/cancel`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ ...example, status: 'CANCELLED' });
    expect(status).toBe('CANCELLED');
  });
});
