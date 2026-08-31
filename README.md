# To-Day

Full-stack todo app built with Vue 3 (Vite) + Node.js (Express) + Supabase, following the Repository Pattern for easy database migration.

**Version:** 1.0.7

## Features

- Vue 3 frontend with SAP UI5 Web Components (Fiori design)
- Node.js API with Express 5
- Repository Pattern + Provider/Adapter Layer (swap Supabase → Firebase/MongoDB without touching business logic)
- Notification system (in-app notifications e.g. shared list invites)
- Shared todo lists with per-user membership
- Profile menu with avatar in the shellbar
- Security middleware: `helmet`, `compression`, `rate-limit`
- Input validation with `zod`
- Optimistic UI updates
- In-memory provider for local development without a database

## Architecture

```
server/src/
├── config/             # Runtime settings (DB_PROVIDER, AUTH_MODE, etc.)
├── providers/          # External service clients (Supabase — only place it's imported)
├── repositories/
│   ├── *.js            # Abstract base classes
│   ├── supabase/       # Supabase implementations
│   └── memory/         # In-memory implementations
├── services/           # Business logic
├── controllers/        # HTTP request/response handling
├── routes/             # Express routers
├── middleware/         # Auth middleware
└── index.js

client/src/
├── providers/          # Supabase client (only place it's imported)
├── services/           # authService, apiClient, todoApi, listApi, notificationApi
└── App.vue
```

## Requirements

- Node.js LTS (npm included)

## Run locally

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## Environment

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.

### Key settings

| Variable | Values | Description |
|---|---|---|
| `DB_PROVIDER` | `supabase` \| `memory` | Database provider |
| `DB_STRICT` | `true` \| `false` | Fail on provider error or fallback to memory |
| `AUTH_MODE` | `auto` \| `supabase` \| `dev` | Auth strategy (`auto` picks based on DB_PROVIDER) |

## Supabase setup

Run `supabase/migration.sql` in the Supabase SQL editor to create all tables:
- `todos`
- `todo_lists`
- `list_members`
- `notifications`

## Setup diagnostics

```bash
curl http://localhost:3000/api/setup-check
```

## Changelog

### v1.0.7
- Facebook Login (Supabase OAuth provider)
- Messenger webhook scaffold (`/api/webhooks/messenger`) with signature verification

### v1.0.1
- Repository Pattern + service/controller/route layers
- Notification system with `list_shared` events
- Profile menu with avatar in shellbar
- Dynamic version from `package.json`
- Renamed to To-Day

### v1.0.0
- Initial release: Vue 3 + Express + Supabase todo app
- Shared lists, Fiori UI5 design, Docker support


- `200` means current DB/auth setup is ready.
- `503` means one or more checks failed, with detailed messages in `checks`.

## Supabase table setup

Run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.todos (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	text text not null check (char_length(text) between 1 and 200),
	completed boolean not null default false,
	created_at timestamptz not null default now()
);

create index if not exists todos_user_id_created_at_idx on public.todos (user_id, created_at desc);
```

Enable Google provider in Supabase Auth settings to use OAuth login.
