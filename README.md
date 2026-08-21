# Job Search Tracker & Analytics Dashboard

A professional portfolio piece demonstrating full-stack web development and data science skills. The application allows users to track their job applications, visualize progress with an analytics dashboard, and export data for Python analysis.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase)

## Features

- **Job Entry System**: Add jobs with company, role, salary, URL, status, date applied, and notes
- **Status Pipeline**: Track jobs through Wishlist → Applied → Interviewing → Offer/Rejected
- **Kanban Board**: Visual pipeline view with drag-and-drop status updates
- **Analytics Dashboard**: 
  - Total applications and conversion rates
  - Bar chart of applications over time
  - Pie chart of status distribution
- **Search & Filter**: Filter by status or search by company/role name
- **Dark Mode**: Professional dark theme with toggle
- **CSV Export**: Export data for Python analysis
- **Python Analysis Script**: Pandas-based data analysis with visualizations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 (dark mode) |
| State | TanStack Query + React hooks |
| Database/Auth | Supabase (PostgreSQL) |
| Charts | Recharts |
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
   git clone https://github.com/NightServant/Job-Search-Tracker-Analytics-Dashboard.git
   cd Job-Search-Tracker-Analytics-Dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Navigate to SQL Editor and run the schema from `texts/database_schema.txt`
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

## Project Structure

```
├── src/
│   ├── components/       # React components
│   │   ├── jobs/        # Job-related components
│   │   └── Layout.tsx   # App shell
│   ├── contexts/        # React contexts (auth, theme)
│   ├── hooks/           # Custom hooks (useJobs, useJobStats)
│   ├── lib/             # Utilities (Supabase client)
│   ├── pages/           # Page components
│   ├── services/        # API service layer
│   ├── types/           # TypeScript definitions
│   └── App.tsx          # Root component
├── scripts/
│   └── data_analysis.py # Python analysis script
├── texts/               # Documentation
│   ├── project_roadmap.txt
│   ├── database_schema.txt
│   ├── component_architecture.txt
│   └── api_logic.txt
└── public/              # Static assets
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
```

## Analytics Formulas

**Conversion Rate (Interview Rate):**
$$\text{Conversion \%} = \left( \frac{\text{Interviews}}{\text{Applications}} \right) \times 100$$

**Offer Rate:**
$$\text{Offer \%} = \left( \frac{\text{Offers}}{\text{Applications}} \right) \times 100$$
