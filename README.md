# Job Search Tracker & Analytics Dashboard

A professional portfolio piece demonstrating full-stack web development and data science skills. The application allows users to track their job applications, visualize progress with an analytics dashboard, and export data for Python analysis.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase)

## Features

- **Job Entry System**: Add jobs with company, role, salary, URL, status, date applied, and notes
- **Status Pipeline**: Track jobs through Wishlist → Applied → Interviewing → Offer/Rejected
- **Kanban Board**: Visual pipeline view with drag-and-drop status updates
- **Analytics Dashboard**: 
  - Total applications and conversion rates
  - Bar chart of applications over time
  - Pie chart of status distribution
- **Build Metadata**: Version, commit SHA, and build time displayed in the footer for debugging
- **Error Monitoring**: Optional Sentry reporting with a friendly error boundary fallback screen
- **Performance**: Lazy-loaded pages and charts to reduce initial bundle size
- **Search & Filter**: Filter by status or search by company/role name
- **Dark Mode**: Professional dark theme with toggle
- **CSV Export**: Export data for Python analysis
- **Resume Maker**: LaTeX editor + side-by-side live preview for resume drafting
- **Testing**: Vitest + React Testing Library with CI on pull requests
- **Python Analysis Script**: Pandas-based data analysis with visualizations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 (dark mode) |
| State | TanStack Query + React hooks |
| Database/Auth | Supabase (PostgreSQL) |
| Charts | Recharts (lazy-loaded) |
| UX | dnd-kit, React Router |
| Observability | Sentry (optional) |
| Testing | Vitest + React Testing Library |
| CI | GitHub Actions |
| Icons | Lucide React |
| Data Science | Python + Pandas + Matplotlib |

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
   - Navigate to SQL Editor and run the schema from `texts/database_schema.txt`
   - Run `texts/database_schema_v3_migration.txt`
    - Deploy edge function `job-url-autofill` from `supabase/functions/job-url-autofill`
       - This is required for the **“Auto-fill from URL”** button. If you skip this step, the rest of the app still works, but auto-fill will show an error at runtime.
       - Using the Supabase CLI (recommended):
          ```bash
          # Install the Supabase CLI first (see Supabase docs)
          supabase login
          supabase link --project-ref <your-project-ref>
          supabase functions deploy job-url-autofill
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
