import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface DoctorView {
  id: string;
  firstName: string;
  lastName: string;
  specialtyId: string;
  specialtyName: string;
}

export interface SpecialtyView {
  id: string;
  name: string;
}

export interface OfficeView {
  id: string;
  name: string;
  address: string;
  roomNumber: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  doctors() {
    return this.http.get<DoctorView[]>('/api/v1/doctors');
  }

  specialties() {
    return this.http.get<SpecialtyView[]>('/api/v1/specialties');
  }

  offices() {
    return this.http.get<OfficeView[]>('/api/v1/offices');
  }
}
