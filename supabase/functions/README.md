# Supabase Edge Functions

This directory contains edge functions used by the app.

## Export Resume PDF Function

Function name: `export-resume-pdf`

Purpose:
- Accept current LaTeX source from Resume Maker
- Compile it to PDF through a private compiler service
- Upload the generated PDF to `resume-documents` storage bucket
- Insert metadata into `public.resume_documents`
- Return document row + short-lived signed download URL

### Required function secrets

Set these in your Supabase project for edge functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COMPILER_SERVICE_URL`
- `COMPILER_SERVICE_SECRET`

### Deploy

Using Supabase CLI:

```bash
supabase functions deploy export-resume-pdf
```

### Local serve

```bash
supabase functions serve export-resume-pdf --env-file .env.local
```

Note:
- `.env.local` in this repo should not contain `SUPABASE_SERVICE_ROLE_KEY`.
- For local function testing, use a dedicated local env file with function secrets.
