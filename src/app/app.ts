import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, type UserRole } from './core/auth.service';
import { AuthPage } from './auth/auth-page';

type Role = 'paciente' | 'medico' | 'admin';
type Section =
  | 'resumen' | 'medicos' | 'citas' | 'reservar' | 'historia' | 'recetas'
  | 'agenda' | 'pacientes' | 'profesionales' | 'consultorios' | 'reportes';

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
  imports: [FormsModule, AuthPage],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly auth = inject(AuthService);
  readonly demoMode = signal(false);

  constructor() {
    effect(() => {
      const session = this.auth.user();
      if (session) {
        this.demoMode.set(false);
        this.role.set(this.mapRole(session.role));
        this.section.set('resumen');
        this.mobileMenuOpen.set(false);
        this.notice.set('');
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

  readonly menu = computed(() =>
    this.role() === 'paciente' ? this.patientMenu : this.role() === 'medico' ? this.doctorMenu : this.adminMenu
  );
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
    this.demoMode.set(true);
    this.role.set('paciente');
    this.section.set('resumen');
    this.notice.set('');
  }

  leaveWorkspace(): void {
    this.auth.logout();
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

  goTo(section: Section): void {
    this.section.set(section);
    this.mobileMenuOpen.set(false);
    this.notice.set('');
  }

  openBooking(doctorId = 'laura'): void {
    this.bookingDoctorId.set(doctorId);
    this.goTo('reservar');
  }

  confirmBooking(): void {
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

  getPageTitle(): string {
    const titles: Record<Section, string> = {
      resumen: 'Resumen', medicos: 'Encuentra especialistas', citas: 'Mis citas',
      reservar: 'Reservar una cita', historia: this.role() === 'medico' ? 'Notas clínicas' : 'Historia clínica',
      recetas: this.role() === 'medico' ? 'Prescripciones' : 'Mis recetas',
      agenda: 'Mi agenda', pacientes: 'Mis pacientes', profesionales: 'Profesionales',
      consultorios: 'Consultorios', reportes: 'Reportes'
    };
    return titles[this.section()];
  }

  private daysFromNow(days: number): string {
    return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  }
}
