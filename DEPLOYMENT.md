# Sparekei — Vercel + Supabase + Clerk Deployment Guide

## Do You Need Supabase?

**Yes, you absolutely need Supabase.** Here's why:

| Feature | Needs Supabase? |
|---------|----------------|
| Vehicles & Digital Vehicle Passport ledger | ✅ Yes |
| USNA service nodes, services & bookings | ✅ Yes |
| Marketplace listings, orders & hybrid cart | ✅ Yes |
| Reviews, RFQs, notifications | ✅ Yes |
| AI Reasoning & Learning Engine (ai_* tables, knowledge base) | ✅ Yes |
| User roles & permissions (RLS on every table) | ✅ Yes |
| Clerk handles | ❌ Auth only (login/signup) |

**Supabase is your database.** Clerk only handles authentication. Supabase stores all content, and also hosts the OpenAI Edge Functions that power the AI Brain.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite (SPA — deployed as static files) |
| Auth | Clerk (`@clerk/clerk-react`) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| AI | OpenAI via Supabase Edge Functions (server-only key) |
| Hosting | Vercel (auto-detects Vite via `vercel.json`) |
| Styling | Tailwind CSS + shadcn/ui |

---

## Step-by-Step Setup

### Step 1: Create / Confirm Supabase Project

1. Go to Supabase and open project `ujoskokvekykqvkkimbn` (or create a new one)
2. **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 2: Run the Database Schema

1. Supabase → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this repo, copy the **entire** contents, paste, click **Run**
3. Then open `supabase/migrations/0002_ai_engine.sql`, copy the **entire** contents, paste, click **Run**
4. This creates all business tables plus the AI engine tables (`ai_conversations`, `ai_tool_runs`, `ai_learnings`, `ai_alerts`, `knowledge_documents`)

### Step 3: Deploy the AI Edge Functions

Supabase CLI (or Dashboard):
```bash
supabase functions deploy ai-reason ai-learn ai-alert-cron ai-ingest --project-ref <your-project-ref>
supabase secrets set OPENAI_API_KEY=<your-openai-key> --project-ref <your-project-ref>
```

### Step 4: Set Up Clerk

1. clerk.com → your application → **API Keys**
2. Copy `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
3. Switch the instance from **Development** to **Production** for real users
4. After deploying (Step 6), add your domain under **Domains**

### Step 5: Configure Environment Variables (Vercel)

In Vercel → your project → **Settings → Environment Variables**, add:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, never used by the browser build
ADMIN_EMAIL=mwandabrands@gmail.com
```

> The codebase accepts both `NEXT_PUBLIC_*` (guide convention) and `VITE_*` names.
> `VITE_*` variables are baked in at build time — after changing any of them, **redeploy**.

### Step 6: Deploy to Vercel

1. Push this repo to GitHub (`Lumumba183/sparekei`)
2. vercel.com → **Add New Project** → import the repository
3. Vercel auto-detects **Vite** (configured in `vercel.json`)
4. Add all environment variables from Step 5
5. Click **Deploy** — site is live in ~2 minutes

### Step 7: Make Yourself Admin

**Automatic.** Register at `/register` with the email set in `ADMIN_EMAIL`
(default `mwandabrands@gmail.com`). The auth bridge grants the `admin` role on
first sign-in, unlocking Admin Center, Users, Cities and **AI Brain**.
(SQL fallback: `select bootstrap_admin('<clerk-user-id>');` in the SQL Editor.)

### Step 8: Connect Clerk ↔ Supabase (required for per-user security)

Supabase → **Authentication → Sign In / Providers → JWT Issuers → Add Issuer**:
paste your Clerk JWKS URL, e.g.
`https://<your-clerk-domain>/.well-known/jwks.json`

---

## Admin Panel Features

- **Dashboard** — vehicle management ("My Garage"), health status, quick actions
- **Marketplace** — parts catalog, cross-market aliases, hybrid cart
- **Services** — USNA Class A–D taxonomy, symptom search, booking with escrow status
- **Vehicle Passport** — tamper-evident service ledger, compliance, resale value
- **Emergency** — 24/7 dispatch request flow
- **Admin Center** — user management, roles, platform stats
- **AI Brain** (admin) — Reasoning Console (cited answers over live data),
  Learning Inbox (approve/reject), Predictive Alerts, Agent Run Log, Knowledge Base

---

## File Structure

```
sparekei/
├── src/
│   ├── pages/            # Landing, Login/Register (Clerk), Dashboard,
│   │                     # Marketplace, Services, Passport, Emergency,
│   │                     # AdminCenter, AIBrainPage, ...
│   ├── hooks/useAuth.tsx # Clerk ↔ app bridge (admin auto-role)
│   ├── lib/
│   │   ├── env.ts        # NEXT_PUBLIC_* / VITE_* env reader
│   │   └── supabase.ts   # Supabase client (passes Clerk JWT for RLS)
│   └── components/       # UI + layout (sidebar with AI Brain entry)
├── supabase/
│   ├── schema.sql        # Business schema (12 tables + RLS + seeds)
│   ├── migrations/0002_ai_engine.sql   # AI engine tables + pgvector
│   └── functions/        # ai-reason, ai-learn, ai-alert-cron, ai-ingest
├── vercel.json           # Vite SPA config: rewrites + security headers
├── .env.example          # Guide-compliant variable names
└── package.json
```

---

## Troubleshooting

### "Access Denied" / no admin features
- Register with the exact `ADMIN_EMAIL` value → role is granted automatically
- Verify in Supabase Table Editor → `app_users` that your row has `role = admin`

### Data shows empty after login
- Confirm the JWT Issuer (Step 8) is set — without it, RLS can't identify users
- Run both SQL files from Step 2 and check Table Editor for seed rows

### AI Brain says "not configured"
- `OPENAI_API_KEY` is missing from Supabase Edge Function secrets (Step 3)

### Build fails on Vercel
- Check all `NEXT_PUBLIC_*` variables exist → then **Redeploy**
- Check build log; `npm run build` must pass locally first

---

## Post-Deploy Checklist

- [ ] Register admin account (`ADMIN_EMAIL`) → AI Brain visible in sidebar
- [ ] Add a vehicle on Dashboard → appears instantly (Supabase write path)
- [ ] Book a service on Services page → order created
- [ ] Add a part to cart on Marketplace
- [ ] AI Brain → ask a question in Reasoning Console → cited answer
- [ ] Run Learning Engine + Alert Scan → approve items in the Inbox
- [ ] Clerk Production mode + your domain added under Clerk Domains
