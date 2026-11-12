import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface CreateOffice {
  name: string;
  address: string;
  roomNumber: string;
  active: boolean;
}

export interface CreateDoctor {
  email: string;
  temporaryPassword: string;
  firstName: string;
  lastName: string;
  medicalLicense: string;
  specialtyId: string;
}

interface CreatedId {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  createOffice(body: CreateOffice) {
    return this.http.post<CreatedId>('/api/v1/admin/offices', body);
  }

  createDoctor(body: CreateDoctor) {
    return this.http.post<CreatedId>('/api/v1/admin/doctors', body);
  }
}
