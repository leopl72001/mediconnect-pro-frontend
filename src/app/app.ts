import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AuthService, type UserRole } from './core/auth.service';
import { AuthPage } from './auth/auth-page';
import { CatalogService, type DoctorView, type OfficeView } from './core/catalog.service';
import { AppointmentApiService, type AppointmentView } from './core/appointment-api.service';
import { HttpErrorResponse } from '@angular/common/http';
import { PatientProfilePage } from './features/profile/patient-profile';
import { ClinicalPage } from './features/clinical/clinical-page';
import { AdminPage } from './features/admin/admin-page';

type Role = 'paciente' | 'medico' | 'admin';
type Section =
  | 'resumen' | 'medicos' | 'citas' | 'reservar' | 'historia' | 'recetas'
  | 'agenda' | 'pacientes' | 'profesionales' | 'consultorios' | 'reportes' | 'perfil';

interface MenuItem {
  id: Section;
  label: string;
  icon: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  initials: string;
  experience: string;
  rating: string;
  next: string;
  gradient: string;
}

interface Appointment {
  id: number;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: 'Confirmada' | 'Cancelada' | 'Completada';
  patient: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, AuthPage, PatientProfilePage, ClinicalPage, AdminPage],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly demoMode = signal(false);
  readonly realDoctors = signal<DoctorView[]>([]);
  readonly catalogLoading = signal(false);
  readonly catalogError = signal('');
  readonly realOffices = signal<OfficeView[]>([]);
  readonly officesLoading = signal(false);
  readonly officesError = signal('');
  readonly bookingOfficeId = signal('');
  readonly realAppointments = signal<AppointmentView[]>([]);
  readonly appointmentsLoading = signal(false);
  readonly appointmentsError = signal('');
  readonly appointmentBusy = signal(false);
  readonly appointmentError = signal('');
  readonly realSelectedDoctor = computed(() =>
    this.realDoctors().find(doctor => doctor.id === this.bookingDoctorId()) ?? null
  );
  readonly realSelectedOffice = computed(() =>
    this.realOffices().find(office => office.id === this.bookingOfficeId()) ?? null
  );
  readonly realUpcomingAppointments = computed(() => this.realAppointments().filter(a =>
    a.status === 'SCHEDULED' && new Date(a.startTime).getTime() > Date.now()
  ));
  readonly selectedRealDoctorName = computed(() => {
    const doctor = this.realSelectedDoctor();
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Sin seleccionar';
  });
  readonly realFilteredDoctors = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('es');
    const specialty = this.specialty();
    return this.realDoctors().filter(doctor => {
      const name = `${doctor.firstName} ${doctor.lastName}`.toLocaleLowerCase('es');
      return (specialty === 'Todas' || doctor.specialtyName === specialty) &&
        (name.includes(query) || doctor.specialtyName.toLocaleLowerCase('es').includes(query));
    });
  });
  readonly availableSpecialties = computed(() => {
    return this.demoMode()
      ? this.specialties
      : ['Todas', ...new Set(this.realDoctors().map(d => d.specialtyName))];
  });

  constructor() {
    effect(() => {
      const session = this.auth.user();
      if (session) {
        this.demoMode.set(false);
        this.role.set(this.mapRole(session.role));
        this.section.set('resumen');
        this.mobileMenuOpen.set(false);
        this.notice.set('');
        this.loadRealDoctors();
        this.loadOffices();
        this.loadRealAppointments();
      } else {
        this.realDoctors.set([]);
        this.catalogError.set('');
        this.realOffices.set([]);
        this.realAppointments.set([]);
      }
    });
  }

  readonly role = signal<Role>('paciente');
  readonly section = signal<Section>('resumen');
  readonly mobileMenuOpen = signal(false);
  readonly search = signal('');
  readonly specialty = signal('Todas');
  readonly notice = signal('');
  readonly bookingDoctorId = signal('laura');
  readonly bookingTime = signal('09:00');
  readonly minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  readonly bookingDate = signal(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10));
  readonly today = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());

  readonly doctors: Doctor[] = [
    { id: 'laura', name: 'Dra. Laura Gómez', specialty: 'Medicina general', initials: 'LG', experience: '8 años de experiencia', rating: '4.9', next: 'Hoy, 3:30 p. m.', gradient: 'linear-gradient(140deg,#f8dbc5,#e8ad87)' },
    { id: 'andres', name: 'Dr. Andrés Rodríguez', specialty: 'Cardiología', initials: 'AR', experience: '12 años de experiencia', rating: '4.8', next: 'Mañana, 10:00 a. m.', gradient: 'linear-gradient(140deg,#d2e9f5,#91b7d5)' },
    { id: 'valentina', name: 'Dra. Valentina Ruiz', specialty: 'Pediatría', initials: 'VR', experience: '6 años de experiencia', rating: '5.0', next: 'Jueves, 9:00 a. m.', gradient: 'linear-gradient(140deg,#eadcf3,#b7a0d2)' },
    { id: 'camilo', name: 'Dr. Camilo Torres', specialty: 'Medicina general', initials: 'CT', experience: '10 años de experiencia', rating: '4.9', next: 'Viernes, 2:00 p. m.', gradient: 'linear-gradient(140deg,#d2eee3,#8bcab3)' }
  ];

  readonly patients = [
    { initials: 'CP', name: 'Carlos Pérez', reason: 'Consulta general', time: '08:30', state: 'Confirmada' },
    { initials: 'AM', name: 'Ana Martínez', reason: 'Control preventivo', time: '09:15', state: 'En espera' },
    { initials: 'JR', name: 'Juan Ramírez', reason: 'Seguimiento', time: '11:00', state: 'Confirmada' }
  ];

  readonly timeSlots = ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '15:30'];
  readonly specialties = ['Todas', 'Medicina general', 'Cardiología', 'Pediatría'];

  readonly appointments = signal<Appointment[]>([
    { id: 1, doctor: 'Dra. Laura Gómez', specialty: 'Medicina general', date: this.daysFromNow(3), time: '09:30', status: 'Confirmada', patient: 'Carlos Pérez' },
    { id: 2, doctor: 'Dr. Andrés Rodríguez', specialty: 'Cardiología', date: this.daysFromNow(-14), time: '11:00', status: 'Completada', patient: 'Carlos Pérez' }
  ]);

  readonly patientMenu: MenuItem[] = [
    { id: 'resumen', label: 'Resumen', icon: '◫' },
    { id: 'medicos', label: 'Especialistas', icon: '♡' },
    { id: 'citas', label: 'Mis citas', icon: '▦' },
    { id: 'historia', label: 'Historia clínica', icon: '▤' },
    { id: 'recetas', label: 'Mis recetas', icon: '✚' }
  ];
  readonly doctorMenu: MenuItem[] = [
    { id: 'resumen', label: 'Resumen', icon: '◫' },
    { id: 'agenda', label: 'Mi agenda', icon: '▦' },
    { id: 'pacientes', label: 'Pacientes', icon: '♧' },
    { id: 'historia', label: 'Notas clínicas', icon: '▤' },
    { id: 'recetas', label: 'Prescripciones', icon: '✚' }
  ];
  readonly adminMenu: MenuItem[] = [
    { id: 'resumen', label: 'Resumen', icon: '◫' },
    { id: 'profesionales', label: 'Profesionales', icon: '♡' },
    { id: 'consultorios', label: 'Consultorios', icon: '▦' },
    { id: 'reportes', label: 'Reportes', icon: '▥' }
  ];

  readonly menu = computed<MenuItem[]>(() => {
    if (this.role() === 'paciente') {
      return this.demoMode() ? this.patientMenu : [
        ...this.patientMenu, { id: 'perfil', label: 'Mi perfil', icon: '♙' }
      ];
    }
    return this.role() === 'medico' ? this.doctorMenu : this.adminMenu;
  });
  readonly roleLabel = computed(() =>
    this.role() === 'paciente' ? 'Paciente' : this.role() === 'medico' ? 'Médico' : 'Administrador'
  );
  readonly filteredDoctors = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('es');
    return this.doctors.filter(d =>
      (this.specialty() === 'Todas' || d.specialty === this.specialty()) &&
      (d.name.toLocaleLowerCase('es').includes(query) || d.specialty.toLocaleLowerCase('es').includes(query))
    );
  });
  readonly selectedDoctor = computed(() => this.doctors.find(d => d.id === this.bookingDoctorId()) ?? this.doctors[0]);
  readonly upcomingAppointments = computed(() => this.appointments().filter(a => a.status === 'Confirmada'));
  readonly appointmentCount = computed(() => this.upcomingAppointments().length);

  enterDemo(): void {
    this.auth.logout();
    this.demoMode.set(true);
    this.role.set('paciente');
    this.section.set('resumen');
    this.notice.set('');
  }

  leaveWorkspace(): void {
    this.auth.logout();
    this.realDoctors.set([]);
    this.realOffices.set([]);
    this.realAppointments.set([]);
    this.catalogError.set('');
    this.officesError.set('');
    this.appointmentsError.set('');
    this.demoMode.set(false);
    this.role.set('paciente');
    this.section.set('resumen');
    this.notice.set('');
  }

  private mapRole(role: UserRole): Role {
    return role === 'ROLE_ADMIN' ? 'admin' : role === 'ROLE_DOCTOR' ? 'medico' : 'paciente';
  }

  setRole(role: Role): void {
    // Cambiar de rol visualmente solo es posible en modo demostración.
    if (!this.demoMode()) return;
    this.role.set(role);
    this.section.set('resumen');
    this.mobileMenuOpen.set(false);
    this.notice.set('');
  }

  loadRealDoctors(): void {
    if (!this.auth.authenticated() || this.demoMode()) return;
    this.catalogLoading.set(true);
    this.catalogError.set('');
    this.catalog.doctors()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.catalogLoading.set(false))
      )
      .subscribe({
        next: doctors => {
          if (this.auth.authenticated()) this.realDoctors.set(doctors);
        },
        error: () => {
          this.catalogError.set('No pudimos cargar los especialistas. Verifica la conexión al backend.');
        }
      });
  }

  loadOffices(): void {
    if (!this.auth.authenticated() || this.demoMode()) return;
    this.officesLoading.set(true);
    this.officesError.set('');
    this.catalog.offices().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.officesLoading.set(false))
    ).subscribe({
      next: offices => {
        if (!this.auth.authenticated()) return;
        const active = offices.filter(office => office.active);
        this.realOffices.set(active);
        if (!active.some(office => office.id === this.bookingOfficeId())) {
          this.bookingOfficeId.set(active[0]?.id ?? '');
        }
      },
      error: () => this.officesError.set('No pudimos obtener los consultorios. Reintenta la consulta.')
    });
  }

  loadRealAppointments(): void {
    if (!this.auth.authenticated() || this.demoMode() || this.role() === 'admin') return;
    this.appointmentsLoading.set(true);
    this.appointmentsError.set('');
    const request = this.role() === 'medico'
      ? this.appointmentApi.doctorSchedule()
      : this.appointmentApi.mine();
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.appointmentsLoading.set(false))
    ).subscribe({
      next: appointments => {
        if (this.auth.authenticated()) this.realAppointments.set(appointments);
      },
      error: () => this.appointmentsError.set('No se pudo consultar la agenda. Verifica tu sesión y la API.')
    });
  }

  realAppointmentDoctor(appointment: AppointmentView): string {
    const doctor = this.realDoctors().find(d => d.id === appointment.doctorId);
    return doctor ? `${doctor.firstName} ${doctor.lastName}` : 'Profesional registrado';
  }

  realAppointmentOffice(appointment: AppointmentView): string {
    const office = this.realOffices().find(o => o.id === appointment.officeId);
    return office?.name ?? 'Consultorio';
  }

  realAppointmentDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota'
    }).format(new Date(iso));
  }

  cancelRealAppointment(appointment: AppointmentView): void {
    if (this.demoMode() || this.role() !== 'paciente' ||
        appointment.status !== 'SCHEDULED' || this.appointmentBusy()) return;
    if (new Date(appointment.startTime).getTime() - Date.now() <= 86400000) {
      this.notice.set('El backend solo permite cancelar con más de 24 horas de anticipación.');
      return;
    }
    this.appointmentBusy.set(true);
    this.appointmentApi.cancel(appointment.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.appointmentBusy.set(false))
    ).subscribe({
      next: result => {
        this.realAppointments.update(items => items.map(a => a.id === result.id ? result : a));
        this.notice.set('Cita real cancelada correctamente en Spring Boot.');
      },
      error: (error: HttpErrorResponse) =>
        this.notice.set(error.status === 400
          ? 'No se puede cancelar esta cita: revisa la política de 24 horas.'
          : 'No pudimos cancelar la cita. Actualiza el listado e inténtalo de nuevo.')
    });
  }

  confirmRealBooking(): void {
    if (this.demoMode() || this.role() !== 'paciente' || this.appointmentBusy()) return;
    this.appointmentError.set('');
    const doctorId = this.bookingDoctorId();
    const officeId = this.bookingOfficeId();
    const date = this.bookingDate();
    const time = this.bookingTime();
    if (!this.realDoctors().some(d => d.id === doctorId) ||
        !this.realOffices().some(o => o.id === officeId) || !date || !time) {
      this.appointmentError.set('Selecciona un profesional, un consultorio activo, fecha y hora.');
      return;
    }
    // La plataforma atiende en Colombia: los horarios de formulario son UTC-05:00.
    const start = new Date(`${date}T${time}:00-05:00`);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      this.appointmentError.set('Selecciona una fecha y hora futuras, en horario de Colombia.');
      return;
    }
    const end = new Date(start.getTime() + 30 * 60000);
    this.appointmentBusy.set(true);
    this.appointmentApi.create({
      doctorId, officeId, startTime: start.toISOString(), endTime: end.toISOString()
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.appointmentBusy.set(false))
    ).subscribe({
      next: appointment => {
        this.realAppointments.update(items => [appointment, ...items]);
        this.goTo('citas');
        this.notice.set('¡Cita real registrada correctamente en PostgreSQL!');
        this.loadRealAppointments();
      },
      error: (error: HttpErrorResponse) => {
        this.appointmentError.set(error.status === 409
          ? 'El médico ya tiene una cita en ese horario. Selecciona otra hora.'
          : error.status === 400
            ? 'La fecha o el consultorio no son válidos. Revisa los datos.'
            : error.status === 401 || error.status === 403
              ? 'Tu sesión no permite reservar citas. Inicia sesión como paciente.'
              : 'No pudimos registrar la cita. Comprueba la conexión con Spring Boot.');
      }
    });
  }

    goTo(section: Section): void {
    this.section.set(section);
    this.mobileMenuOpen.set(false);
    this.notice.set('');
  }

  openBooking(doctorId = 'laura'): void {
    if (!this.demoMode()) {
      if (this.role() !== 'paciente') {
        this.notice.set('Solo los pacientes pueden solicitar nuevas citas.');
        return;
      }
      const selected = this.realDoctors().find(d => d.id === doctorId) ?? this.realDoctors()[0];
      if (!selected) {
        this.goTo('medicos');
        this.notice.set('No hay médicos registrados para realizar la reserva.');
        return;
      }
      this.bookingDoctorId.set(selected.id);
      if (!this.realOffices().length) this.loadOffices();
      this.appointmentError.set('');
      this.goTo('reservar');
      return;
    }
    this.bookingDoctorId.set(doctorId);
    this.goTo('reservar');
  }

  confirmBooking(): void {
    if (!this.demoMode()) return;
    if (!this.bookingDate() || !this.bookingTime()) {
      this.notice.set('Selecciona una fecha y una hora.');
      return;
    }
    const date = this.bookingDate();
    const time = this.bookingTime();
    const doctor = this.selectedDoctor();
    this.appointments.update(current => [
      { id: Date.now(), doctor: doctor.name, specialty: doctor.specialty, date, time, status: 'Confirmada', patient: 'Carlos Pérez' },
      ...current
    ]);
    this.goTo('citas');
    this.notice.set('Cita de demostración agregada correctamente. No se envió al servidor.');
  }

  cancelAppointment(id: number): void {
    if (!this.demoMode()) return;
    this.appointments.update(items => items.map(item =>
      item.id === id && item.status === 'Confirmada' ? { ...item, status: 'Cancelada' } : item
    ));
    this.notice.set('Cita cancelada en la demostración. No se modificó el backend.');
  }

  dateLabel(date: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(date + 'T12:00:00'));
  }

  adminView(): 'resumen' | 'profesionales' | 'consultorios' | 'reportes' {
    const current = this.section();
    return current === 'profesionales' || current === 'consultorios' || current === 'reportes'
      ? current : 'resumen';
  }

  clinicalKind(): 'notas' | 'recetas' {
    return this.section() === 'recetas' ? 'recetas' : 'notas';
  }

  clinicalRole(): 'paciente' | 'medico' {
    return this.role() === 'medico' ? 'medico' : 'paciente';
  }

    getPageTitle(): string {
    const titles: Record<Section, string> = {
      resumen: 'Resumen', medicos: 'Encuentra especialistas', citas: 'Mis citas',
      reservar: 'Reservar una cita', historia: this.role() === 'medico' ? 'Notas clínicas' : 'Historia clínica',
      recetas: this.role() === 'medico' ? 'Prescripciones' : 'Mis recetas',
      agenda: 'Mi agenda', pacientes: 'Mis pacientes', profesionales: 'Profesionales',
      consultorios: 'Consultorios', reportes: 'Reportes', perfil: 'Mi perfil'
    };
    return titles[this.section()];
  }

  private daysFromNow(days: number): string {
    return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  }
}
