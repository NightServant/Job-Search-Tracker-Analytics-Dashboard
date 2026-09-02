# Job Search Tracker & Analytics Dashboard

Track job applications, visualise the pipeline, and build a CV — a full-stack React + Supabase application.

> **Project lineage.** This repository is the continuation of the [Job Search Tracker & Analytics Dashboard](https://github.com/Ensues/Job-Search-Tracker-Analytics-Dashboard) originally created and built by **[Ensues (Janssen Quiambao)](https://github.com/Ensues)**, who authored the application and its features between March and May 2026. Development continues here under [@NightServant](https://github.com/NightServant). See [Credits](#credits).

---

## Status

Active development. The database schema, migrations, and test suite are current; a public demo is **not deployed at the moment** while hosting is migrated. Run it locally with the instructions below.

---

## Features

**Job tracking**
- Applications with company, role, salary range, location, work mode, source, tags, and tech stack
- Status pipeline — wishlist → applied → interviewing → offer / rejected — with drag-and-drop
- Automatic status-change history, recorded by a database trigger
- Auto-fill from a job posting URL, parsed server-side across multiple job boards
- Filtering, search, sorting, and CSV export

**Analytics**
- Conversion and offer rates, applications over time, status distribution
- Time-in-stage metrics, conversion funnels, and source trends
- Precomputed metrics cached in Postgres behind an edge function (stale-while-revalidate)

**CV builder**
- Word-style rich text editor (Tiptap) with autosave
- LaTeX source editor with live side-by-side preview
- Template presets for both modes
- Version history — snapshots capped at 10 per CV
- PDF export via edge function

**Engineering**
- Row-Level Security on every table; users can only reach their own rows
- 304 unit tests across 28 files, plus 19 integration tests against the live database (Vitest + React Testing Library)
- Error boundaries with optional Sentry reporting
- Dark mode, lazy-loaded routes and charts

---

## Stack

| Layer | Technology |
|---|---|
| UI | React 19, TypeScript, Next.js |
| Components | shadcn/ui (`base-nova` style, built on Base UI) |
| Icons | AnimateIcons |
| Styling | Tailwind CSS v4, semantic design tokens |
| Motion | motion (formerly framer-motion) |
| Data fetching | TanStack Query v5 |
| Editor | Tiptap |
| Charts | Recharts 3 |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Server-side | Supabase Edge Functions (Deno) |
| Testing | Vitest, React Testing Library |
| Analysis | Python (pandas, matplotlib, seaborn) |

---

## Architecture

**Database** — twelve tables, RLS enabled on all of them:

| Table | Purpose |
|---|---|
| `jobs` | Applications, with description, currency, contact and tag fields |
| `job_status_history` | Append-only status transitions, written by trigger |
| `activity_log` | Free-form timestamped notes per application |
| `events` | Interviews, deadlines, take-homes |
| `resumes` | CV drafts; structured sections, Tiptap JSON, or LaTeX |
| `resume_snapshots` | Immutable version history |
| `application_documents` | Which CV snapshot was sent to which application |
| `contacts` / `application_contacts` | Recruiters and referrals, linked many-to-many |
| `user_preferences` | Per-user settings; default currency for new applications |
| `analytics_cache` | Precomputed per-user metrics, service-role only |
| `demo_accounts` | Read-only demo users, enforced by RLS |

**Edge functions** (Deno, in `supabase/functions/`):

| Function | Purpose |
|---|---|
| `job-url-autofill` | Fetches and parses job postings into form fields |
| `analytics-cache-proxy` | Reads cache, computes on miss, upserts result |
| `resume-export-pdf` | Renders a CV to PDF |
| `_shared` | Common headers and telemetry helpers |

---

## Getting started

**Prerequisites** — Node.js 18+, a Supabase project, and the [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
git clone https://github.com/NightServant/Job-Search-Tracker-Analytics-Dashboard.git
cd Job-Search-Tracker-Analytics-Dashboard
npm install
```

**Configure environment** — copy the example and fill in your project's values from Supabase → Settings → API:

```bash
cp .env.example .env
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Use the **publishable** key, never the secret key — Next.js inlines `NEXT_PUBLIC_`-prefixed variables into the client bundle, so anything with that prefix is public by definition. Row Level Security is what protects the data, not the key.

**Apply migrations** — the eight files in `supabase/migrations/` reproduce the full schema:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Deploy edge functions** — optional, but auto-fill and PDF export need them:

```bash
supabase functions deploy job-url-autofill
supabase functions deploy resume-export-pdf
supabase functions deploy analytics-cache-proxy
```

**Run it:**

```bash
npm run dev
```

---

## Testing

```bash
npm test          # single run
npm run test:watch
npm run build     # type-check and production build
```

---

## Data analysis

An optional Python script produces statistics and charts from exported CSV data.

```bash
python3 -m venv venv
./venv/bin/pip install pandas matplotlib seaborn
cd scripts && ../venv/bin/python data_analysis.py
```

Export your jobs as CSV from the dashboard and place the file in `scripts/`. Without one, the script runs on built-in sample data and reports fabricated numbers — check the output for the "Generating sample data" notice.

---

## Project structure

```
src/
├── components/     UI components; jobs/, resume/, dashboard/, errors/
├── contexts/       Auth, theme, toast
├── hooks/          useJobs, useAnalytics
├── lib/            Supabase client, CSV, Sentry
├── pages/          Dashboard, Jobs, CV, Login
└── services/       Data access, validation, templates, analytics
supabase/
├── functions/      Deno edge functions
└── migrations/     Ordered SQL migrations
scripts/            Python analysis
texts/              Design and reference documentation
```

---

## Roadmap

- [ ] Restore a public demo deployment
- [ ] Break up the oversized page components
- [ ] Migrate to Next.js and Vercel
- [ ] Design system pass (shadcn/ui + motion)
- [ ] Grammar and spelling checks in the CV editor
- [ ] AI-assisted CV tailoring against a job description

---

## Attribution

Third-party components and assets vendored into this repository, credited when adopted:

- **shadcn/ui** — MIT, [ui.shadcn.com](https://ui.shadcn.com). Component source copied into `src/components/ui/` under the `base-nova` style and edited to this project's tokens.
- **AnimateIcons** — MIT, [github.com/Avijit07x/animateicons](https://github.com/Avijit07x/animateicons). Icon components vendored via the shadcn CLI into `src/components/icons/`.
- **mammoth.js** — BSD-2-Clause, [github.com/mwilliamson/mammoth.js](https://github.com/mwilliamson/mammoth.js). An npm dependency rather than vendored source. Converts uploaded `.docx` files to HTML on the Documents screen, which `src/lib/documentImport.ts` walks into the editor's content. Chosen because it maps Word's *styles* rather than its formatting: Word marks a heading by naming a style, not by making text large, so a converter that reads formatting turns a CV into bold paragraphs.
- **Arimo** — SIL Open Font License 1.1, self-hosted via `next/font`. The metric-compatible fallback for Helvetica Neue, which is licensed and cannot be self-hosted.
- **App backdrop photograph** — [Unsplash Licence](https://unsplash.com/license), photo by **Albert Salim** ([@albertsalim](https://unsplash.com/@albertsalim)), [photo-1751601454754](https://unsplash.com/photos/blurred-colors-blend-together-in-a-soft-abstract-pattern-XV7OUFLfB8Q). Vendored as `public/backdrop.jpg` and rendered by `AppBackground`. The licence does not require attribution; this repository credits third-party assets regardless.

### Skiper UI

UI components adapted from [Skiper UI](https://skiper-ui.com/components). Skiper
UI's free tier requires attribution, and the registry copies source in-tree
rather than installing a package, so the obligation attaches to the files below.
These two sentences are asserted verbatim by `src/lib/__tests__/attribution.test.ts`
and rendered by the landing footer, so the credit cannot drift from the code.

- Carousel adapted from Skiper UI (Creative carousel 002), built on Swiper.js, with illustrations by AarzooAly.
- Smooth caret input adapted from Skiper UI (Smooth caret input).

The theme toggle is not a Skiper component. It was written from scratch against
the technique in Skiper UI's theme toggle buttons — themselves adapted from
[toggles.dev](https://toggles.dev) by Alfie Jones — and the View Transition
theme wipe follows the approach in `rudrodip/theme-toggle-effect`. Neither
component's source ships here, so neither carries an attribution obligation;
both are named because the ideas are theirs.

---

## Credits

**Original author** — [Ensues (Janssen Quiambao)](https://github.com/Ensues) designed and built this application: the job tracker, analytics dashboard, CV builder, edge functions, and test suite.

**Current maintainer** — [@NightServant](https://github.com/NightServant), continuing development from August 2026: repository and branch consolidation, database migration history, schema fixes, and ongoing feature work.

Run `git shortlog -sne --all` for the full contribution breakdown.
