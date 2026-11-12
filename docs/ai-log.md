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

## Registro 008 — Archivos privados y resiliencia offline (fase 8)
- **Objetivo:** procesar imágenes en cliente con Canvas/WebP, guardar imágenes/PDF en backend seguro por cuenta, soportar conexiones intermitentes.
- **Asistencia IA:** servicio Java Mongo GridFS con validación de magic bytes y propietario JWT; cliente Angular con carga multipart y descarga autenticada; cola IndexedDB con recuperación automática al volver la conexión.
- **Seguridad y alcance:** máximo 5 MB por carga; el backend ignora la extensión y tipo MIME declarados y verifica la firma; no hay enlaces públicos, se sirve como adjunto, se bloquean accesos cruzados. La cola local no se cifra: se **prohíbe usar documentos clínicos reales** en la demo.
- **Calidad:** JUnit/Mockito para tipos rechazados, tamaño y acceso ajeno; Vitest para APIs y tipos admitidos; GitHub Actions debe quedar verde antes de fusionar.
- **Deuda técnica:** para producción se requiere cifrado de cola local, control empresarial de claves, retención, antivirus, auditoría, reglas de eliminación, backend de almacenamiento duradero y estudio normativo aplicable. Modo offline actual **no es PWA instalable**; la sincronización diferida funciona desde una pestaña previamente abierta.
- **Validación pendiente:** prueba manual de una imagen WebP y cola 1→0 en navegador. [Guía única](prueba-fase8-medios.md).

## Registro 009–010 — Calidad avanzada, cloud y defensa del proyecto de grado

**Objetivo:** cumplir los requerimientos formales de la capstone más allá de la demo: reportes de cobertura, integración PostgreSQL de verdad, tres recorridos Cypress y pipeline de publicación/despliegue.

**Estrategia asistida por IA:** se propusieron test de repositorio con Testcontainers, esquema inicial Flyway de producción, validación de estado mediante GitHub Actions, tres casos Cypress contra Angular y el backend real, informe SonarCloud condicional, Dockerfiles multi-stage y blueprints Render. Se crearon diagramas Mermaid y guion oral de 15 minutos. Los cambios se hicieron en ramas `feature/capstone-calidad-cloud` de ambos repositorios, sin tocar MediConnect v1.

**Validación humana y automatizada:** GitHub Actions de backend pasó JaCoCo y Testcontainers con una base PostgreSQL efímera, incluida la migración Flyway. Angular compiló y sus tests Vitest pasaron. La primera ejecución Cypress encontró un problema real: el menú lateral estaba escondido en el viewport del runner. Se corrigió configurando viewport de escritorio y se volvió a ejecutar. Los errores encontrados se registran como evidencia para explicar la revisión crítica de la IA, no se maquillan.

**Cobertura real observada (no equivale a aprobar):** Java JaCoCo 42.73 % líneas, 34.39 % ramas; Angular Vitest 31.12 % líneas, 28.35 % ramas. Sigue **pendiente** alcanzar el 80 %. Los reportes generados se adjuntan como artefactos de GitHub Actions.

**Decisiones de seguridad:** no automatizar despliegue con contraseñas públicas o las del archivo local `.env`; Render y SonarCloud requieren secretos y aprobación del propietario. Nginx en frontend conserva JWT/SSE bajo un único origen. Cloud de un solo backend replica; para múltiples instancias SSE necesita un bus compartido. Cola IndexedDB sin cifrado únicamente con archivos ficticios.

**Prompt Engineering / reglas:** las instrucciones de `.cursorrules` definen uso de Angular Signals y separación de flujos demo/reales, REST con DTOs y validación de roles en backend, no poner secretos en frontend ni reportar resultados de cobertura no comprobados. La IA aceleró scaffolding, pruebas, revisión de logs y documentación, pero las decisiones y la defensa son responsabilidad del desarrollador.

**Pendiente de aprobación externa:** deploy Render, URL pública, servicios de MongoDB/Redis, dashboard SonarCloud y prueba de seguridad de datos reales. La app solo es prototipo académico con datos ficticios.

## Reglas de revisión humana
1. Revisar cada cambio de IA en GitHub.
2. Validar builds y pruebas antes de fusionar.
3. Documentar los prompts relevantes, riesgos y decisiones de arquitectura.
4. No reportar resultados inexistentes, cobertura no calculada ni URLs no desplegadas.
