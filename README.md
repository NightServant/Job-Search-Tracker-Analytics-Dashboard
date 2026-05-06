# 📊 Job Search Tracker & Analytics Dashboard

> A full-stack web application for tracking job applications, visualizing progress, and gaining insights into your search strategy.

**Built with**: React · TypeScript · TanStack Query · Supabase · Vite · Tailwind CSS  
**Perfect for**: Showcasing full-stack skills, data visualization, and DevOps practices

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase)

## ✨ Key Features

### Job Tracking
- **Full-Featured Entry System**: Company, role, salary, URL, status, date applied, notes, location, work mode  
- **Smart Status Pipeline**: Wishlist → Applied → Interviewing → Offer/Rejected with drag-and-drop Kanban board  
- **Advanced Filtering**: Filter by status, search by company/role, sort by date, and export as CSV  

### Analytics & Insights
- **Real-Time Dashboard**: Conversion rates, applications over time, status distribution  
- **Deep Analytics**: Time-in-stage metrics, conversion funnels, cohort analysis, source trends  
- **Intelligent Caching**: Edge function cache-proxy with automatic compute on miss (SWR pattern)  
- **Python Analysis**: Export data for Pandas-based statistical analysis with visualizations  

### Developer Experience
- **Dark Mode**: Smooth theme transitions with toggle and localStorage persistence  
- **Error Boundary**: Friendly fallback UI with optional Sentry error reporting  
- **Performance Optimized**: Lazy-loaded pages/charts, optimized bundle (~143KB gzip)  
- **Testing**: 200+ unit tests (Vitest + React Testing Library), CI on pull requests  
- **Build Metadata**: Version, commit SHA, build time in footer for debugging  

### Resume Tools
- **Resume Maker**: LaTeX editor with live side-by-side preview  
- **Resume Builder**: Word-like editor (Tiptap) with autosaved drafts and PDF export via edge functions

## 🏗️ Architecture

### Frontend Stack
| Layer | Technology | Why? |
|-------|-----------|---------|
| UI Framework | React 18 + Vite | Fast refresh, optimized builds, minimal config |
| State Management | TanStack Query v5 | Built-in caching (SWR), auto-deduplication, background refetch |
| Type Safety | TypeScript | Strict mode, catch errors at compile time |
| Styling | Tailwind CSS v3 | Utility-first, dark mode built-in, small footprint |
| Data Fetching | @tanstack/react-query | Client-side cache layer before edge functions |
| Forms/Editors | Tiptap, React Hook Form | Rich editing, validation, autosave |
| Charts | Recharts | Lazy-loaded, responsive, accessibility-friendly |
| Icons | Lucide React | Consistent, tree-shakeable, on-brand |

### Backend Stack
| Layer | Technology | Details |
|-------|-----------|---------|
| Database | PostgreSQL (Supabase) | 5 tables, RLS policies, indexes for query performance |
| Authentication | Supabase Auth | Magic links, social auth, built-in 2FA |
| Edge Functions | Deno (Supabase Functions) | Auto-fill URL parsing, PDF export, analytics cache proxy |
| Analytics Cache | PostgreSQL + Edge Functions | SWR pattern: check cache → compute on miss → auto-upsert |
| Monitoring | Sentry (optional) + Edge Logs | Error tracking, performance monitoring, custom edge metrics |
| Infrastructure | Vercel (frontend) + Supabase (backend) | Serverless deployment, auto-scaling, edge caching |
| Testing | Vitest + React Testing Library | 200+ unit tests, smoke tests |
| CI/CD | GitHub Actions | Auto-test on PR, build verification |
| Data Science | Python 3.8+ (Pandas, Matplotlib) | Local analysis script post-export |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Python 3.8+ (for data analysis script)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Job-Search-Tracker-Analytics-Dashboard.git
   cd Job-Search-Tracker-Analytics-Dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Follow the canonical migration steps in [texts/database_migrations.md](texts/database_migrations.md)
   - Run `texts/resumes_feature_migration.sql` to enable Resume Builder draft storage
   - Deploy edge function `job-url-autofill` from `supabase/functions/job-url-autofill`
   - Deploy edge function `resume-export-pdf` from `supabase/functions/resume-export-pdf`
     - This is required for the **“Auto-fill from URL”** button. If you skip this step, the rest of the app still works, but auto-fill will show an error at runtime.
     - This is also required for the **“Export PDF”** button in Resume Builder.
       - Optional but recommended: set `EDGE_SENTRY_DSN` and `EDGE_SENTRY_ENVIRONMENT` as Supabase secrets so edge-function errors and slow requests show up in Sentry.
       - The edge functions emit `edge_metric` JSON logs with latency, throttling, and DB connection counts, which can feed Supabase log-based alerts or a lightweight external monitor.
     - Using the Supabase CLI (recommended):
       ```bash
       # Install the Supabase CLI first (see Supabase docs)
       supabase login
       supabase link --project-ref <your-project-ref>
       supabase functions deploy job-url-autofill
       supabase functions deploy resume-export-pdf
       ```
   - Copy the project URL and anon key from Settings > API

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with the Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=anon-key-value
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   Navigate to `http://localhost:5173`

### Testing

- Run unit tests:
   ```bash
   npm test
   ```
- Run tests in watch mode:
   ```bash
   npm run test:watch
   ```
- The CI workflow runs tests and a production build on every pull request.

## Project Structure

```
├── src/
│   ├── components/       # React components
│   │   ├── jobs/         # Job-related components
│   │   └── Layout.tsx    # App shell
│   ├── contexts/         # React contexts (auth, theme)
│   ├── hooks/            # Custom hooks (useJobs, useJobStats)
│   ├── lib/              # Utilities (Supabase client)
│   ├── pages/            # Page components
│   ├── services/         # API service layer
│   ├── types/            # TypeScript definitions
│   └── App.tsx           # Root component
├── scripts/
│   └── data_analysis.py  # Python analysis script
├── texts/                # Documentation
│   ├── project_roadmap.txt
│   ├── database_schema.txt
│   ├── component_architecture.txt
│   └── api_logic.txt
└── public/               # Static assets
```

## Data Analysis (Python)

1. **Export job data** from the dashboard (CSV download button)

2. **Install Python dependencies**
   ```bash
   pip install pandas matplotlib seaborn
   ```

3. **Run the analysis**
   ```bash
   cd scripts
   python data_analysis.py
   ```

The script generates:
- Statistical report with conversion rates
- Status distribution pie chart
- Applications timeline bar chart
- Salary distribution box plot
- Top companies chart

## Deployment

### Vercel (Recommended)

1. Push the code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel settings
4. Deploy!

### Environment Variables for Production

```
VITE_SUPABASE_URL=production_url
VITE_SUPABASE_ANON_KEY=production_anon_key
VITE_SENTRY_DSN=optional_sentry_dsn
VITE_SENTRY_ENVIRONMENT=production
```

The build also embeds the app version, commit SHA, and build time in the footer for support/debugging.

### Production Checklist

1. Run `npm test`.
2. Run `npm run build`.
3. Confirm [texts/database_migrations.md](texts/database_migrations.md) has been applied in Supabase.
4. Deploy the Supabase edge functions used by auto-fill and PDF export.
5. Verify the production URL after deployment.

## Analytics Formulas

**Conversion Rate (Interview Rate):**
$$\text{Conversion \%} = \left( \frac{\text{Interviews}}{\text{Applications}} \right) \times 100$$

**Offer Rate:**
$$\text{Offer \%} = \left( \frac{\text{Offers}}{\text{Applications}} \right) \times 100$$

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your portfolio!

---

Built with ❤️ as a portfolio piece demonstrating Full-Stack Development and Data Science expertise.
