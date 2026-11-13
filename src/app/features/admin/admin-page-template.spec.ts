import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminApiService } from '../../core/admin-api.service';
import { CatalogService } from '../../core/catalog.service';
import { AdminPage } from './admin-page';

describe('AdminPage — plantillas visibles y acciones de administrador', () => {
  let fixture: ComponentFixture<AdminPage>;
  let page: AdminPage;
  let api: { createOffice: ReturnType<typeof vi.fn>; createDoctor: ReturnType<typeof vi.fn> };
  const doctors = [
    { id: 'doc-1', firstName: 'Ana', lastName: 'Ficticia',
      specialtyId: 'specialty-1', specialtyName: 'Medicina general' }
  ];
  const offices = [
    { id: 'office-1', name: 'Consultorio Centro', address: 'Calle ficticia',
      roomNumber: '201', active: true },
    { id: 'office-2', name: 'Consultorio Sur', address: 'Otra calle',
      roomNumber: '202', active: false }
  ];
  let catalog: {
    doctors: ReturnType<typeof vi.fn>;
    offices: ReturnType<typeof vi.fn>;
    specialties: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      createOffice: vi.fn(() => of({ id: 'new-office' })),
      createDoctor: vi.fn(() => of({ id: 'new-doctor' }))
    };
    catalog = {
      doctors: vi.fn(() => of(doctors)),
      offices: vi.fn(() => of(offices)),
      specialties: vi.fn(() => of([{ id: 'specialty-1', name: 'Medicina general' }]))
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

  function render(view: 'resumen' | 'reportes' | 'profesionales' | 'consultorios') {
    fixture.componentRef.setInput('view', view);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('pinta métricas reales de médicos, consultorios activos y especialidades', () => {
    const root = render('resumen');
    expect(root.textContent).toContain('Panel administrativo');
    expect(root.textContent).toContain('Médicos registrados');
    expect(root.textContent).toContain('Consultorios activos');
    expect(root.textContent).toContain('Especialidades');
    expect(root.textContent).toContain('1');
    expect(page.activeOfficesCount()).toBe(1);
  });

  it('aclara que reportes de facturación todavía no tienen endpoint', () => {
    const root = render('reportes');
    expect(root.textContent).toContain('Reportes básicos');
    expect(root.textContent).toContain('no se inventan cifras');
    expect(root.textContent).toContain('Médicos registrados');
  });

  it('renderiza formulario de médico con contraseña temporal protegida', () => {
    const root = render('profesionales');
    expect(root.textContent).toContain('Registrar nuevo médico');
    expect(root.querySelector('input[name="temporaryPassword"]')?.getAttribute('type')).toBe('password');
    expect(root.querySelector('select[name="specialtyId"] option')?.textContent).toContain('Medicina general');
    expect(root.textContent).toContain('Ana Ficticia');
  });

  it('muestra el estado de catálogo vacío de profesionales', () => {
    const root = render('profesionales');
    page.doctors.set([]);
    fixture.detectChanges();
    expect(root.textContent).toContain('Todavía no hay médicos registrados');
  });

  it('renderiza consultorios activos e inactivos y formulario de alta', () => {
    const root = render('consultorios');
    expect(root.textContent).toContain('Crear consultorio real');
    expect(root.textContent).toContain('Consultorio Centro');
    expect(root.textContent).toContain('Consultorio Sur');
    expect(root.textContent).toContain('Activo');
    expect(root.textContent).toContain('Inactivo');
    expect(root.querySelector('input[name="officeActive"]')?.getAttribute('type')).toBe('checkbox');
  });

  it('indica que no existen consultorios cuando el catálogo es vacío', () => {
    const root = render('consultorios');
    page.offices.set([]);
    fixture.detectChanges();
    expect(root.textContent).toContain('No hay consultorios');
  });

  it('bloquea botón de registro mientras una operación está activa', () => {
    const root = render('profesionales');
    page.busy.set(true);
    fixture.detectChanges();
    const button = root.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Creando');
    render('consultorios');
    const officeButton = root.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(officeButton.disabled).toBe(true);
  });

  it('muestra alerta de error y estado de éxito dentro de la plantilla', () => {
    const root = render('resumen');
    page.error.set('Operación no autorizada');
    page.success.set('Consultorio creado');
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('no autorizada');
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Consultorio creado');
  });

  it('ejecuta actualización de catálogos desde botón visible', () => {
    const root = render('resumen');
    catalog.doctors.mockClear();
    const button = [...root.querySelectorAll('button')].find(b => b.textContent?.includes('Actualizar datos'));
    expect(button).toBeTruthy();
    button!.click();
    expect(catalog.doctors).toHaveBeenCalledOnce();
  });

  it('renderiza error de consulta sin presentar estadísticas inventadas', () => {
    catalog.doctors.mockReturnValue(throwError(() => new Error('fallo')));
    const root = render('resumen');
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('No fue posible cargar');
  });

  it('envía un consultorio de demostración desde el formulario HTML real', () => {
    fixture.componentRef.setInput('view', 'consultorios');
    page.officeName = 'Demo Centro';
    page.officeAddress = 'Calle ficticia';
    page.roomNumber = '500';
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(api.createOffice).toHaveBeenCalledOnce();
    expect(page.success()).toContain('Consultorio registrado');
  });

  it('envía un profesional ficticio desde el formulario HTML real', () => {
    fixture.componentRef.setInput('view', 'profesionales');
    page.firstName = 'Ana';
    page.lastName = 'Ficticia';
    page.email = 'doctor@example.test';
    page.temporaryPassword = 'Password123!';
    page.medicalLicense = 'DEMO-2026';
    page.specialtyId = 'specialty-1';
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('form') as HTMLFormElement)
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(api.createDoctor).toHaveBeenCalledOnce();
    expect(page.success()).toContain('Médico registrado');
  });

});
