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

## Registro 003 — Conexión inicial JWT (fase 6)
- **Objetivo:** permitir registro e inicio de sesión reales desde Angular usando el backend en Docker.
- **Asistencia:** diseño de un componente de acceso, AuthService, interceptor funcional y proxy de desarrollo Angular/Node hacia Spring Boot.
- **Decisiones:** token en memoria (sin localStorage); rol interpretado solo para UI, con seguridad del backend; pruebas unitarias HTTP con Vitest; opción demo explícitamente separada.
- **Validación:** CI de Angular ejecuta build + Vitest. Falta prueba manual de red desde Windows/Docker y evidencia de registro/login real.
- **Pendientes:** sesiones y expiración, errores de red, integración de catálogos y reservas, autorización y cobertura detallada.

## Registro 004 — Catálogo de médicos conectado (fase 6)
- **Objetivo:** consultar profesionales reales y evitar que un paciente autenticado vea perfiles de médicos inventados como si fueran registros de producción.
- **Asistencia:** servicio HTTP tipado para catálogos, estado Signals, filtros, estados de carga y error, pruebas Vitest.
- **Limitaciones:** Spring Boot no devuelve calificaciones ni disponibilidad; no mostrarlas como datos reales. Todavía no se realizan reservas o cancelaciones desde el frontend autenticado.
- **Validación:** CI de Angular y Vitest. Pendiente prueba visual con datos de Docker y creación de profesionales por ADMIN si el catálogo está vacío.

## Registro 005 — Reserva médica real (fase 6)
- **Objetivo:** usar la API de Spring Boot 4 para crear, consultar y cancelar citas médicas desde Angular.
- **Asistencia:** servicio HTTP tipado, formulario de consultorio activo y médico real, timestamps ISO y validaciones, mensajes de respuesta HTTP 409/400/403, agenda del paciente y del médico.
- **Decisiones:** exigir rol paciente para reservar/cancelar, horario de la plataforma en Colombia (UTC-5), duración de 30 minutos; conservar las reglas de solapamiento y cancelación de más de 24 horas en el backend.
- **Alcance honesto:** la interfaz no afirma disponibilidad anticipada; la única confirmación es la respuesta de creación del servidor. Datos médicos, recetas y paneles secundarios aún son demostrativos.
- **Evidencia:** CI ejecuta build y Vitest, incluyendo pruebas unitarias de los endpoints. Falta prueba E2E manual desde Docker con consultorio real.

## Registro 006 — Integración integral de la fase 6
- **Objetivo:** completar en un solo lote las pantallas de perfil, notas clínicas, recetas y gestión administrativa con la API Spring Boot.
- **Asistencia:** servicios HTTP tipados de paciente, administración y clínica; formularios separados por rol y estados de carga/error, pruebas HTTP con Vitest.
- **Permisos:** paciente consulta sus documentos y edita su perfil; médico escribe nota y receta únicamente en sus citas; administrador crea profesionales y consultorios. Autorización aplicada por Spring Security, no por los elementos visuales.
- **Persistencia:** PostgreSQL para citas, perfiles, médicos, consultorios y recetas; MongoDB para notas. OpenFDA valida el nombre del medicamento con estado externo.
- **Verificación:** build y tests unitarios por GitHub Actions. Recorrido manual completo aún pendiente: [guía](prueba-integral-fase6.md).
- **Limitaciones:** no existen estadísticas avanzadas, disponibilidad anticipada ni identidad de pacientes en la API de agenda; no inventar esos datos. Aún faltan SSE, medios, offline, cobertura y Cypress, CD/despliegue.

## Registro 007 — Notificaciones en tiempo real con SSE (fase 7)
- **Objetivo:** actualizar la agenda de paciente y médica de forma inmediata tras crear/cancelar citas reales, sin refrescar.
- **Asistencia IA:** diseño de un evento transaccional backend `AFTER_COMMIT`, emisores `SseEmitter` por usuario, heartbeat y cliente Angular con fetch streaming, parser robusto y Signals.
- **Seguridad:** JWT únicamente en cabecera HTTP (EventSource nativo no permite cabeceras personalizadas); canales limitados al paciente y médico asignado, mensajes sin información clínica; streams cortos para renovar verificación al reconectar.
- **Calidad:** pruebas unitarias de parser y cabecera JWT, compilar frontend y backend en GitHub Actions. Aún falta prueba real de dos sesiones simultáneas con Docker local.
- **Deuda técnica:** SSE solo distribuye en una instancia Spring; en cloud multirréplica usar Redis Pub/Sub. No hay notificaciones móviles ni persistencia de eventos históricos.
- **Evidencia:** [plan de prueba de fase 7](prueba-fase7-sse.md).

## Reglas de revisión humana
1. Revisar cada cambio de IA en GitHub.
2. Validar builds y pruebas antes de fusionar.
3. Documentar los prompts relevantes, riesgos y decisiones de arquitectura.
4. No reportar resultados inexistentes, cobertura no calculada ni URLs no desplegadas.
