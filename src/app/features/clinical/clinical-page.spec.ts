import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicalApiService } from '../../core/clinical-api.service';
import { ClinicalPage } from './clinical-page';

describe('ClinicalPage — notas y recetas de demostración', () => {
  const appointment = {
    id: 'appointment-1', doctorId: 'doctor-1', officeId: 'office-1',
    startTime: '2026-12-12T14:00:00Z', endTime: '2026-12-12T14:30:00Z',
    status: 'SCHEDULED' as const
  };
  const note = {
    id: 'note-1', appointmentId: appointment.id, content: 'Nota ficticia',
    createdBy: 'doctor@example.test', createdAt: '2026-11-12T12:00:00Z'
  };
  const prescription = {
    id: 'prescription-1', appointmentId: appointment.id,
    createdBy: 'doctor@example.test', createdAt: '2026-11-12T12:00:00Z',
    items: [{ medication: 'Ficticio', dosage: '1 unidad', frequency: 'diario', validationStatus: 'UNKNOWN' }]
  };
  let api: {
    patientNotes: ReturnType<typeof vi.fn>;
    patientPrescriptions: ReturnType<typeof vi.fn>;
    addNote: ReturnType<typeof vi.fn>;
    addPrescription: ReturnType<typeof vi.fn>;
  };
  let fixture: ComponentFixture<ClinicalPage>;
  let page: ClinicalPage;

  beforeEach(async () => {
    api = {
      patientNotes: vi.fn(() => of([note])),
      patientPrescriptions: vi.fn(() => of([prescription])),
      addNote: vi.fn(() => of(note)),
      addPrescription: vi.fn(() => of(prescription))
    };
    await TestBed.configureTestingModule({
      imports: [ClinicalPage],
      providers: [{ provide: ClinicalApiService, useValue: api }]
    }).compileComponents();
    fixture = TestBed.createComponent(ClinicalPage);
    page = fixture.componentInstance;
  });

  function setup(role: 'paciente' | 'medico', kind: 'notas' | 'recetas') {
    fixture.componentRef.setInput('role', role);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('appointments', [appointment]);
    fixture.detectChanges();
  }

  it('un paciente consulta exclusivamente sus notas por el endpoint de su sesión', () => {
    setup('paciente', 'notas');
    expect(api.patientNotes).toHaveBeenCalled();
    expect(page.notes()).toEqual([note]);
    expect(page.loading()).toBe(false);
  });

  it('un paciente consulta sus recetas sin pedir notas', () => {
    setup('paciente', 'recetas');
    expect(api.patientPrescriptions).toHaveBeenCalled();
    expect(page.prescriptions()).toEqual([prescription]);
  });

  it('traduce error HTTP 403 de lectura clínica para el paciente', () => {
    api.patientNotes.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    setup('paciente', 'notas');
    expect(page.error()).toContain('paciente titular');
    expect(page.loading()).toBe(false);
  });

  it('el médico no puede leer datos usando endpoints de paciente', () => {
    setup('medico', 'notas');
    page.reload();
    expect(api.patientNotes).not.toHaveBeenCalled();
    expect(api.patientPrescriptions).not.toHaveBeenCalled();
  });

  it('el médico no puede guardar una nota sin cita vigente', () => {
    setup('medico', 'notas');
    page.content = 'Nota ficticia';
    page.submit();
    expect(page.error()).toContain('cita vigente');
    expect(api.addNote).not.toHaveBeenCalled();
  });

  it('rechaza nota vacía o superior a diez mil caracteres', () => {
    setup('medico', 'notas');
    page.appointmentId = appointment.id;
    page.content = ' ';
    page.submit();
    expect(page.error()).toContain('10.000');
    page.content = 'a'.repeat(10001);
    page.submit();
    expect(page.error()).toContain('10.000');
    expect(api.addNote).not.toHaveBeenCalled();
  });

  it('guarda notas saneadas y limpia el formulario', () => {
    setup('medico', 'notas');
    page.appointmentId = appointment.id;
    page.content = ' Nota ficticia ';
    page.submit();
    expect(api.addNote).toHaveBeenCalledWith(appointment.id, 'Nota ficticia');
    expect(page.createdNotes()).toEqual([note]);
    expect(page.content).toBe('');
    expect(page.message()).toContain('MongoDB');
    expect(page.busy()).toBe(false);
  });

  it('rechaza recetas sin campos completos', () => {
    setup('medico', 'recetas');
    page.appointmentId = appointment.id;
    page.medication = 'Ficticio';
    page.submit();
    expect(page.error()).toContain('medicamento');
    expect(api.addPrescription).not.toHaveBeenCalled();
  });

  it('registra una receta con campos limpios y informa resultado', () => {
    setup('medico', 'recetas');
    page.appointmentId = appointment.id;
    page.medication = ' Ficticio ';
    page.dosage = ' 1 unidad ';
    page.frequency = ' diario ';
    page.submit();
    expect(api.addPrescription).toHaveBeenCalledWith(appointment.id, [{
      medication: 'Ficticio', dosage: '1 unidad', frequency: 'diario'
    }]);
    expect(page.createdPrescriptions()).toEqual([prescription]);
    expect(page.medication).toBe('');
    expect(page.message()).toContain('PostgreSQL');
  });

  it('distingue errores de permisos, cita inválida, inexistente y servidor', () => {
    setup('medico', 'notas');
    page.appointmentId = appointment.id;
    page.content = 'Nota ficticia';
    for (const [status, text] of [
      [403, 'médico asignado'], [400, 'cancelada'], [404, 'no existe'], [500, 'Docker']
    ] as const) {
      api.addNote.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      page.submit();
      expect(page.error()).toContain(text);
      expect(page.busy()).toBe(false);
    }
  });
});
