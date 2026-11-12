import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PatientApiService, type PatientProfile } from '../../core/patient-api.service';

@Component({
  selector: 'app-patient-profile',
  imports: [FormsModule],
  templateUrl: './patient-profile.html'
})
export class PatientProfilePage implements OnInit {
  private readonly api = inject(PatientApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly profile = signal<PatientProfile | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly today = new Date().toISOString().slice(0, 10);

  birthDate = '';
  phone = '';
  address = '';

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.mine().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: profile => {
          this.profile.set(profile);
          this.birthDate = profile.birthDate ?? '';
          this.phone = profile.phone ?? '';
          this.address = profile.address ?? '';
        },
        error: () => this.error.set('No se pudo consultar tu perfil. Revisa la sesión o la API.')
      });
  }

  save(): void {
    if (this.busy() || !this.profile()) return;
    if (this.birthDate && this.birthDate >= this.today) {
      this.error.set('La fecha de nacimiento debe ser anterior a hoy.');
      return;
    }
    this.error.set('');
    this.message.set('');
    this.busy.set(true);
    this.api.update({
      birthDate: this.birthDate || null,
      phone: this.phone.trim(),
      address: this.address.trim()
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({
        next: profile => {
          this.profile.set(profile);
          this.message.set('Perfil actualizado y guardado en PostgreSQL.');
        },
        error: () => this.error.set('No fue posible guardar el perfil. Comprueba los campos.')
      });
  }
}
