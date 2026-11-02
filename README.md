# AH HAO Pet Shop

Vite + React frontend powered by **Supabase** (Auth, Postgres, Storage).

## Setup

1. Create a Supabase project and run SQL in `supabase/migrations/` (see `SUPABASE_SETUP.md`)
2. Copy `.env.example` → `.env.local` and fill in keys
3. Install & run:

```bash
npm install
npm run dev
```

Open http://localhost:4000

## Stack

- Frontend: React, Vite, Tailwind, React Router
- Backend: Supabase (no Express / Mongo)
