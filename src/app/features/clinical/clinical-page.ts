import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ClinicalApiService, type ClinicalNoteView, type PrescriptionView } from '../../core/clinical-api.service';
import type { AppointmentView } from '../../core/appointment-api.service';

@Component({
  selector: 'app-clinical-page',
  imports: [FormsModule],
  templateUrl: './clinical-page.html'
})
export class ClinicalPage {
  private readonly api = inject(ClinicalApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly role = input.required<'paciente' | 'medico'>();
  readonly kind = input.required<'notas' | 'recetas'>();
  readonly appointments = input<AppointmentView[]>([]);
  readonly notes = signal<ClinicalNoteView[]>([]);
  readonly prescriptions = signal<PrescriptionView[]>([]);
  readonly createdNotes = signal<ClinicalNoteView[]>([]);
  readonly createdPrescriptions = signal<PrescriptionView[]>([]);
  readonly busy = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  appointmentId = '';
  content = '';
  medication = '';
  dosage = '';
  frequency = '';

  constructor() {
    effect(() => {
      const role = this.role();
      const kind = this.kind();
      if (role === 'paciente') this.reload(kind);
      else { this.error.set(''); this.message.set(''); }
    });
  }

  reload(kind = this.kind()): void {
    if (this.role() !== 'paciente') return;
    this.loading.set(true);
    this.error.set('');
    const request = kind === 'notas'
      ? this.api.patientNotes()
      : this.api.patientPrescriptions();
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: data => {
        if (kind === 'notas') this.notes.set(data as ClinicalNoteView[]);
        else this.prescriptions.set(data as PrescriptionView[]);
      },
      error: (error: HttpErrorResponse) =>
        this.error.set(error.status === 403
          ? 'Solo el paciente titular puede ver sus registros.'
          : 'No se pudo consultar el historial clínico. Revisa el backend.')
    });
  }

  submit(): void {
    if (this.role() !== 'medico' || this.busy()) return;
    this.error.set('');
    this.message.set('');
    if (!this.appointmentId || !this.appointments().some(a =>
        a.id === this.appointmentId && a.status !== 'CANCELLED')) {
      this.error.set('Selecciona una cita vigente asignada a tu agenda.');
      return;
    }
    if (this.kind() === 'notas') {
      if (!this.content.trim() || this.content.length > 10000) {
        this.error.set('Escribe una nota clínica de entre 1 y 10.000 caracteres.');
        return;
      }
      this.busy.set(true);
      this.api.addNote(this.appointmentId, this.content.trim()).pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false))
      ).subscribe({
        next: note => {
          this.createdNotes.update(items => [note, ...items]);
          this.content = '';
          this.message.set('Nota de prueba guardada correctamente en MongoDB.');
        },
        error: err => this.error.set(this.requestError(err))
      });
      return;
    }
    if (!this.medication.trim() || !this.dosage.trim() || !this.frequency.trim()) {
      this.error.set('Completa medicamento, dosificación y frecuencia.');
      return;
    }
    this.busy.set(true);
    this.api.addPrescription(this.appointmentId, [{
      medication: this.medication.trim(),
      dosage: this.dosage.trim(),
      frequency: this.frequency.trim()
    }]).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false))
    ).subscribe({
      next: prescription => {
        this.createdPrescriptions.update(items => [prescription, ...items]);
        this.medication = '';
        this.dosage = '';
        this.frequency = '';
        this.message.set('Prescripción de prueba registrada en PostgreSQL. Consulta el resultado OpenFDA.');
      },
      error: err => this.error.set(this.requestError(err))
    });
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(iso));
  }

  private requestError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) return 'Solo el médico asignado a la cita puede registrar esta información.';
      if (error.status === 400) return 'Solicitud inválida o cita cancelada. Revisa los datos.';
      if (error.status === 404) return 'La cita seleccionada no existe.';
    }
    return 'No fue posible guardar los datos. Revisa Docker y la conexión.';
  }
}
