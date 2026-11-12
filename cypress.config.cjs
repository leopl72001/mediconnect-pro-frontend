module.exports = {
  e2e: {
    baseUrl: 'http://127.0.0.1:4200',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
    video: true,
    defaultCommandTimeout: 12000,
    requestTimeout: 12000
  }
};
