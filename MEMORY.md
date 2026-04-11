# MEMORY.md — Estado Actual del Proyecto

> Actualizar este archivo al final de cada sesión de trabajo.
> Fecha de última actualización: 2026-04-10

---

## ESTADO GENERAL

**Fase actual:** Fase 3 — Panel del Cliente (COMPLETADA)
**Progreso global:** ~40% — Cimientos + Superadmin + Panel Cliente completos

---

## QUÉ ESTÁ HECHO

### Sesión 1 — 2026-04-10 (Planificación)
- [x] Documento de requerimientos leído y analizado completamente
- [x] Stack tecnológico definido y justificado
- [x] Estructura de carpetas diseñada
- [x] Archivo CLAUDE.md creado con referencia permanente del proyecto
- [x] Archivo MEMORY.md creado
- [x] Archivo TASKS.md creado con todas las tareas organizadas
- [x] Preguntas respondidas por el dueño — información completa
- [x] Nombre de la plataforma definido: **GoldenBot**
- [x] Hosting elegido: Vercel + Render + Neon + Upstash (gratis)

### Sesión 2 — 2026-04-10 (Fase 1 — Cimientos)

#### Monorepo y estructura
- [x] Estructura completa de carpetas creada
- [x] `package.json` raíz con workspaces npm
- [x] `.gitignore` configurado
- [x] `.env.example` con todas las variables documentadas

#### Backend (`apps/api/`)
- [x] `package.json` con todas las dependencias
- [x] `tsconfig.json` con TypeScript estricto
- [x] `src/config/env.ts` — variables de entorno validadas al arrancar
- [x] `src/config/database.ts` — cliente Prisma singleton
- [x] `src/config/redis.ts` — conexión Redis con ioredis
- [x] `src/shared/utils/logger.ts` — Winston logger
- [x] `src/shared/types/express.d.ts` — tipos extendidos de Request
- [x] `src/shared/middlewares/authenticate.ts` — JWT + roles + aislamiento de cliente
- [x] `src/shared/middlewares/errorHandler.ts` — manejo global de errores + AppError
- [x] `src/modules/auth/auth.service.ts` — login, refresh token, getMe
- [x] `src/modules/auth/auth.routes.ts` — POST /auth/login, POST /auth/refresh, GET /auth/me
- [x] `src/modules/clients/clients.service.ts` — CRUD de clientes + impersonación + métricas globales
- [x] `src/modules/clients/clients.routes.ts` — endpoints de superadmin para gestionar clientes
- [x] `src/server.ts` — servidor Express + Socket.io + middlewares globales + rutas

#### Base de datos (`apps/api/prisma/`)
- [x] `schema.prisma` — esquema completo con todas las tablas:
  - Client, User, BusinessInfo, Channel, Lead, TemperatureLog
  - Conversation, Message, AIConfig
  - RemarketingCampaign, RemarketingQueue, Alert
- [x] `seed.ts` — crea superadmin + cliente demo con datos iniciales

#### Frontend (`apps/web/`)
- [x] `package.json` con Next.js 14 + Tailwind + Zustand + react-hook-form
- [x] `tsconfig.json`
- [x] `next.config.js` — rewrite del API
- [x] `tailwind.config.ts` — paleta GoldenBot (dorado + oscuros)
- [x] `postcss.config.js`
- [x] `src/lib/api.ts` — cliente Axios con interceptores de token
- [x] `src/lib/utils.ts` — función cn() para Tailwind
- [x] `src/store/authStore.ts` — Zustand: login, logout, loadFromStorage
- [x] `src/app/globals.css` — estilos base + clases reutilizables
- [x] `src/app/layout.tsx` — layout raíz con react-hot-toast
- [x] `src/app/page.tsx` — redirige según rol (superadmin → /superadmin, cliente → /dashboard)
- [x] `src/app/(auth)/login/page.tsx` — página de login completa con validación
- [x] `src/app/superadmin/layout.tsx` — sidebar + protección de ruta para superadmin
- [x] `src/app/superadmin/page.tsx` — dashboard con KPIs globales
- [x] `src/app/dashboard/page.tsx` — placeholder del panel del cliente (Fase 3)

#### Infraestructura
- [x] `infrastructure/docker-compose.dev.yml` — PostgreSQL 16 + Redis 7 para desarrollo local

### Sesión 3 — 2026-04-10 (Fase 2 — Panel Superadmin)

#### Componentes UI reutilizables (`apps/web/src/components/ui/`)
- [x] `Badge.tsx` — etiquetas de color (plan, estado, temperatura)
- [x] `Button.tsx` — variantes primary/secondary/danger/ghost + spinner de carga
- [x] `Input.tsx` — input con label, error y hint integrados
- [x] `Select.tsx` — select con las mismas capacidades
- [x] `Modal.tsx` — modal con overlay, cierre con Escape y scroll bloqueado

#### Hooks
- [x] `src/hooks/useClients.ts` — toda la lógica de clientes: listar, crear, editar, impersonar

#### Componentes de layout
- [x] `src/components/layout/ImpersonationBanner.tsx` — banner dorado cuando el superadmin está en el panel de un cliente

#### Páginas del Superadmin (Fase 2)
- [x] `/superadmin/layout.tsx` — sidebar mejorado con nav activa según ruta
- [x] `/superadmin/clients/page.tsx` — lista con búsqueda, métricas y acciones por cliente
- [x] `/superadmin/clients/NewClientModal.tsx` — formulario modal con slug auto-generado desde el nombre
- [x] `/superadmin/clients/[id]/page.tsx` — detalle: editar, activar/desactivar, ver panel, usuarios, canales

---

## QUÉ FALTA (resumen)

### Inmediato — Para poder probar localmente
- [ ] Instalar dependencias: `npm install` (desde la raíz)
- [ ] Copiar `.env.example` a `.env` y completar valores
- [ ] Levantar Docker: `docker-compose -f infrastructure/docker-compose.dev.yml up -d`
- [ ] Generar Prisma: `npm run db:generate` y `npm run db:migrate`
- [ ] Correr seed: `npm run db:seed`
- [ ] Probar que el login funciona

### Fase 4 — Chatbot e IA (siguiente)
### Fases 5-8 (pendientes)

---

## DECISIONES IMPORTANTES TOMADAS

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-04-10 | Node.js + Express para backend | Popular, estable, ideal para tiempo real |
| 2026-04-10 | Next.js 14 para frontend | Panel admin y cliente en mismo proyecto |
| 2026-04-10 | PostgreSQL como base de datos | Relacional, robusto, multitenancy con clientId |
| 2026-04-10 | Prisma como ORM | Evita errores de SQL manual, tipos TypeScript automáticos |
| 2026-04-10 | Redis + BullMQ para colas | Remarketing y alertas sin depender de servicios externos |
| 2026-04-10 | Socket.io para tiempo real | Conversaciones en vivo sin recargar página |
| 2026-04-10 | Docker solo para desarrollo local | BD + Redis local; Apps corriendo con npm run dev |
| 2026-04-10 | Patrón AIProvider modular | Cambiar de modelo IA sin reescribir código |
| 2026-04-10 | TypeScript en todo el proyecto | Menos errores, mejor mantenibilidad |
| 2026-04-10 | Vercel + Render + Neon + Upstash | Sin costo para fase inicial (2-3 clientes) |
| 2026-04-10 | Nombre: GoldenBot | Elegido por el dueño |
| 2026-04-10 | Colores: dorado/ámbar como primario | Consistente con el nombre GoldenBot |

---

## INFORMACIÓN DEL DUEÑO — CONFIRMADA

- **Nombre plataforma:** GoldenBot
- **Dominio:** No tiene todavía. Buscar goldenbot.com / .io / .app
- **Hosting:** Vercel (frontend) + Render (backend) + Neon (PostgreSQL) + Upstash (Redis)
- **Clientes iniciales:** 2-3 en los primeros 3 meses
- **WhatsApp Business API:** No configurada. Tiene Meta Business Manager para ads (diferente). Configurar en Fase 5.
- **API keys OpenAI / Anthropic:** No tiene aún. Conseguir cuando llegue Fase 4.
- **Idioma del panel:** Solo español.
- **Colores:** Dorado/ámbar (primary) + grises oscuros para el panel
- **Herramientas SEO:** Ninguna. Google Trends + Claude API para reportes de competencia.

---

## PROBLEMAS CONOCIDOS

- El proyecto aún NO fue instalado ni probado localmente. Siguiente paso: `npm install` y probar.
- La Fase 2 (lista de clientes) tiene el endpoint del API pero falta la página del frontend.

---

## NOTAS TÉCNICAS IMPORTANTES

### Multitenancy — Regla de oro
Cada tabla con datos de cliente tiene `clientId`.
El middleware `validateClientAccess` en `authenticate.ts` protege todos los endpoints.
El superadmin puede acceder a cualquier clientId. Los otros roles solo al suyo.

### Autenticación — Flujo
1. Login → recibe accessToken (7 días) + refreshToken (30 días)
2. Todos los requests llevan `Authorization: Bearer <accessToken>`
3. Si el token expira → el interceptor de Axios llama /auth/refresh
4. Si el refresh también expira → redirige al login

### Impersonación de clientes
El superadmin puede hacer POST /admin/clients/:id/impersonate
Recibe un token especial (1h) que funciona como si fuera el CLIENT_ADMIN del cliente.
Útil para entrar al panel del cliente a ver qué está pasando.

### Socket.io — Rooms
- `client:{clientId}` → todos los eventos de ese cliente
- `conversation:{conversationId}` → mensajes de una conversación específica

---

## PRÓXIMOS PASOS (siguiente sesión)

1. Instalar dependencias y probar que todo arranca localmente (prioridad antes de Fase 4)
2. Iniciar **Fase 4 — Chatbot e IA:**
   - Módulo AIProvider modular (OpenAI + Anthropic intercambiables)
   - Endpoint webhook que recibe mensajes de cualquier canal
   - Lógica de respuesta automática con contexto del negocio
   - Clasificación automática de temperatura con Claude
   - Detección de palabras clave para escalado a humano
