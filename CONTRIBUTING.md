# Contributing

Thanks for contributing.

## Local Setup

1. Install Node.js 18+.
2. Install dependencies with `npm install`.
3. Create your local environment file from the Supabase values in the project docs.
4. Apply the database migrations from [texts/database_migrations.md](texts/database_migrations.md).
5. Deploy the required Supabase edge functions if you want to test auto-fill or PDF export locally against a real backend.

## Running Locally

1. Start the app with `npm run dev`.
2. Open the Vite URL shown in the terminal.

## Testing

1. Run the unit test suite with `npm test`.
2. Run the linter with `npm run lint`.
3. Build production output with `npm run build` before opening a PR.

## Notes

1. Keep changes focused and avoid unrelated formatting churn.
2. Update docs when behavior, setup, or deployment steps change.