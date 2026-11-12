# Fase 7 — Prueba única de citas en tiempo real

**Qué debe demostrar:** una cita creada/cancelada desde la sesión del paciente aparece automáticamente en la agenda de la médica asignada, **sin pulsar Actualizar ni recargar la página**, mediante Server-Sent Events (SSE).

## Preparación

1. Backend Docker actualizado desde `mediconnect-pro-backend/main`, reconstruido y con `http://127.0.0.1:8082/actuator/health` en `UP`.
2. Frontend Angular actualizado desde `mediconnect-pro-frontend/main`, servido en `http://localhost:4200` y conectado a `mediconnect-pro_default`.
3. Mantén **dos sesiones independientes** simultáneamente:
   - **Ventana A (navegador normal)**: iniciar sesión como **Laura Prueba, médica**; abrir `Mi agenda`.
   - **Ventana B (otro navegador o ventana privada)**: iniciar sesión como **paciente**; abrir `Especialistas`.
4. En ambas debe verse el indicador **SSE en vivo**, no `SSE reconectando`. El administrador no necesita ese indicador.

## Demo principal (sin usar F5)

1. Desde **paciente**, reservar una cita **futura** con Laura Prueba en el consultorio activo. Para poder cancelarla, debe faltar más de **24 horas**.
2. Observar **la ventana de la médica**: debería mostrar un aviso `Nueva cita registrada...` y la cita debe aparecer automáticamente en `Mi agenda`.
3. Desde **paciente**, abrir `Mis citas` y pulsar `Cancelar cita`.
4. Observar **la ventana de la médica** otra vez: debe cambiar a **Cancelada** automáticamente, sin actualizar a mano.

## Qué valida
- Canal SSE `GET /api/v1/notifications/stream` autorizado con JWT en **cabecera HTTP**, sin poner el token en una URL.
- Eventos enviados **después de confirmar la transacción**.
- Aislamiento de pacientes: el servidor notifica únicamente al propietario y médico asignado.
- Actualización de datos mediante las APIs autorizadas de agenda, sin confiar en el contenido del evento como fuente de datos.
- Heartbeat de conexión y reconexión automática.

## Si algo falla
- **SSE reconectando en ambas ventanas:** verificar `/actuator/health` (backend nuevo), proxy Angular y Docker. Se requiere reconstruir la imagen del backend, no basta solo `git pull`.
- **SSE en vivo pero agenda no cambia:** comprobar que la reserva es con **Laura Prueba** y que la médica de la otra ventana es esa cuenta.
- **Error al reservar o cancelar:** revisar si faltan 24 horas, si hay solapamiento HTTP 409 o si se trata de una cita cancelada.
- **La conexión se desconecta a los cinco minutos:** es normal; vuelve a abrir SSE para revalidar el JWT, y el indicador regresará a `SSE en vivo` si la sesión sigue válida.
- **Token vencido:** cerrar sesión e iniciar de nuevo; las credenciales nunca deben aparecer en pantallazos.

**Limitación del prototipo:** eventos se gestionan en la memoria de una única instancia del backend. Para varias réplicas en cloud hace falta un mecanismo de difusión compartido como Redis Pub/Sub; no afirmar que está resuelto todavía.

**Datos para prueba:** únicamente pacientes y fechas ficticias. El proyecto no debe recibir información clínica real durante la defensa.
