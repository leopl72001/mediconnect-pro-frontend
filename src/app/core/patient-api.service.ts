import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface PatientProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  phone: string | null;
  address: string | null;
}

export interface PatientProfileUpdate {
  birthDate: string | null;
  phone: string;
  address: string;
}

@Injectable({ providedIn: 'root' })
export class PatientApiService {
  private readonly http = inject(HttpClient);

  mine() {
    return this.http.get<PatientProfile>('/api/v1/patients/me');
  }

  update(details: PatientProfileUpdate) {
    return this.http.put<PatientProfile>('/api/v1/patients/me', details);
  }
}
