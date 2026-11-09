# Bitácora de asistencia con IA — MediConnect Pro Frontend

## Registro 001 — Inicio del frontend
- **Objetivo:** preparar Angular 21+ zoneless, Vitest y Tailwind CSS 4 para el proyecto de grado.
- **Asistencia:** explicación de instalación y depuración de bloqueo de la DLL de Rollup en Windows.
- **Decisión humana:** ejecutar Angular mediante el contenedor oficial Node 24, sin deshabilitar Smart App Control.
- **Evidencia:** Angular visible en localhost:4200, pruebas Vitest y build satisfactorios en el contenedor local.

## Registro 002 — Diseño de la interfaz
- **Objetivo:** reemplazar la pantalla predeterminada de Angular por una interfaz clínica responsiva.
- **Asistencia:** generación de estructura visual, menú según rol de demostración, Signals para filtros y reservas locales, tests y CI.
- **Decisiones revisables:** mantener datos simulados aislados de la API; evitar cualquier afirmación de autenticación o persistencia real; no incluir información de pacientes reales.
- **Evidencia de verificación:** GitHub Actions 'MediConnect Pro Frontend CI' ejecuta npm ci, npm run build y Vitest.
- **Pendientes:** revisión visual y accesibilidad en dispositivos pequeños, extracción de componentes por funcionalidades, integración JWT en fase 6.

## Reglas de revisión humana
1. Revisar cada cambio de IA en GitHub.
2. Validar builds y pruebas antes de fusionar.
3. Documentar los prompts relevantes, riesgos y decisiones de arquitectura.
4. No reportar resultados inexistentes, cobertura no calculada ni URLs no desplegadas.
