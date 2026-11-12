import { Component, DestroyRef, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminApiService } from '../../core/admin-api.service';
import { CatalogService, type DoctorView, type OfficeView, type SpecialtyView } from '../../core/catalog.service';

@Component({
  selector: 'app-admin-page',
  imports: [FormsModule],
  templateUrl: './admin-page.html'
})
export class AdminPage implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly catalog = inject(CatalogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly view = input.required<'resumen' | 'profesionales' | 'consultorios' | 'reportes'>();
  readonly doctors = signal<DoctorView[]>([]);
  readonly offices = signal<OfficeView[]>([]);
  readonly activeOfficesCount = computed(() => this.offices().filter(o => o.active).length);
  readonly specialties = signal<SpecialtyView[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');

  officeName = '';
  officeAddress = '';
  roomNumber = '';
  officeActive = true;

  firstName = '';
  lastName = '';
  email = '';
  temporaryPassword = '';
  medicalLicense = '';
  specialtyId = '';

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      doctors: this.catalog.doctors(),
      offices: this.catalog.offices(),
      specialties: this.catalog.specialties()
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({
        next: data => {
          this.doctors.set(data.doctors);
          this.offices.set(data.offices);
          this.specialties.set(data.specialties);
          if (!data.specialties.some(s => s.id === this.specialtyId)) {
            this.specialtyId = data.specialties[0]?.id ?? '';
          }
        },
        error: () => this.error.set('No fue posible cargar los catálogos del administrador.')
      });
  }

  createOffice(): void {
    if (this.busy()) return;
    if (!this.officeName.trim() || !this.officeAddress.trim() || !this.roomNumber.trim()) {
      this.error.set('Completa el nombre, dirección y número del consultorio.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api.createOffice({
      name: this.officeName.trim(), address: this.officeAddress.trim(),
      roomNumber: this.roomNumber.trim(), active: this.officeActive
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({
        next: result => {
          this.officeName = '';
          this.officeAddress = '';
          this.roomNumber = '';
          this.success.set('Consultorio registrado en PostgreSQL. ID: ' + result.id);
          this.reload();
        },
        error: error => this.error.set(this.toMessage(error))
      });
  }

  createDoctor(): void {
    if (this.busy()) return;
    if (!this.firstName.trim() || !this.lastName.trim() || !this.email.trim() ||
        this.temporaryPassword.length < 8 || !this.medicalLicense.trim() || !this.specialtyId) {
      this.error.set('Completa los campos del médico. Contraseña temporal: mínimo 8 caracteres.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    this.api.createDoctor({
      firstName: this.firstName.trim(), lastName: this.lastName.trim(), email: this.email.trim(),
      temporaryPassword: this.temporaryPassword, medicalLicense: this.medicalLicense.trim(),
      specialtyId: this.specialtyId
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({
        next: result => {
          this.temporaryPassword = '';
          this.medicalLicense = '';
          this.email = '';
          this.firstName = '';
          this.lastName = '';
          this.success.set('Médico registrado en PostgreSQL. ID: ' + result.id);
          this.reload();
        },
        error: error => this.error.set(this.toMessage(error))
      });
  }

  private toMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) return 'Esta operación requiere una cuenta con rol ADMIN.';
      if (error.status === 409) return 'Ya existe ese correo o registro médico.';
      if (error.status === 400) return 'Los datos enviados no son válidos.';
    }
    return 'No se pudo guardar. Revisa la conexión con Spring Boot.';
  }
}
