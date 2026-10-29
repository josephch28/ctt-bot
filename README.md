# CTT Bot — Ecosistema conversacional FISEI-UTA

Agente de ventas en Telegram (**Abeja**) para el Centro de Transferencia Tecnológica (CTT) de la FISEI-UTA, más el panel web **Colmena** (handover humano en tiempo real).

Repositorio: https://github.com/josephch28/ctt-bot

## Arquitectura

```
Telegram  →  bot (grammY, long polling)
                 │
                 ├─ LLM (SDK openai → Groq u otro compatible)
                 ├─ STT (Whisper compatible, opcional)
                 └─ Supabase (service_role; en hackatón puede caer a anon)
                        │
                        ├─ Postgres (cursos, FAQs, conversaciones, mensajes)
                        └─ Realtime
                               │
                         dashboard (Vite + React)
                         (solo anon key; no habla con el bot)
```

| Parte | Rol |
| --- | --- |
| `bot/` | Canal Telegram, pipeline de ventas, vigencia de cursos, guardias, handover. |
| `scraper/` | Extrae el catálogo del sitio CTT, normaliza con LLM y hace seed. |
| `dashboard/` | Panel Colmena: conversaciones, métricas y cursos. |
| `supabase/` | Migraciones SQL (Postgres + Realtime + RLS). |

El dashboard **solo** se conecta a Supabase. El bot es el único proceso que habla con Telegram y con el LLM.

Abeja **solo recomienda ediciones abiertas a inscripción** (no convocatorias vencidas). El panel Colmena sigue mostrando el catálogo completo para edición.

## Requisitos

- Node.js 22+
- npm (workspaces)
- Proyecto Supabase, bot de Telegram y clave de un LLM compatible con el SDK OpenAI (p. ej. Groq)

## Configuración

1. Copia `.env.example` a `.env` en la raíz (bot y scraper leen esas variables).
2. Copia las variables `VITE_*` a `dashboard/.env.local`.
3. Pega `SUPABASE_SERVICE_ROLE_KEY` en el `.env` de la raíz (el bot hoy puede usar la anon key si aún no está).
4. No subas `.env` ni `.env.local`. Nunca pegues claves en el código.

`LLM_BASE_URL` y `LLM_MODEL` son configurables. Ejemplo Groq:

```
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
```

## Cómo correr cada parte

```bash
npm install
```

**Bot** (long polling):

```bash
npm run bot
```

**Scraper**:

```bash
npm run scrape -w scraper
npm run normalize -w scraper
npm run seed -w scraper
```

**Dashboard Colmena**:

```bash
npm run dashboard
```

**Verificación (etapa 6)**:

```bash
npm run typecheck -w bot
npm run typecheck -w scraper
npm run build -w dashboard
```

**Migraciones Supabase**: `supabase/migrations/` (CLI o MCP).

## Despliegue

- **Colmena** (estático): Vercel, raíz `dashboard/` (build Vite, `vercel.json` con rewrite SPA). Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- **Bot** (siempre encendido): worker en Render. Blueprint: `render.yaml`. Deeplink: [crear Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/josephch28/ctt-bot). Completa los secretos (`sync: false`) en el dashboard de Render y pulsa Apply.

## Convenciones

- TypeScript estricto en bot y scraper (`tsx` para ejecutar).
- Datos de cursos: solo lo que esté en la base; no inventar precios, descuentos ni fechas.
- Commits por etapa, mensajes convencionales.
