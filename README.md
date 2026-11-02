# AH HAO Pet Shop

Pet shop website for **AH HAO Pet Shop** (Pavilion Bukit Jalil) — browse pets & supplies, book grooming, enquire on WhatsApp, and manage the shop from an admin portal.

**Live:** [https://ahhaopetshop.vercel.app](https://ahhaopetshop.vercel.app)

## Features

### Public site
- Home, about, services, contact
- Shop pets (dogs / cats) with enquire via WhatsApp
- Pet supplies catalogue with category filters
- Grooming appointment booking (guest or member pricing)
- Daycare info page

### Members
- Sign up / login / reset password (Supabase Auth)
- Dashboard: profile, pets, bookings, notifications
- Appointment history & favourites

### Admin portal
- Members & bookings management
- Grooming services CRUD
- Pet listings (Listed / Unlisted / Sold)
- Supplies manager: categories, Active/Hidden, drag reorder, batch edit

## Stack

| Layer | Tech |
|--------|------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router |
| Backend | Supabase (Auth, Postgres, Storage, RLS) |
| Hosting | Vercel |
| Email | Supabase Auth mail + EmailJS (enquiries / booking notices) |

No Express / Mongo — the app talks to Supabase directly from the browser (anon key + RLS).

## Quick start

1. **Supabase** — create a project and run SQL files in `supabase/migrations/` in order. Full steps: [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).

2. **Env** — copy `.env.example` → `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

3. **Run locally**

```bash
npm install
npm run dev
```

Open [http://localhost:4000](http://localhost:4000).

```bash
npm run build    # production build → dist/
npm run preview  # preview the build
```

## Deploy (Vercel)

1. Import this GitHub repo into [Vercel](https://vercel.com).
2. Framework: **Vite** · Build: `npm run build` · Output: `dist`.
3. Add the same env vars as `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. In Supabase → **Authentication → URL Configuration**:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:** include  
     `https://your-app.vercel.app/**`,  
     `https://your-app.vercel.app/login`,  
     `https://your-app.vercel.app/reset-password`  
     (keep localhost URLs for local dev).

SPA routing is handled by `vercel.json`.

## Project layout

```
src/
  pages/          # Public, member, admin screens
  components/     # UI + managers (supplies, pets, nav…)
  services/       # apiService → Supabase
  contexts/       # Auth, navigation
  utils/          # Cache, dates, images
supabase/
  migrations/     # Postgres schema, RLS, seeds
docs/
  email-templates/
```

## Keep Supabase awake (free tier)

Free projects can pause after ~7 days idle. Options:

- **cron-job.org** (recommended) — GET `/auth/v1/health` with `apikey` header every few minutes/days  
- **GitHub Action** — `.github/workflows/keep-supabase-alive.yml` (needs repo secrets)

Details in [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md).

## License

Private shop project — all rights reserved.
