import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ClinicalNoteView {
  id: string;
  appointmentId: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export type MedicationValidation = 'VALIDATED' | 'NOT_FOUND' | 'SERVICE_UNAVAILABLE' | 'UNKNOWN' | string;

export interface PrescriptionLine {
  medication: string;
  dosage: string;
  frequency: string;
  validationStatus: MedicationValidation;
}

export interface PrescriptionView {
  id: string;
  appointmentId: string;
  createdBy: string;
  createdAt: string;
  items: PrescriptionLine[];
}

export interface PrescriptionInput {
  medication: string;
  dosage: string;
  frequency: string;
}

@Injectable({ providedIn: 'root' })
export class ClinicalApiService {
  private readonly http = inject(HttpClient);

  patientNotes() {
    return this.http.get<ClinicalNoteView[]>('/api/v1/clinical-notes/me');
  }

  addNote(appointmentId: string, content: string) {
    return this.http.post<ClinicalNoteView>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/clinical-notes`,
      { content }
    );
  }

  patientPrescriptions() {
    return this.http.get<PrescriptionView[]>('/api/v1/prescriptions/me');
  }

  addPrescription(appointmentId: string, items: PrescriptionInput[]) {
    return this.http.post<PrescriptionView>(
      `/api/v1/appointments/${encodeURIComponent(appointmentId)}/prescriptions`,
      { items }
    );
  }
}
