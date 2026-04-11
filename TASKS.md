# TASKS.md — Lista Completa de Tareas

> Leyenda: [ ] Pendiente | [~] En progreso | [x] Completado | [!] Bloqueado
> Actualizar al final de cada sesión de trabajo.

---

## FASE 1 — CIMIENTOS ✅ COMPLETADA
*Objetivo: Tener la base del proyecto funcionando con autenticación y base de datos*

### 1.1 Estructura del proyecto
- [x] Crear monorepo con carpeta raíz `crm-chatbot/`
- [x] Inicializar `apps/api/` con Node.js + Express + TypeScript
- [x] Inicializar `apps/web/` con Next.js 14 + TypeScript
- [x] Crear `.env.example` con todas las variables necesarias
- [x] Crear `docker-compose.dev.yml` para desarrollo local

### 1.2 Base de datos
- [x] Instalar y configurar Prisma
- [x] Crear tablas: Client, User, BusinessInfo, Channel, Lead, TemperatureLog
- [x] Crear tablas: Conversation, Message, AIConfig
- [x] Crear tablas: RemarketingCampaign, RemarketingQueue, Alert
- [ ] **PENDIENTE — HACER AHORA:** Correr primera migración (`npm run db:migrate`)
- [ ] **PENDIENTE — HACER AHORA:** Correr seed (`npm run db:seed`)

### 1.3 Autenticación
- [x] Crear endpoint `POST /auth/login`
- [x] Crear endpoint `POST /auth/refresh`
- [x] Crear endpoint `GET /auth/me`
- [x] Generar JWT con payload: userId, role, clientId
- [x] Middleware `authenticate` que valida el JWT
- [x] Middleware `authorize(role)` que verifica rol
- [x] Middleware `validateClientAccess` que asegura aislamiento de datos
- [x] Hash de contraseñas con bcrypt
- [x] Página de login en Next.js con validación
- [x] Redirección según rol (superadmin → /superadmin | cliente → /dashboard)

### 1.4 Configuración base del API
- [x] Configurar CORS, Helmet, Compression
- [x] Configurar manejo global de errores (AppError + ZodError)
- [x] Configurar rate limiting (100 req / 15 min)
- [x] Configurar logging (morgan + winston)
- [x] Configurar conexión a Redis
- [x] Configurar Socket.io en el servidor
- [x] Health check endpoint `GET /health`

---

## FASE 2 — PANEL SUPERADMIN ✅ COMPLETADA

### 2.1 API — Gestión de clientes
- [x] `GET /admin/clients` — listar todos los clientes con estado y métricas básicas
- [x] `POST /admin/clients` — crear nuevo cliente (con admin + AI config en transacción)
- [x] `GET /admin/clients/:id` — ver detalle de un cliente
- [x] `PUT /admin/clients/:id` — editar datos de un cliente
- [x] `POST /admin/clients/:id/impersonate` — token temporal (1h) para acceder al panel del cliente
- [x] `GET /admin/clients/metrics` — métricas globales de la plataforma

### 2.2 Frontend — Panel Superadmin
- [x] Componentes UI reutilizables: Badge, Button, Input, Select, Modal
- [x] Hook `useClients` con toda la lógica de llamadas al API
- [x] Sidebar actualizado con nav activa y avatar del usuario
- [x] Página `/superadmin` — dashboard con KPIs globales
- [x] Página `/superadmin/clients` — lista con búsqueda, métricas y acciones
- [x] Modal "Nuevo cliente" con slug auto-generado desde el nombre
- [x] Página `/superadmin/clients/[id]` — detalle completo con edición inline
- [x] Botón "Ver panel" con impersonation + banner de retorno en el panel del cliente
- [x] Indicadores de estado (activo/inactivo) y plan (Básico/Profesional/Premium)

---

## FASE 3 — PANEL DEL CLIENTE ✅ COMPLETADA

### 3.1 API
- [x] `GET /conversations/dashboard` — métricas: conversaciones hoy, leads por temperatura, score de salud, gráfica 7 días
- [x] `GET /conversations` — lista paginada con último mensaje y datos del lead
- [x] `GET /conversations/:id` — conversación completa con mensajes, marca como leído
- [x] `POST /conversations/:id/take-over` — agente toma el control
- [x] `POST /conversations/:id/release` — devolver al bot
- [x] `GET /client/business-info` — obtener configuración del negocio
- [x] `PUT /client/business-info` — guardar/actualizar info del negocio (upsert)
- [x] `GET /client/agents` — listar agentes y admins del cliente
- [x] `POST /client/agents` — crear agente con hash de contraseña
- [x] `PUT /client/agents/:id` — activar/desactivar agente

### 3.2 Frontend — Dashboard del cliente
- [x] Layout con sidebar, navegación activa e impersonation banner
- [x] Dashboard: 4 KPIs + 3 cards de temperatura + gráfica de barras 7 días + donut de temperatura
- [x] Score de salud del negocio (0-100) con color según nivel
- [x] Accesos rápidos a conversaciones y configuración

### 3.3 Frontend — Bandeja de conversaciones
- [x] Layout split: lista izquierda + chat derecho
- [x] Filtro por temperatura y búsqueda por nombre/teléfono
- [x] Burbujas de mensajes diferenciadas: usuario (gris), bot (dorado), agente (verde)
- [x] Botón "Tomar control" / "Devolver al bot"
- [x] Campo de respuesta del agente (Enter para enviar)
- [x] Actualización en tiempo real con Socket.io

### 3.4 Frontend — Configuración del negocio
- [x] Formulario completo: nombre, descripción, servicios, precios, horarios, ubicación
- [x] Sección de FAQ dinámica (agregar/eliminar preguntas)
- [x] Palabras clave para escalado (separadas por coma)
- [x] Mensaje de bienvenida personalizado
- [x] Indicador de cambios sin guardar

### 3.5 Frontend — Gestión de agentes
- [x] Tabla de agentes con rol, estado y acciones
- [x] Modal para agregar agente con validación
- [x] Activar/desactivar agentes
- [x] Panel explicativo de cómo funciona el escalado

---

## FASE 4 — CHATBOT E IA
*Objetivo: El bot responde automáticamente usando la info del negocio*

### 4.1 Módulo de IA (AIProvider)
- [ ] Crear interfaz `AIProvider` con métodos estándar
- [ ] Implementar `OpenAIProvider` (GPT-4o mini y GPT-4o)
- [ ] Implementar `AnthropicProvider` (Claude Haiku y Sonnet)
- [ ] Factory `getAIProvider(clientId)` que devuelve el proveedor según el plan
- [ ] Sistema de prompts: cargar `BusinessInfo` del cliente y construir system prompt
- [ ] Control de tokens y límite de conversaciones por plan

### 4.2 Lógica del chatbot
- [ ] Endpoint `POST /webhook/message` — recibir mensaje de cualquier canal
- [ ] Flujo: recibir → identificar cliente → identificar conversación → construir contexto → llamar IA → guardar respuesta → enviar respuesta
- [ ] Manejo de historial: los últimos N mensajes se incluyen como contexto
- [ ] Detección de palabras clave para pedir humano (configurable por cliente)
- [ ] Lógica de pausar/reanudar bot por conversación
- [ ] Control: si un agente está atendiendo, el bot no responde

### 4.3 Clasificación de temperatura
- [ ] Crear job que clasifica temperatura al recibir cada mensaje
- [ ] Usar Claude API para analizar el contexto de la conversación
- [ ] Prompt de clasificación: frío / tibio / caliente con justificación
- [ ] Guardar historial de cambios de temperatura
- [ ] Endpoint para cambio manual de temperatura: `PUT /leads/:id/temperature`

### 4.4 Escalado a humano
- [ ] Detección automática: si lead es "caliente", alertar a agentes
- [ ] Notificación en tiempo real a los agentes conectados (Socket.io)
- [ ] Endpoint `POST /conversations/:id/take-over` — agente toma control
- [ ] Endpoint `POST /conversations/:id/release` — devolver al bot
- [ ] El historial completo debe estar disponible al tomar control

---

## FASE 5 — CANALES DE MENSAJERÍA
*Objetivo: Conectar WhatsApp, Instagram y Webchat*

### 5.1 WhatsApp Business API
- [ ] Configurar webhook de Meta para recibir mensajes de WhatsApp
- [ ] Verificación del webhook (token de verificación)
- [ ] Recibir mensajes de texto de WhatsApp
- [ ] Enviar mensajes de texto por WhatsApp
- [ ] Recibir y manejar mensajes de media (imágenes, audios)
- [ ] Manejar plantillas de mensajes (para remarketing)
- [ ] Configuración de número de WhatsApp por cliente

### 5.2 Instagram Direct
- [ ] Configurar webhook de Meta para Instagram
- [ ] Recibir mensajes directos de Instagram
- [ ] Enviar respuestas por Instagram Direct
- [ ] Configuración de cuenta Instagram por cliente

### 5.3 Webchat (widget embebible)
- [ ] Crear widget de chat en JavaScript vanilla (sin dependencias)
- [ ] El widget se embebe con un `<script>` tag en el sitio del cliente
- [ ] Diseño limpio y personalizable (colores del cliente)
- [ ] Conexión WebSocket al servidor para tiempo real
- [ ] Endpoint público para recibir mensajes del webchat
- [ ] Página de generación del código de inserción en el panel del cliente

---

## FASE 6 — AUTOMATIZACIONES
*Objetivo: Remarketing automático y alertas programadas*

### 6.1 Sistema de remarketing
- [ ] Job periódico que detecta leads inactivos según criterios del cliente
- [ ] Configuración por cliente: días de inactividad para remarketing
- [ ] Plantillas de mensajes de remarketing por cliente
- [ ] Cola BullMQ para envío programado de mensajes
- [ ] Lógica: si el lead responde, sale del remarketing automáticamente
- [ ] Endpoint para activar/desactivar remarketing por lead
- [ ] Panel de control de campañas de remarketing en el frontend

### 6.2 Alertas automáticas
- [ ] Alerta: lead caliente sin respuesta por más de 2 horas
- [ ] Alerta: gasto en ads mayor al umbral configurado (requiere integración con Meta/Google)
- [ ] Alerta: lead frío sin contacto por X días configurables
- [ ] Alerta: momento de enviar remarketing
- [ ] Notificaciones en tiempo real en el panel (campana de alertas)
- [ ] Página de alertas con historial

---

## FASE 7 — MÉTRICAS Y REPORTES
*Objetivo: Dashboard completo con inteligencia del negocio*

### 7.1 Dashboard de métricas
- [ ] Conversaciones activas hoy
- [ ] Total leads por temperatura (frío/tibio/caliente)
- [ ] Tasa de conversión (leads → ventas)
- [ ] Tiempo promedio de respuesta del bot
- [ ] Comparación con mes anterior
- [ ] Score de salud del negocio (0-100, algoritmo propio)
- [ ] Gráfica: evolución diaria de conversaciones (último mes)
- [ ] Gráfica: embudo de conversión

### 7.2 Score de salud del negocio
- [ ] Definir algoritmo de scoring (tiempo de respuesta, tasa conversión, leads activos, etc.)
- [ ] Calcular score en tiempo real
- [ ] Mostrar indicador visual con color (rojo/amarillo/verde)
- [ ] Mostrar qué factores afectan el score

### 7.3 Predicción de ventas
- [ ] Recopilar datos históricos de conversaciones y ventas
- [ ] Usar Claude API para análisis y predicción
- [ ] Mostrar: ventas estimadas del mes, leads necesarios para la meta
- [ ] Mostrar: días de mayor actividad (heatmap)
- [ ] Mostrar: presupuesto sugerido en ads

### 7.4 Mapa del viaje del cliente
- [ ] Definir etapas del journey (anuncio → mensaje → conversación → venta)
- [ ] Calcular cuántos leads hay en cada etapa
- [ ] Mostrar en qué etapa exacta se pierden más leads
- [ ] Visualización tipo funnel con porcentajes de conversión entre etapas

### 7.5 Reporte de competencia
- [ ] Investigar APIs disponibles (Google Ads Transparency, redes sociales)
- [ ] Definir qué información se puede obtener legalmente
- [ ] Generar reporte mensual automático con Claude API
- [ ] Enviar reporte por email al cliente
- [ ] Mostrar reporte en panel del cliente

---

## FASE 8 — PREPARACIÓN PARA PRODUCCIÓN
*Objetivo: El proyecto está listo para subir al servidor*

### 8.1 Seguridad
- [ ] Revisar todos los endpoints con autenticación y autorización correcta
- [ ] Validación de inputs con Zod en todos los endpoints
- [ ] Sanitización de datos para prevenir XSS e inyección SQL
- [ ] Rate limiting por IP y por cliente
- [ ] Headers de seguridad con Helmet.js
- [ ] Variables de entorno: nunca hardcoded en el código
- [ ] Revisión de dependencias con npm audit

### 8.2 Rendimiento
- [ ] Índices en la base de datos para queries frecuentes
- [ ] Paginación en todas las listas (conversaciones, leads, etc.)
- [ ] Caché en Redis para datos que no cambian frecuente (info del negocio)
- [ ] Compresión gzip en Nginx

### 8.3 Docker y despliegue
- [ ] `Dockerfile` optimizado para el API
- [ ] `Dockerfile` optimizado para el frontend
- [ ] `docker-compose.yml` de producción completo
- [ ] Configuración de Nginx con SSL (Certbot / Let's Encrypt)
- [ ] Script `setup.sh` de instalación inicial en VPS limpio

### 8.4 Documentación
- [ ] Guía de instalación paso a paso en `docs/instalacion.md`
- [ ] Lista de variables de entorno con descripción
- [ ] Guía de cómo agregar un nuevo cliente
- [ ] Guía de respaldo y restauración de base de datos

---

## BACKLOG (ideas para después de las 8 fases)

- [ ] App móvil para agentes (React Native)
- [ ] Integración con Telegram
- [ ] Integración con email (IMAP/SMTP)
- [ ] Reportes exportables a PDF
- [ ] API pública para integraciones de terceros
- [ ] Panel de facturación y cobro automático (Stripe)
- [ ] Sistema de tickets de soporte interno
- [ ] A/B testing de mensajes del bot
