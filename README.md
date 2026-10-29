# CTT Bot — Ecosistema conversacional FISEI-UTA

Agente de ventas en Telegram para el Centro de Transferencia Tecnológica (CTT) de la FISEI-UTA, más el panel web **Colmena** (handover humano en tiempo real).

Repositorio: https://github.com/josephch28/ctt-bot

## Arquitectura

```
Telegram  →  bot (grammY, long polling)
                 │
                 ├─ LLM (SDK openai → xAI)
                 ├─ STT (Whisper compatible, opcional)
                 └─ Supabase (service_role)
                        │
                        ├─ Postgres (cursos, FAQs, conversaciones, mensajes)
                        └─ Realtime
                               │
                         dashboard (Vite + React)
                         (solo anon key; no habla con el bot)
```

| Parte | Rol |
| --- | --- |
| `bot/` | Canal Telegram, pipeline de ventas, guardias, handover. |
| `scraper/` | Extrae el catálogo del sitio CTT, normaliza con LLM y hace seed. |
| `dashboard/` | Panel Colmena: conversaciones, métricas y cursos. |
| `supabase/` | Migraciones SQL (Postgres + Realtime + RLS). |

El dashboard **solo** se conecta a Supabase. El bot es el único proceso que habla con Telegram y con el LLM.

## Requisitos

- Node.js 22+
- npm (workspaces)
- Cuenta de Supabase, bot de Telegram y clave de xAI

## Configuración

1. Copia `.env.example` a `.env` en la raíz (bot y scraper leen esas variables).
2. Copia las variables `VITE_*` a `dashboard/.env.local`.
3. No subas `.env` ni `.env.local`. Nunca pegues claves en el código.

## Cómo correr cada parte

Instalación (desde la raíz, cuando existan dependencias):

```bash
npm install
```

**Bot** (long polling):

```bash
npm run bot
```

**Scraper** (etapas posteriores: scrape → normalize → seed):

```bash
npm run scrape -w scraper
npm run normalize -w scraper
npm run seed -w scraper
```

**Dashboard Colmena**:

```bash
npm run dashboard
```

**Migraciones Supabase**: se aplican en la etapa 2 con el CLI o el MCP de Supabase (`supabase/migrations/`).

## Convenciones

- TypeScript estricto en bot y scraper (`tsx` para ejecutar).
- Datos de cursos: solo lo que esté en la base; no inventar precios, descuentos ni fechas.
- Commits por etapa, mensajes convencionales.
