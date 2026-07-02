# MEMORY.md — Estado Actual del Proyecto

> Actualizar este archivo al final de cada sesión de trabajo.
> Fecha de última actualización: 2026-07-02

---

## ESTADO GENERAL

**Fase actual:** Fase 5 parcialmente completa — chatbot, IA y canales funcionando en producción
**Progreso global:** ~65% — Fases 1-5 completadas (excepto Instagram y WhatsApp producción)
**Entorno de producción:** Render (API) + Vercel (Frontend) + Supabase (PostgreSQL) — ACTIVO

---

## QUÉ ESTÁ HECHO Y FUNCIONANDO EN PRODUCCIÓN

### Infraestructura y autenticación
- Login con JWT + refresh token (accessToken 7 días, refreshToken 30 días)
- Interceptor Axios renueva el token automáticamente antes de cerrar sesión
- JWT_SECRET y JWT_REFRESH_SECRET estables en Render (sync: false) — no se regeneran al reiniciar
- Roles: SUPERADMIN, CLIENT_ADMIN, AGENT
- Impersonación con acceso de soporte autorizado (ver abajo) — ya NO es acceso libre
- Rate limiting, CORS, Helmet, compresión configurados

### Panel Superadmin
- Dashboard con KPIs globales agregados (sin datos personales de leads): clientes activos, bots activos, conversaciones hoy, leads del mes, leads sin responder, widgets instalados, WhatsApp conectados, solicitudes/accesos de soporte
- Crear, editar, activar/desactivar clientes
- Tabla de clientes: estado, plan, bot/widget/WhatsApp conectado, leads y conversaciones del mes, leads sin responder, score comercial, estado de soporte
- Ver cuenta de cada cliente (detalle con usuarios y canales, edición inline)
- Integraciones: estado de canales conectados por cliente
- Auditoría de accesos: registro de cada vez que un admin entra a una cuenta de cliente
- Menú: Dashboard global, Clientes, Integraciones, Auditoría de accesos, Configuración (gestión de superadmins)

### Acceso de soporte con autorización (2026-07-02)
Por ley de protección de datos, el superadmin NO puede ver los leads/conversaciones de un cliente sin que el cliente lo autorice:
- **"Entrar como cliente"** ahora se autorregula del lado del servidor según si hay un `SupportAccessGrant` activo:
  - Sin grant activo → entra en **modo limitado** (sin Leads/Conversaciones/Remarketing en el menú del cliente; el backend bloquea esos endpoints con 403 aunque se fuerce la URL)
  - Con grant activo → entra en **modo soporte** (acceso completo, banner visible, expira con el grant o en 1h, lo que sea antes)
- El cliente autoriza el acceso desde `Configuración → Acceso de soporte`: puede otorgarlo proactivamente (1h/24h/7 días), o aprobar/rechazar una solicitud que el admin mandó desde la tabla de Clientes
- El cliente puede revocar el acceso en cualquier momento
- Un admin impersonando (modo limitado o soporte) NUNCA puede aprobarse/otorgarse acceso a sí mismo — esas acciones están bloqueadas si el token tiene `impersonatedBy`
- Todo acceso (limitado o soporte) queda registrado en `AdminAccessLog`, visible en Auditoría de accesos

### Panel del Cliente — Dashboard
- 4 KPIs: conversaciones hoy, activas ahora, total leads, score de salud
- 3 cards de temperatura: Frío / Tibio / Caliente con conteo
- Gráfica de barras: conversaciones últimos 7 días
- Accesos rápidos a conversaciones y configuración

### Panel del Cliente — Conversaciones
- Lista con búsqueda y filtros (temperatura, esperando agente)
- Chat en tiempo real con Socket.io
- Burbujas diferenciadas: usuario (gris), bot (dorado), agente (verde)
- Botón "Tomar control" / "Devolver bot" — actualiza UI en tiempo real vía socket
- Caja de respuesta del agente (solo visible en modo AGENT_ACTIVE)
- Banner "Esperando agente" cuando el lead solicitó atención humana
- Badge en sidebar con conteo de conversaciones esperando agente
- Sonidos: 4 pitidos para alertas urgentes, 1 pitido suave para mensajes nuevos
- **Mi perfil:** el cliente (y el superadmin en su Configuración) puede editar su nombre/email y cambiar su contraseña (pide la actual). Si su cuenta se creó con contraseña genérica (por un admin), ve un aviso — modal al entrar + aviso en la pantalla — invitándolo a cambiarla. Este aviso nunca aparece durante una sesión impersonada
- **Sistema de citas/agendamiento:** formulario estructurado de cita (detección por código, no depende de la IA); al agendar cierra la conversación y la mueve a "Agendados"; estados Pendiente/Atendido/Cancelado con historial; notas editables, botón Desagendar; filtro "Agendados" en Leads

### Panel del Cliente — Configuración
- **Mi negocio**: nombre, descripción, servicios, precios, horarios, ubicación, FAQs, palabras clave de escalado, mensaje de bienvenida, objetivo de conversión (dropdown: agendar citas / visitar local / tomar pedidos / derivar llamada / solo informar)
- **Agentes**: tabla, crear agente, activar/desactivar
- **Widget web**: código de inserción del webchat con preview

### Chatbot e IA (Fase 4 — COMPLETA)
- Módulo AIProvider modular: OpenAI y Anthropic intercambiables por cliente
- Responde usando la info completa del negocio (system prompt dinámico por cliente)
- Historial de últimos 20 mensajes como contexto
- Detección de palabras clave para escalar a humano (configurable por cliente)
- Detección de intención de cita/reserva → notificación al agente sin detener el bot
- Si un agente está atendiendo, el bot NO responde
- El bot cambia comportamiento según el objetivo de conversión del negocio
- Clasificación de temperatura:
  - Solo clasifica desde el 2do mensaje del usuario (no con un simple "Hola")
  - Solo sube automáticamente (COLD→WARM→HOT), nunca baja automáticamente
  - Para bajar: el agente lo cambia manualmente
  - "me gustaría agendar" = HOT; duda COLD/WARM → COLD

### Canales (Fase 5 — PARCIAL)
- **Webchat**: widget JS vanilla embebible con script tag, tiempo real con Socket.io, mensajes del agente aparecen en el chat del visitante, CORS abierto para sitios externos
- **WhatsApp**: funciona via Twilio Sandbox (solo para pruebas). Pendiente número real.
- **Instagram**: NO implementado

### Remarketing (Fase 6 — BÁSICO)
- Scheduler detecta leads inactivos y programa mensajes
- Cola BullMQ para envío programado
- Si el lead responde, sale del remarketing automáticamente
- Frontend: página de campañas básica

### Notificaciones y alertas
- Alertas vía Socket.io: HUMAN_REQUESTED, HOT_LEAD, APPOINTMENT_REQUESTED
- Push notifications via VAPID (service worker)
- PWA instalable en iPhone (iOS 16.4+): íconos dorados, meta tags Apple
- Popup de notificaciones solo en celular, se recuerda si el usuario lo cierra

---

## DECISIONES IMPORTANTES TOMADAS

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-10 | Stack: Node.js + Express + Next.js + PostgreSQL + Prisma + Socket.io | Estabilidad y tiempo real |
| 2026-04-10 | Hosting: Vercel + Render + Neon + Upstash | Sin costo para fase inicial |
| 2026-04-10 | Nombre: GoldenBot, colores dorado/ámbar | Elegido por el dueño |
| 2026-04-10 | IA modular (AIProvider) | Cambiar modelo sin reescribir código |
| 2026-04-22 | JWT secrets: sync: false en render.yaml | generateValue: true cerraba sesiones en cada deploy |
| 2026-04-22 | Socket.io CORS: origin '*' | El widget webchat se embebe en sitios externos |
| 2026-04-22 | Temperatura solo sube automáticamente | Agente la baja manual para no perder contexto |
| 2026-04-22 | Clasificar temperatura desde mensaje nro. 2 | Evitar que "Hola" suba el lead a Tibio |
| 2026-04-22 | Instagram/FB via API oficial de Meta únicamente | Evitar baneos — las cuentas son activos de clientes |
| 2026-07-01 | Base de datos migrada de Render Postgres a Supabase | El Postgres gratuito de Render expiró a los 30+14 días de creado y se BORRÓ por completo, tumbando el sitio. Supabase gratis solo se pausa (no borra) tras 7 días sin actividad, y se restaura con un clic |
| 2026-07-01 | Conexión a Supabase vía "Session Pooler" (IPv4), no conexión directa | La conexión directa de Supabase es IPv6-only y Render no tiene salida IPv6 — daba error P1001 "Can't reach database server" aunque la cadena estuviera bien escrita |
| 2026-07-01 | El panel superadmin NO debe tener vistas globales de leads/conversaciones (nombres, teléfonos, contenido de chats) de todos los clientes | Riesgo legal/privacidad: GoldenBot se vende a clientes como SaaS, y sus clientes no esperan que el operador de la plataforma navegue libremente los datos de sus propios leads. Para soporte puntual se usa "Entrar como cliente" (impersonación con token de 1h), que es una acción explícita y acotada, no una tabla siempre abierta. Aplica también a futuras secciones: cualquier vista a nivel superadmin debe mostrar solo datos agregados (conteos) o datos del cliente-negocio (no de los leads/clientes finales de cada cliente) |
| 2026-07-02 | Impersonación reemplazada por "acceso de soporte" con autorización del cliente (grant + modo limitado + auditoría) | Ir un paso más allá de solo quitar vistas globales: ni siquiera con "Entrar como cliente" el admin debía poder ver datos personales sin que el cliente lo autorice explícitamente. Ahora el servidor decide el modo (limitado/soporte) según si hay un `SupportAccessGrant` vigente — nunca confía en el botón que usó el frontend |

---

## INFORMACIÓN DEL DUEÑO — CONFIRMADA

- **Nombre plataforma:** GoldenBot
- **Hosting:** Vercel (frontend) + Render (backend/API) + Supabase (PostgreSQL, desde 2026-07-01)
- **Clientes iniciales:** 2-3 en los primeros 3 meses
- **WhatsApp:** Twilio Sandbox activo para pruebas. Pendiente: número real por cliente.
- **Instagram/Facebook:** Pendiente — requiere app en Meta for Developers + verificación de negocio
- **API keys:** OpenAI configurada en Render. Anthropic pendiente.
- **Idioma del panel:** Solo español
- **Dominio:** Pendiente. Buscar goldenbot.com / .io / .app

---

## PROBLEMAS CONOCIDOS

- WhatsApp Sandbox admite un solo webhook URL activo — para producción cada cliente necesita su propio número Twilio
- Push notifications en iPhone: requieren iOS 16.4+ y app instalada como PWA desde Safari
- Falta UI para ver el historial de cambios de temperatura del lead (el registro ya se guarda en TemperatureLog, solo falta mostrarlo)
- **Remarketing depende de que el servidor esté despierto:** el scheduler usa un `setInterval` interno (no Redis/BullMQ pese a que están instalados como dependencia — es código sin usar), así que se detiene cada vez que Render duerme el servicio por inactividad (plan gratuito). Se resuelve pasando a plan pago de Render cuando haya clientes reales. el código de `remarketing` requiere `REDIS_URL` (bullmq + ioredis), pero no se encontró un servicio Redis/Upstash en `render.yaml`. Falta verificar si el remarketing automático realmente está corriendo en producción o si esa variable está seteada manualmente en el dashboard de Render.
- **Incidente 2026-07-01:** el proyecto estuvo caído ~2 meses porque el Postgres gratuito de Render expiró (regla fija de 30+14 días desde su creación, no depende del uso) y se borró junto con todos sus datos (clientes, leads, conversaciones de prueba). Se recreó en Supabase, pero se perdió toda la información anterior — no había respaldo. **Pendiente:** definir una rutina de respaldo o pasar a un plan pago antes de tener clientes reales con datos que no se puedan perder.

---

## PRÓXIMOS PASOS

1. **Cambio manual de temperatura** en la página de leads
2. **WhatsApp producción** — número real de Twilio, configuración por cliente
3. **Instagram y Facebook** — API oficial de Meta, OAuth por cliente, DMs + comentarios en bandeja unificada
4. **Métricas avanzadas** — predicción de ventas, historial de temperatura, funnel
