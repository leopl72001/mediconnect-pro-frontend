import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApiService } from '../../core/admin-api.service';
import { CatalogService } from '../../core/catalog.service';
import { AdminPage } from './admin-page';

describe('AdminPage — administración autorizada', () => {
  let fixture: ComponentFixture<AdminPage>;
  let page: AdminPage;
  let api: { createOffice: ReturnType<typeof vi.fn>; createDoctor: ReturnType<typeof vi.fn> };
  let catalog: {
    doctors: ReturnType<typeof vi.fn>; offices: ReturnType<typeof vi.fn>;
    specialties: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      createOffice: vi.fn(() => of({ id: 'office-1' })),
      createDoctor: vi.fn(() => of({ id: 'doctor-1' }))
    };
    catalog = {
      doctors: vi.fn(() => of([])),
      offices: vi.fn(() => of([])),
      specialties: vi.fn(() => of([{ id: 'spec-1', name: 'Medicina general' }]))
    };
    await TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [
        { provide: AdminApiService, useValue: api },
        { provide: CatalogService, useValue: catalog }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(AdminPage);
    fixture.componentRef.setInput('view', 'resumen');
    page = fixture.componentInstance;
  });

  it('carga catálogos y selecciona especialidad inicial', () => {
    catalog.offices.mockReturnValue(of([
      { id: 'o1', name: 'Uno', address: 'Ficticia', roomNumber: '1', active: true },
      { id: 'o2', name: 'Dos', address: 'Ficticia', roomNumber: '2', active: false }
    ]));
    page.reload();
    expect(page.loading()).toBe(false);
    expect(page.specialtyId).toBe('spec-1');
    expect(page.activeOfficesCount()).toBe(1);
  });

  it('muestra error de carga cuando falla cualquier catálogo', () => {
    catalog.doctors.mockReturnValue(throwError(() => new Error('demo')));
    page.reload();
    expect(page.loading()).toBe(false);
    expect(page.error()).toContain('catálogos');
  });

  it('rechaza un consultorio incompleto sin usar la API', () => {
    page.officeName = ' ';
    page.createOffice();
    expect(page.error()).toContain('Completa');
    expect(api.createOffice).not.toHaveBeenCalled();
  });

  it('registra consultorio con datos saneados y limpia formulario', () => {
    page.officeName = ' Consultorio ficticio ';
    page.officeAddress = ' Calle de prueba ';
    page.roomNumber = ' 102 ';
    page.officeActive = false;
    page.createOffice();
    expect(api.createOffice).toHaveBeenCalledWith({
      name: 'Consultorio ficticio', address: 'Calle de prueba',
      roomNumber: '102', active: false
    });
    expect(page.officeName).toBe('');
    expect(page.officeAddress).toBe('');
    expect(page.success()).toContain('PostgreSQL');
    expect(page.busy()).toBe(false);
  });

  it('no registra médicos sin campos o contraseña suficiente', () => {
    page.firstName = 'Ana';
    page.lastName = 'Prueba';
    page.email = 'test@example.test';
    page.temporaryPassword = '123';
    page.medicalLicense = 'FICTICIO';
    page.specialtyId = 'spec-1';
    page.createDoctor();
    expect(page.error()).toContain('mínimo 8');
    expect(api.createDoctor).not.toHaveBeenCalled();
  });

  it('registra médico y elimina la contraseña temporal de la pantalla', () => {
    page.firstName = ' Ana ';
    page.lastName = ' Prueba ';
    page.email = ' doctor@example.test ';
    page.temporaryPassword = 'test-password-123';
    page.medicalLicense = ' DEMO-1 ';
    page.specialtyId = 'spec-1';
    page.createDoctor();
    expect(api.createDoctor).toHaveBeenCalledWith({
      firstName: 'Ana', lastName: 'Prueba', email: 'doctor@example.test',
      temporaryPassword: 'test-password-123', medicalLicense: 'DEMO-1', specialtyId: 'spec-1'
    });
    expect(page.temporaryPassword).toBe('');
    expect(page.success()).toContain('Médico registrado');
    expect(page.busy()).toBe(false);
  });

  it('distingue errores de permisos, duplicados, validación y servidor', () => {
    page.officeName = 'Prueba';
    page.officeAddress = 'Prueba';
    page.roomNumber = '100';
    for (const [status, expected] of [
      [403, 'ADMIN'], [409, 'existe'], [400, 'válidos'], [500, 'Spring Boot']
    ] as const) {
      api.createOffice.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      page.createOffice();
      expect(page.error()).toContain(expected);
      expect(page.busy()).toBe(false);
    }
  });

  it('impide duplicar operaciones mientras hay solicitud activa', () => {
    page.busy.set(true);
    page.officeName = 'Prueba';
    page.officeAddress = 'Prueba';
    page.roomNumber = '100';
    page.createOffice();
    page.createDoctor();
    expect(api.createOffice).not.toHaveBeenCalled();
    expect(api.createDoctor).not.toHaveBeenCalled();
  });
});
