/**
 * Three genuine browser E2E flows against Angular + Spring Boot + Docker DBs.
 * Uses only generated fictitious users and records.
 */
describe('MediConnect Pro - tres flujos críticos reales', () => {
  const adminEmail = Cypress.env('adminEmail');
  const adminPassword = Cypress.env('adminPassword');
  const api = '/api/v1';
  const suffix = Date.now().toString(36);
  const doctorEmail = `e2e.medico.${suffix}@example.com`;
  const doctorPassword = `TestMedico-${suffix}-123`;
  let doctorId;
  let officeId;
  let patientEmail;
  let patientPassword;

  function registerViaUi(label) {
    patientEmail = `e2e.${label}.${Date.now()}@example.com`;
    patientPassword = `TestPaciente-${suffix}-123`;
    cy.visit('/');
    cy.contains('button', 'Registrarse').click();
    cy.get('input[name="firstName"]').type('Paciente');
    cy.get('input[name="lastName"]').type('Ficticio');
    cy.get('input[name="email"]').type(patientEmail);
    cy.get('input[name="password"]').type(patientPassword);
    cy.contains('button', 'Crear cuenta y acceder').click();
    cy.contains('Sesión JWT activa', {timeout: 15000}).should('be.visible');
  }

  before(() => {
    if (!adminEmail || !adminPassword) {
      throw new Error('Definir CYPRESS_adminEmail y CYPRESS_adminPassword para el entorno de pruebas.');
    }
    cy.request('POST', `${api}/auth/login`, {
      email: adminEmail, password: adminPassword
    }).then(({body}) => {
      const headers = { Authorization: `Bearer ${body.accessToken}` };
      cy.request(`${api}/specialties`).then(({body: specialties}) => {
        const specialtyId = specialties[0]?.id;
        expect(specialtyId).to.be.a('string');
        cy.request({
          method: 'POST', url: `${api}/admin/doctors`, headers,
          body: { email: doctorEmail, temporaryPassword: doctorPassword,
            firstName: 'Cypress', lastName: 'Prueba', specialtyId,
            medicalLicense: `E2E-${suffix}` }
        }).then(({body: doctor}) => { doctorId = doctor.id; });
      });
      cy.request({
        method: 'POST', url: `${api}/admin/offices`, headers,
        body: { name: 'Consultorio E2E', address: 'Dirección ficticia',
          roomNumber: `E2E-${suffix}`, active: true }
      }).then(({body: office}) => { officeId = office.id; });
    });
  });

  it('1. Registra al paciente con JWT y persiste el perfil en PostgreSQL', () => {
    registerViaUi('perfil');
    cy.contains('nav button', 'Mi perfil').click();
    cy.get('input[name="phone"]').clear().type('3000000000');
    cy.get('input[name="address"]').clear().type('Dirección ficticia E2E');
    cy.contains('button', 'Guardar en PostgreSQL').click();
    cy.contains('Perfil actualizado y guardado en PostgreSQL', {timeout: 10000}).should('exist');
    cy.reload(); // JWT remains memory-only, so sign in again.
    cy.get('input[name="email"]').type(patientEmail);
    cy.get('input[name="password"]').type(patientPassword);
    cy.contains('button', 'Ingresar a MediConnect').click();
    cy.contains('nav button', 'Mi perfil').click();
    cy.get('input[name="phone"]').should('have.value', '3000000000');
  });

  it('2. Reserva y cancela una cita real sin confundirla con datos demo', () => {
    registerViaUi('citas');
    cy.contains('nav button', 'Especialistas').click();
    cy.contains('article', 'Cypress Prueba', {timeout: 12000})
      .contains('button', 'Reservar cita real').click();
    cy.get('#booking-doctor').select(doctorId);
    cy.get('#booking-office').select(officeId);
    const date = new Date(Date.now() + 16 * 86400000).toISOString().slice(0,10);
    cy.get('#booking-date').invoke('val', date).trigger('change');
    cy.contains('button', '09:00').click();
    cy.contains('button', 'Confirmar cita real').click();
    cy.contains('¡Cita real registrada correctamente en PostgreSQL!', {timeout: 12000}).should('exist');
    cy.contains('button', 'Cancelar cita').first().click();
    cy.contains('Cita real cancelada correctamente en Spring Boot', {timeout: 10000}).should('exist');
    cy.contains('Cancelada').should('exist');
  });

  it('3. Médico registra nota MongoDB y paciente la consulta desde Angular', () => {
    registerViaUi('clinica');
    const email = patientEmail;
    const password = patientPassword;
    cy.request('POST', `${api}/auth/login`, {email, password}).then(({body}) => {
      const start = new Date(Date.now() + 21 * 86400000);
      start.setUTCHours(15,0,0,0);
      const end = new Date(start.getTime() + 30 * 60000);
      cy.request({
        method:'POST', url:`${api}/appointments`,
        headers:{Authorization:`Bearer ${body.accessToken}`},
        body:{doctorId, officeId, startTime:start.toISOString(), endTime:end.toISOString()}
      }).its('status').should('eq',201);
    });
    cy.contains('button', 'Cerrar sesión').click();
    cy.get('input[name="email"]').clear().type(doctorEmail);
    cy.get('input[name="password"]').clear().type(doctorPassword);
    cy.contains('button', 'Ingresar a MediConnect').click();
    cy.contains('nav button', 'Notas clínicas').click();
    cy.get('#clinical-appointment').find('option').should('have.length.at.least',2);
    cy.get('#clinical-appointment').select(1);
    cy.get('#clinical-content').type('Nota E2E ficticia - historia privada');
    cy.contains('button', 'Guardar nota real').click();
    cy.contains('Nota E2E ficticia - historia privada', {timeout: 12000}).should('be.visible');
    cy.contains('button', 'Cerrar sesión').click();
    cy.get('input[name="email"]').clear().type(email);
    cy.get('input[name="password"]').clear().type(password);
    cy.contains('button', 'Ingresar a MediConnect').click();
    cy.contains('nav button', 'Historia clínica').click();
    cy.contains('Nota E2E ficticia - historia privada', {timeout: 12000}).should('be.visible');
  });
});
