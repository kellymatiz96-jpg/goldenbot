# MEMORY.md — Estado Actual del Proyecto

> Actualizar este archivo al final de cada sesión de trabajo.
> Fecha de última actualización: 2026-04-22

---

## ESTADO GENERAL

**Fase actual:** Fase 5 parcialmente completa — chatbot, IA y canales funcionando en producción
**Progreso global:** ~65% — Fases 1-5 completadas (excepto Instagram y WhatsApp producción)
**Entorno de producción:** Render (API) + Vercel (Frontend) + Neon (PostgreSQL) — ACTIVO

---

## QUÉ ESTÁ HECHO Y FUNCIONANDO EN PRODUCCIÓN

### Infraestructura y autenticación
- Login con JWT + refresh token (accessToken 7 días, refreshToken 30 días)
- Interceptor Axios renueva el token automáticamente antes de cerrar sesión
- JWT_SECRET y JWT_REFRESH_SECRET estables en Render (sync: false) — no se regeneran al reiniciar
- Roles: SUPERADMIN, CLIENT_ADMIN, AGENT
- Impersonación: superadmin puede entrar al panel de cualquier cliente
- Rate limiting, CORS, Helmet, compresión configurados

### Panel Superadmin
- Dashboard con KPIs globales
- Crear, editar, activar/desactivar clientes
- Ver detalle de cada cliente con usuarios y canales
- Botón "Ver panel" con impersonation + banner de retorno

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

---

## INFORMACIÓN DEL DUEÑO — CONFIRMADA

- **Nombre plataforma:** GoldenBot
- **Hosting:** Vercel + Render + Neon + Upstash
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
- Cambio manual de temperatura del lead: el backend tiene el endpoint pero el frontend de leads aún no tiene esa UI

---

## PRÓXIMOS PASOS

1. **Cambio manual de temperatura** en la página de leads
2. **WhatsApp producción** — número real de Twilio, configuración por cliente
3. **Instagram y Facebook** — API oficial de Meta, OAuth por cliente, DMs + comentarios en bandeja unificada
4. **Métricas avanzadas** — predicción de ventas, historial de temperatura, funnel
