# TASKS.md — Lista Completa de Tareas

> Leyenda: [ ] Pendiente | [~] En progreso | [x] Completado | [!] Bloqueado
> Actualizar al final de cada sesión de trabajo.

---

## FASE 1 — CIMIENTOS ✅ COMPLETADA

- [x] Monorepo, estructura de carpetas, package.json raíz con workspaces
- [x] Backend: Express + TypeScript + Prisma + Socket.io + Redis
- [x] Frontend: Next.js 14 + Tailwind + Zustand + Axios
- [x] Esquema Prisma completo: Client, User, BusinessInfo, Channel, Lead, TemperatureLog, Conversation, Message, AIConfig, RemarketingCampaign, RemarketingQueue, Alert
- [x] Auth: login, refresh token, JWT con roles, middleware authenticate/authorize
- [x] CORS, Helmet, rate limiting, logging (morgan + winston)
- [x] Health check endpoint
- [x] Docker Compose para desarrollo local (PostgreSQL + Redis)
- [x] Seed: superadmin + cliente demo

---

## FASE 2 — PANEL SUPERADMIN ✅ COMPLETADA

- [x] API: CRUD de clientes, impersonación, métricas globales
- [x] Componentes UI: Badge, Button, Input, Select, Modal
- [x] Dashboard superadmin con KPIs globales
- [x] Lista de clientes con búsqueda y acciones
- [x] Modal "Nuevo cliente" con slug auto-generado
- [x] Página de detalle del cliente con edición inline
- [x] Impersonation + banner de retorno en el panel del cliente

---

## FASE 3 — PANEL DEL CLIENTE ✅ COMPLETADA

- [x] API: métricas dashboard, lista de conversaciones, detalle, take-over, release, mensajes del agente
- [x] API: configuración del negocio (get/put), agentes (list/create/toggle)
- [x] Layout del dashboard con sidebar responsive (desktop + drawer móvil)
- [x] Dashboard: KPIs, cards de temperatura, gráfica 7 días, score de salud, accesos rápidos
- [x] Conversaciones: split panel lista+chat, filtros, burbujas diferenciadas, tomar control/devolver bot, respuesta del agente
- [x] Botón Devolver bot actualiza UI en tiempo real (socket + refetch)
- [x] Mi negocio: formulario completo con FAQs dinámicas, palabras clave, objetivo de conversión
- [x] Agentes: tabla, crear, activar/desactivar
- [x] Widget web: página con código de inserción
- [x] Mi perfil: editar nombre/email, cambiar contraseña (pide la actual); aviso de "cambia tu contraseña genérica" al primer login para cuentas creadas por un admin (cliente, agente o superadmin) — nunca se muestra durante una sesión impersonada (2026-07-02)
- [x] Checklist "Primeros pasos" en el Dashboard: cambiar contraseña, completar info del negocio, conectar un canal — se oculta sola al completarse (2026-07-03)

### Sistema de Citas/Agendamiento ✅ COMPLETO (agregado 2026-04-23/24)
- [x] Formulario de cita estructurado (detección 100% por código, no depende de la IA)
- [x] Al agendar, cierra la conversación automáticamente y la mueve a "Agendados"
- [x] Estados de cita: Pendiente / Atendido / Cancelado + historial
- [x] Fecha de agendado, notas editables, botón Desagendar
- [x] Filtro "Agendados" en Leads, badge "Agendado" en vez de temperatura
- [x] Ocultar conversaciones cerradas de la lista + fixes de duplicados/UX (respuesta de agente, detección de formulario en conversaciones largas)

---

## FASE 4 — CHATBOT E IA ✅ COMPLETADA

- [x] Interfaz AIProvider con métodos chat() y classify()
- [x] OpenAIProvider (GPT-4o mini y GPT-4o)
- [x] AnthropicProvider (Claude Haiku y Sonnet)
- [x] Factory getAIProvider(clientId) según plan del cliente
- [x] buildSystemPrompt() dinámico con datos del negocio
- [x] buildChatMessages() con historial de últimos 20 mensajes
- [x] Flujo completo: recibir → identificar cliente/lead/conversación → IA → guardar → emitir
- [x] Detección de palabras clave para escalado a humano
- [x] Detección de intención de cita/reserva (si el negocio lo requiere)
- [x] Bot no responde si hay agente activo
- [x] Clasificación de temperatura con IA (desde el 2do mensaje del usuario)
- [x] Temperatura solo sube automáticamente, nunca baja
- [x] Historial de cambios de temperatura (TemperatureLog)
- [x] Alertas en tiempo real: HOT_LEAD, HUMAN_REQUESTED, APPOINTMENT_REQUESTED
- [x] Sistema de prompts adaptado al objetivo de conversión del negocio

---

## FASE 5 — CANALES DE MENSAJERÍA 🔄 EN PROGRESO

### Webchat ✅ COMPLETO
- [x] Widget JS vanilla embebible con script tag
- [x] Diseño con colores del cliente (primaryColor configurable)
- [x] Conexión Socket.io para recibir mensajes del agente en tiempo real
- [x] Endpoint POST /webchat/message + GET /webchat/config/:slug
- [x] CORS abierto para todos los orígenes (widget va en sitios externos)
- [x] conversationId devuelto en respuesta para que el widget se una al room de socket
- [x] Página de generación del código de inserción en el panel

### WhatsApp 🔄 PARCIAL
- [x] Webhook POST /webhook/whatsapp recibe mensajes de Twilio
- [x] Envío de respuestas del bot via Twilio
- [x] Envío de mensajes del agente via Twilio
- [x] Funcionando con Twilio Sandbox para pruebas
- [ ] **Número real de WhatsApp Business** — cada cliente necesita su propio número Twilio
- [ ] Configuración de número Twilio por cliente en el panel del superadmin
- [ ] Plantillas de mensajes aprobadas por Meta para remarketing

### Instagram Direct [ ] PENDIENTE
- [ ] Crear app en Meta for Developers
- [ ] Completar Business Verification de Meta
- [ ] Solicitar permiso instagram_manage_messages via App Review
- [ ] OAuth: botón "Conectar Instagram" en el panel del cliente
- [ ] Webhook para recibir DMs de Instagram
- [ ] Enviar respuestas por Instagram Direct
- [ ] Gestión de comentarios en posts (leer + responder)
- [ ] Detección de palabras clave en comentarios → convertir en lead
- [ ] DM automático cuando alguien comenta algo específico

### Facebook Messenger [ ] PENDIENTE
- [ ] Misma app de Meta que Instagram
- [ ] Webhook para recibir mensajes de Messenger
- [ ] Enviar respuestas por Messenger
- [ ] Gestión de comentarios en posts de Facebook Page
- [ ] Bandeja unificada: WhatsApp + Instagram + Facebook + Webchat en un solo lugar

---

## FASE 6 — AUTOMATIZACIONES 🔄 BÁSICO

- [x] Scheduler BullMQ detecta leads inactivos y programa mensajes
- [x] Si el lead responde, sale del remarketing automáticamente
- [x] Frontend: página de campañas de remarketing básica
- [ ] Configuración por cliente: días de inactividad, plantillas de mensajes
- [ ] Panel completo de remarketing: crear campañas, ver estado, pausar/reanudar
- [ ] Alerta: lead caliente sin respuesta por más de 2 horas
- [ ] Alerta: lead frío sin contacto por X días configurables
- [ ] Historial de alertas en el panel

---

## FASE 7 — MÉTRICAS Y REPORTES [ ] PENDIENTE

- [x] Dashboard básico: conversaciones hoy, leads por temperatura, score de salud, gráfica 7 días
- [x] Cambio manual de temperatura desde el panel de leads (dropdown en tabla/tarjetas + endpoint PATCH /leads/:id/temperature, queda registrado en TemperatureLog)
- [ ] Historial de cambios de temperatura del lead (visualización en el panel de leads — el registro en TemperatureLog ya existe, falta la UI para mostrarlo)
- [ ] Tasa de conversión (leads → cierres)
- [ ] Tiempo promedio de respuesta del bot
- [ ] Gráfica: evolución mensual de conversaciones
- [ ] Predicción de ventas con Claude API
- [ ] Mapa del viaje del cliente (funnel visual)
- [ ] Reporte de competencia mensual automático

---

## PANEL SUPERADMIN — SUPERVISIÓN Y PRIVACIDAD ✅ COMPLETO (2026-07-01/02)

- [x] Dashboard global con KPIs agregados (sin datos personales), tabla de clientes ampliada (plan, bot/widget/WhatsApp, leads/conversaciones del mes, sin responder, score comercial, soporte)
- [x] Página Integraciones (estado de canales por cliente) y Configuración (perfil + gestión de superadmins: crear/editar/eliminar)
- [x] Quitadas del menú: Agentes, Leads globales, Conversaciones globales — exponían datos personales de leads/conversaciones de todos los clientes sin autorización del cliente
- [x] Acceso de soporte con autorización: el cliente otorga acceso (1h/24h/7 días) proactivamente o aprobando una solicitud del admin, desde `Configuración → Acceso de soporte`
- [x] "Entrar como cliente" ahora se autorregula: sin autorización vigente entra en modo limitado (sin Leads/Conversaciones/Remarketing, bloqueado también en el backend); con autorización entra en modo soporte completo
- [x] Auditoría de accesos: registro de cada entrada de un admin a una cuenta de cliente (modo, motivo, fecha)
- [x] Protección: un admin impersonando no puede aprobarse/otorgarse acceso a sí mismo

---

## FASE 8 — PREPARACIÓN PRODUCCIÓN [ ] PENDIENTE

- [ ] Revisión de seguridad: autenticación y autorización en todos los endpoints
- [ ] Validación Zod en todos los endpoints
- [ ] Índices en BD para queries frecuentes
- [ ] Caché Redis para BusinessInfo (no cambia frecuente)
- [ ] Documentación: guía de instalación, variables de entorno, respaldo de BD
- [ ] Script setup.sh para instalación en VPS Linux

---

## BACKLOG (después de las 8 fases)

- [ ] App móvil para agentes (React Native)
- [ ] Integración con Telegram
- [ ] Integración con email (IMAP/SMTP)
- [ ] Reportes exportables a PDF
- [ ] Panel de facturación y cobro automático (Stripe)
- [ ] A/B testing de mensajes del bot
