import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type AppointmentStatus = 'SCHEDULED' | 'CANCELLED';

export interface AppointmentView {
  id: string;
  doctorId: string;
  officeId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
}

export interface CreateAppointmentRequest {
  doctorId: string;
  officeId: string;
  startTime: string;
  endTime: string;
}

@Injectable({ providedIn: 'root' })
export class AppointmentApiService {
  private readonly http = inject(HttpClient);

  create(request: CreateAppointmentRequest) {
    return this.http.post<AppointmentView>('/api/v1/appointments', request);
  }

  mine() {
    return this.http.get<AppointmentView[]>('/api/v1/appointments/me');
  }

  doctorSchedule() {
    return this.http.get<AppointmentView[]>('/api/v1/appointments/doctor/me');
  }

  cancel(appointmentId: string) {
    return this.http.patch<AppointmentView>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/cancel`,
      {}
    );
  }
}
