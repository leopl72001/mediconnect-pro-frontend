# Guion de sustentación final — MediConnect Pro (15 minutos)

**Duración máxima: 15 min.** Texto natural con **puentes claros**: qué abrir, por qué abrirlo, qué señalar, qué explicar y qué ejecutar. Ensayar con datos **solo ficticios** y la URL pública cuando exista. Si el hosting aún no está activo, no decir que está desplegado.

## 00:00–03:00 | Arquitectura y decisiones

**Abrir:** repositorio `mediconnect-pro-backend`, archivo `docs/ARQUITECTURA-CAPSTONE.md`.

**Decir:**
«Buenos días. Este es MediConnect Pro, la segunda versión de mi plataforma de citas médicas. La primera versión quedó entregada por separado; esta nueva integra una aplicación Angular 21 con un backend Spring Boot 4 usando Java 25. El problema que resuelve es que pacientes, médicos y administradores necesitan gestionar citas y documentos desde un mismo portal, con roles y persistencia real.

Primero les muestro la arquitectura para que la demostración no se quede solamente en una interfaz bonita.»

**Señalar el diagrama:** «Angular usa Signals y Tailwind para el estado y diseño. Spring Boot centraliza las reglas transaccionales y la autorización JWT. PostgreSQL guarda pacientes, citas y prescripciones, MongoDB guarda las notas clínicas de ejemplo y los archivos de prueba, y Redis acelera consultas. OpenFDA incorpora validación externa con tolerancia a fallos. SSE avisa cuando una cita cambia.»

**Abrir:** `src/main/java/.../appointments/AppointmentService.java`.

«Aquí aplicamos una regla de negocio que es fácil de pasar por alto: no basta con comprobar una hora en el navegador. El servicio bloquea la fila del médico, consulta solapamientos dentro de una transacción y devuelve HTTP 409 si ya existe una cita.»

**Puente:** «Ahora que conocen las capas, voy a mostrar cómo las usa una persona real desde el navegador.»

## 03:00–08:00 | Demostración en vivo

**Abrir:** URL de producción real del frontend (si falta, decir claramente que estás mostrando entorno local `http://localhost:4200`).

**Decir:**
«Entramos como paciente. La autenticación no es decorativa: Spring Boot emite un JWT que el navegador utiliza en cada petición autorizada.»

**Hacer:** iniciar sesión con **paciente ficticio** preparado. Ir a **Especialistas**.

«Estos médicos se consultan desde PostgreSQL. La base define cuáles existen; el frontend no inventa horarios disponibles.»

**Hacer:** pulsar **Reservar cita real**, escoger Laura Prueba y consultorio de prueba, fecha futura y hora no ocupada. Confirmar. Mostrar **Mis citas**.

«La reserva está guardada y la norma de no solapamiento se ejecutó en el servidor, no en Angular. Ahora veremos por qué usamos SSE.»

**Hacer:** mantener sesión del médico en otro navegador con **Mi agenda** abierta; observar llegada de cita sin F5.

«El aviso viene después del commit y el médico recibe el cambio al instante. El evento no divulga información clínica; Angular recarga la agenda autorizada.»

**Hacer:** desde paciente **Cancelar cita** (más de 24h antes) y ver estado *Cancelada* en navegador médico.

**Hacer:** navegar por **Historia clínica** y **Mis recetas** ya pobladas con registros ficticios. Luego **Mis archivos**: subir una foto ficticia, observar conversión a WebP; con DevTools **Network → Offline**, intentar subir otra imagen, observar cola `1 pendiente`, volver a `Online` y esperar `0 pendientes`.

«Aquí se ve resiliencia: una caída de internet no pierde una carga de demostración. La cola IndexedDB no está cifrada; por seguridad **no usamos expedientes reales**.»

**Puente:** «Lo visible demuestra el recorrido, pero en un proyecto de grado también necesito probar lo que ocurre detrás de las pantallas.»

## 08:00–12:00 | Deep dive técnico

**Abrir:** `mediconnect-pro-backend/src/main/java/.../notifications/AppointmentEvents.java`.

**Decir:**
«Mi mayor desafío fue sincronizar la agenda sin duplicar estados ni enviar información del paciente a terceros. La solución fue SSE: un canal por usuario autenticado. El servicio no emite el aviso antes de que termine la transacción, sino al evento AFTER_COMMIT. El cliente escucha los cambios y después consulta la API con su JWT.»

**Señalar:** `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`; destinatarios de evento; envío mínimo; heartbeat y reconexión.

**Abrir:** `mediconnect-pro-frontend/src/app/core/appointment-notifications.ts`.

«Aquí Angular se conecta usando fetch streaming, porque EventSource nativo no permite incluir nuestro Bearer JWT en la cabecera. No ponemos tokens en una URL. El stream se cierra al cerrar sesión y, si falla la red, reintenta y resincroniza.»

**Abrir:** GitHub Actions del backend y del frontend.

«El proceso de calidad ejecuta compilación, pruebas unitarias y Testcontainers contra PostgreSQL real. Cypress ejecuta tres viajes críticos: registro/perfil, reserva/cancelación y nota clínica. También medimos cobertura Java con JaCoCo y Angular con Vitest, y publicamos los reportes en GitHub Actions.»

**Mostrar reporte real** de ambos: **decir su porcentaje verdadero**. **Si no supera 80%, reconocerlo como pendiente**. No inventar datos de SonarCloud ni de la URL.

**Puente:** «Las decisiones tienen concesiones. En lugar de esconderlas, voy a explicar qué mejoraría si este sistema pasara del prototipo académico a producción clínica.»

## 12:00–15:00 | Q&A / revisión de código

**Si preguntan por seguridad:** «Los menús Angular no conceden permisos. Spring Security valida JWT y rol; los archivos tienen propietario y se comprueba antes de cada descarga. La cola offline es solamente una demostración y no almacena información clínica verdadera.»

**Si preguntan por consistencia:** «La reserva bloquea al médico durante la transacción y devuelve HTTP 409 si hay solapamiento. Para migraciones de una base nueva en producción usamos Flyway y Hibernate validate, en lugar de ddl-auto update.»

**Si preguntan por escalamiento:** «Los SSE actuales son en memoria; si se despliegan varias réplicas haría falta un bus Redis Pub/Sub. La nube también necesita MongoDB y Redis gestionados, backups, cifrado de archivos y observabilidad.»

**Si preguntan por IA:** «Cursor y las reglas `.cursorrules` aceleraron refactorización, pruebas y consistencia; comprobé el resultado mediante compilación, CI y la bitácora de IA en el repositorio. La responsabilidad técnica no se delega a la IA.»

**Si preguntan por coverage o SonarCloud:** mostrar la captura y el número verdadero; explicar qué falta si la meta no está cumplida.

**Si preguntan por URL:** solo mostrarla si realmente responde en producción. Si no, decir: «La imagen y el pipeline están preparados; el despliegue público necesita configurar recursos externos y claves en Render.»

## Preparación rápida antes de grabar / defender

**PowerShell A, backend**
```powershell
cd 'D:\app fullstack\mediconnect-pro-backend'
git pull --ff-only origin main
docker compose up -d --build app
Invoke-RestMethod http://127.0.0.1:8082/actuator/health
```

**PowerShell B, frontend** — solo si `http://localhost:4200` no está corriendo.
```powershell
cd 'D:\app fullstack\mediconnect-pro-frontend'
git pull --ff-only origin main
docker run --rm -it --name mediconnect-pro-angular `
  --network mediconnect-pro_default `
  -p 127.0.0.1:4200:4200 `
  --mount "type=bind,source=$((Get-Location).Path),target=/app" `
  --mount "type=volume,source=mediconnect-pro-node-modules,target=/app/node_modules" `
  -w /app node:24-bookworm `
  sh -lc "npm ci && npm start -- --host 0.0.0.0 --poll 2000"
```

**No enseñes en pantalla:** `.env`, JWT, contraseñas, claves, direcciones reales de pacientes. Usar datos ficticios y repetir la demo con anticipación para evitar conflictos de citas.
