# CLAUDE.md — Referencia Permanente del Proyecto

## LEER ESTO AL INICIO DE CADA SESIÓN

Este archivo contiene toda la información permanente del proyecto.
Leer MEMORY.md para ver el estado actual y TASKS.md para las tareas pendientes.

---

## DESCRIPCIÓN DEL PROYECTO

**Nombre de la plataforma:** GoldenBot

Plataforma SaaS multicliente que combina:
- CRM (gestión de leads y conversaciones)
- Chatbot inteligente con IA
- Dashboard de métricas en tiempo real

**Modelo de negocio:** El dueño (superadmin) vende acceso a la plataforma a sus clientes
como servicio mensual. Es una agencia de marketing digital que ya ofrece Meta Ads y Google Ads.

---

## EL DUEÑO / SUPERADMIN

- Dueño de agencia de marketing digital
- No tiene experiencia en programación pero sabe subir proyectos a servidores VPS Linux
- Claude construye el código, el dueño maneja el despliegue
- Comunicación siempre en español simple y claro

---

## NIVELES DE ACCESO

### Nivel 1 — SUPERADMIN (el dueño)
- Panel global con todos los clientes
- Agregar, editar, eliminar clientes
- Acceder al panel de cualquier cliente
- Métricas globales de toda la plataforma
- Configurar precios y planes por cliente
- Ver estado técnico de cada cliente

### Nivel 2 — CLIENTE (cada cliente individual)
- Login independiente, solo ve su propia información
- Conversaciones en tiempo real
- Leads clasificados por temperatura
- Gestión de agentes humanos propios
- Dashboard de métricas propio
- Configuración del negocio (alimenta al bot)

---

## FUNCIONALIDADES PRINCIPALES

1. **Centralización de mensajes** — WhatsApp, Instagram y Webchat en una bandeja unificada
2. **Chatbot con IA** — Responde con información específica del negocio del cliente
3. **Clasificación de leads** — Frío / Tibio / Caliente (automática + manual)
4. **Escalado a humano** — Alerta cuando un lead está caliente, toma de control manual
5. **Remarketing automático** — Seguimiento programado a leads inactivos
6. **Dashboard de métricas** — Tiempo real, comparación mensual, score de salud 0-100
7. **Reporte de competencia** — Mensual automático (palabras clave, actividad en redes)
8. **Alertas automáticas** — Lead caliente sin respuesta, gasto anormal en ads, etc.
9. **Predicción de ventas** — Basada en datos históricos del cliente
10. **Mapa del viaje del cliente** — Visual del camino desde anuncio hasta compra

---

## ARQUITECTURA DE IA

El sistema usa múltiples modelos según la tarea. Diseño modular: cambiar de modelo
no requiere reescribir código, solo cambiar la configuración del módulo.

| Tarea | Modelo | Proveedor |
|-------|--------|-----------|
| Chatbot (respuestas simples, plan básico) | GPT-4o mini | OpenAI |
| Chatbot (respuestas avanzadas, plan premium) | GPT-4o | OpenAI |
| Clasificación de temperatura de leads | Claude Haiku / Sonnet | Anthropic |
| Generación de reportes y análisis | Claude Sonnet | Anthropic |
| Generación de contenido marketing | Claude Sonnet o GPT-4o | Configurable |

**Regla:** Cada módulo de IA es independiente. Se puede asignar modelo diferente
por cliente según su plan.

---

## CANALES DE MENSAJERÍA

| Canal | API | Estado |
|-------|-----|--------|
| WhatsApp Business | Meta Cloud API | Por conectar (requiere aprobación Meta) |
| Instagram Direct | Meta Graph API | Por conectar |
| Webchat | Widget propio embebible | Por construir |

El sistema debe estar preparado para agregar más canales sin rehacerla arquitectura.
Patrón: cada canal implementa una interfaz común `MessageChannel`.

---

## PLANES Y PRECIOS POR CLIENTE

### Plan Básico
- Chatbot: GPT-4o mini
- 500 conversaciones/mes
- 1 canal: WhatsApp
- Dashboard básico de métricas

### Plan Profesional
- Chatbot: Claude API
- 2,000 conversaciones/mes
- 2 canales: WhatsApp + Instagram
- Dashboard completo
- Alertas automáticas
- Remarketing básico

### Plan Premium
- Todos los modelos de IA optimizados
- Conversaciones ilimitadas
- Todos los canales (WhatsApp + Instagram + Webchat)
- Dashboard completo con predicciones
- Remarketing avanzado
- Reporte de competencia mensual
- Mapa del viaje del cliente

---

## STACK TECNOLÓGICO

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **ORM:** Prisma
- **Base de datos:** PostgreSQL 16
- **Caché / Cola de tareas:** Redis + BullMQ
- **Tiempo real:** Socket.io
- **Autenticación:** JWT + bcrypt (roles: superadmin, client, agent)

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** Tailwind CSS + shadcn/ui
- **Estado global:** Zustand
- **Gráficas:** Recharts
- **Cliente HTTP:** Axios + React Query

### IA
- **OpenAI:** openai npm SDK
- **Anthropic:** @anthropic-ai/sdk npm SDK
- **Patrón:** Módulo AIProvider con implementaciones intercambiables

### Infraestructura
- **Desarrollo local:** Docker + Docker Compose (docker-compose.dev.yml)
- **Producción fase inicial (0-10 clientes):**
  - Frontend: Vercel (gratis, auto-deploy desde GitHub)
  - Backend + PostgreSQL + Redis: Railway (gratis hasta cierto uso, soporta WebSockets y procesos persistentes)
  - Archivos/imágenes: Cloudinary (free tier)
- **Producción fase escala (10+ clientes):** Migrar a VPS Linux + Nginx (el código no cambia)
- **Almacenamiento:** Cloudinary free tier (MinIO descartado para fase inicial)

### Herramientas de desarrollo
- **Lenguaje:** TypeScript (backend y frontend)
- **Linter:** ESLint + Prettier
- **Tests:** Jest (unitarios) + Supertest (integración)

---

## ESTRUCTURA DE CARPETAS

```
crm-chatbot/
├── apps/
│   ├── api/                        # Backend Node.js + Express
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # Autenticación y JWT
│   │   │   │   ├── clients/        # Gestión de clientes (multitenancy)
│   │   │   │   ├── conversations/  # Bandeja de mensajes
│   │   │   │   ├── leads/          # CRM y clasificación de leads
│   │   │   │   ├── chatbot/        # Lógica del bot y escalado
│   │   │   │   ├── ai/             # Módulo de IA (OpenAI + Anthropic)
│   │   │   │   ├── channels/       # WhatsApp, Instagram, Webchat
│   │   │   │   ├── remarketing/    # Automatización y cola de mensajes
│   │   │   │   ├── metrics/        # Dashboard y reportes
│   │   │   │   ├── alerts/         # Sistema de alertas
│   │   │   │   └── predictions/    # Predicción de ventas
│   │   │   ├── shared/             # Middlewares, utils, tipos comunes
│   │   │   ├── config/             # Variables de entorno y configuración
│   │   │   └── server.ts           # Entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Esquema de base de datos
│   │   │   └── migrations/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                        # Frontend Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/         # Páginas de login
│       │   │   ├── superadmin/     # Panel del superadmin
│       │   │   └── dashboard/      # Panel del cliente
│       │   ├── components/
│       │   │   ├── ui/             # Componentes base (shadcn)
│       │   │   ├── conversations/  # Bandeja de mensajes
│       │   │   ├── leads/          # Tarjetas y tablas de leads
│       │   │   ├── metrics/        # Gráficas y KPIs
│       │   │   └── chatbot/        # Configuración del bot
│       │   ├── lib/                # Utils y helpers
│       │   ├── hooks/              # Custom React hooks
│       │   └── store/              # Estado global (Zustand)
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── shared-types/               # Tipos TypeScript compartidos entre apps
│
├── infrastructure/
│   ├── docker-compose.yml          # Orquestación local/producción
│   ├── docker-compose.dev.yml      # Solo desarrollo
│   ├── nginx/
│   │   └── nginx.conf
│   └── scripts/
│       ├── setup.sh                # Script de instalación inicial en VPS
│       └── backup.sh               # Script de respaldo de base de datos
│
├── docs/
│   ├── instalacion.md              # Guía paso a paso para subir al servidor
│   └── apis.md                     # Documentación de endpoints
│
├── CLAUDE.md                       # Este archivo
├── MEMORY.md                       # Estado actual del proyecto
├── TASKS.md                        # Lista de tareas
└── .env.example                    # Variables de entorno de ejemplo
```

---

## REGLAS DE TRABAJO (NO NEGOCIABLES)

1. **Modular:** Construir módulo por módulo, nunca todo junto
2. **Probar primero:** Cada módulo se prueba antes de pasar al siguiente
3. **Actualizar MEMORY.md y TASKS.md** al final de cada sesión de trabajo
4. **Avisar antes de riesgos:** Si algo puede fallar o romper, avisar antes de hacer
5. **Español simple:** Explicar siempre en lenguaje claro, no técnico
6. **Opciones claras:** Si hay varias formas de hacer algo, explicar las opciones
7. **Leer contexto:** Al inicio de cada sesión nueva leer CLAUDE.md y MEMORY.md
8. **No romper lo que funciona:** Al agregar algo nuevo, verificar que lo anterior sigue funcionando
9. **Multitenancy primero:** Todo el código debe contemplar aislamiento de datos por cliente desde el inicio
10. **TypeScript estricto:** Usar tipos en todo, nunca `any` sin justificación

---

## MULTITENANCY — REGLA DE ORO

Cada tabla en la base de datos que tenga datos de cliente DEBE tener `clientId`.
Los datos de un cliente NUNCA son visibles para otro cliente.
El middleware de autenticación valida `clientId` en cada request.

---

## FASES DE CONSTRUCCIÓN

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1 | Cimientos: BD, Auth, estructura | Pendiente |
| 2 | Panel Superadmin | Pendiente |
| 3 | Panel del Cliente | Pendiente |
| 4 | Chatbot e IA | Pendiente |
| 5 | Canales de mensajería | Pendiente |
| 6 | Automatizaciones | Pendiente |
| 7 | Métricas y Reportes | Pendiente |
| 8 | Preparación producción | Pendiente |

---

## INFORMACIÓN DEL DUEÑO — CONFIRMADA

- **Hosting inicial:** Vercel (frontend) + Railway (backend + BD + Redis). Sin VPS por ahora.
- **Clientes iniciales:** 2-3 en los primeros 3 meses.
- **WhatsApp Business API:** NO configurada. Tiene Meta Business Manager para ads (es diferente). Configurar en Fase 5.
- **API keys IA:** Ninguna todavía. Conseguir cuando llegue Fase 4.
- **Idioma:** Solo español.
- **Competencia:** Google Trends + Claude API (sin herramientas de pago).

## INFORMACIÓN PENDIENTE DE CONFIRMAR

- [x] Nombre de marca: **GoldenBot** ✓
- [ ] Dominio (buscar oldenbot.com / oldenbot.io / oldenbot.app)
- [ ] Colores y logo de la plataforma
