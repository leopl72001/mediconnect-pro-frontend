/**
 * Seguridad E2E con Angular -> Spring Boot -> MongoDB GridFS real.
 * Solo datos inventados: no usar archivos ni cuentas de pacientes reales.
 */
describe('Fase 8 - privacidad de archivos por paciente', () => {
  const api = '/api/v1';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = `PacienteE2E-${unique}-123`;
  const patientA = `e2e.media.a.${unique}@example.com`;
  const patientB = `e2e.media.b.${unique}@example.com`;
  let tokenA;
  let tokenB;
  let fileId;

  function createPatient(email) {
    cy.request('POST', `${api}/auth/register`, {
      firstName: 'Paciente',
      lastName: 'Ficticio',
      email,
      password
    });
    return cy.request('POST', `${api}/auth/login`, { email, password })
      .then(({ body }) => body.accessToken);
  }

  it('solo el propietario lista y descarga su archivo; otro paciente recibe 404', () => {
    createPatient(patientA).then(token => { tokenA = token; });
    createPatient(patientB).then(token => { tokenB = token; });

    cy.visit('/');
    cy.then(() => {
      expect(tokenA).to.be.a('string').and.not.be.empty;
      expect(tokenB).to.be.a('string').and.not.be.empty;
    });

    // Archivo PNG mínimo y ficticio generado en memoria, no procede de un paciente.
    cy.window().then(async (win) => {
      const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
      const bytes = Uint8Array.from(win.atob(base64), c => c.charCodeAt(0));
      const form = new win.FormData();
      form.append('file', new win.File([bytes], `privado-${unique}.png`, { type: 'image/png' }));
      const response = await win.fetch(`${api}/media/me`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: form
      });
      expect(response.status, 'subida de archivo ficticio').to.be.oneOf([200, 201]);
    });

    cy.then(() => tokenA).then(token => {
      cy.request({
        url: `${api}/media/me`,
        headers: { Authorization: `Bearer ${token}` }
      }).then(({ body }) => {
        expect(body, 'lista del propietario').to.be.an('array');
        const uploaded = body.find(file => String(file.name ?? file.filename ?? '').includes(unique));
        expect(uploaded, 'archivo recién subido').to.exist;
        fileId = uploaded.id;
        expect(fileId, 'identificador del archivo').to.exist;
      });
    });

    cy.then(() => tokenB).then(token => {
      cy.request({
        url: `${api}/media/me`,
        headers: { Authorization: `Bearer ${token}` }
      }).then(({ body }) => {
        expect(body, 'lista del otro paciente').to.be.an('array');
        expect(body.some(file => String(file.id) === String(fileId))).to.eq(false);
      });
      cy.then(() => fileId).then(id => {
        cy.request({
          url: `${api}/media/me/${id}`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
          encoding: 'binary'
        }).its('status').should('eq', 404);
      });
    });

    cy.then(() => fileId).then(id => {
      cy.request({
        url: `${api}/media/me/${id}`,
        headers: { Authorization: `Bearer ${tokenA}` },
        encoding: 'binary'
      }).then(({ status, headers }) => {
        expect(status).to.eq(200);
        expect(headers['content-disposition']).to.include('attachment');
        expect(headers['cache-control']).to.include('no-store');
      });
    });
  });
});
