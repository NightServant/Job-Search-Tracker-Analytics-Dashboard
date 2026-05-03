# Compiler Service

Private LaTeX-to-PDF compiler service used by the Supabase edge function.

## Endpoint Contract

- POST /compile
  - Headers:
    - Authorization: Bearer <COMPILER_SERVICE_SECRET>
    - Content-Type: application/json
  - Request JSON:
    - latex: string (required)
    - timeoutMs: number (optional, max 120000)
  - Response:
    - 200 application/pdf on success
    - Non-200 JSON payload with error detail on failure

- GET /health
  - Returns status and verifies runtime prerequisites.

## Required Environment Variables

- COMPILER_SERVICE_SECRET (required)
- PORT (optional, defaults to 8080)

## Local Run (Without Docker)

1. Create and activate a Python virtual environment.
2. Install dependencies:

   pip install -r requirements.txt

3. Ensure pdflatex is installed on your machine.
4. Start server:

   uvicorn app.main:app --host 0.0.0.0 --port 8080

## Docker Run

Build image:

docker build -t latex-compiler-service .

Run container:

docker run --rm -p 8080:8080 -e COMPILER_SERVICE_SECRET=your_secret latex-compiler-service

## Quick Test

PowerShell sample:

Invoke-RestMethod -Method Post -Uri http://localhost:8080/compile -Headers @{ Authorization = "Bearer your_secret" } -ContentType "application/json" -Body (@{ latex = "\\documentclass{article}\\begin{document}Hello\\end{document}"; timeoutMs = 60000 } | ConvertTo-Json)

For binary PDF testing in PowerShell, use Invoke-WebRequest and write output bytes to a .pdf file.

## Supabase Wiring

Set the following Supabase edge-function secrets:

- COMPILER_SERVICE_URL=https://<your-service-domain>/compile
- COMPILER_SERVICE_SECRET=<same-secret-as-container>

Then redeploy edge function:

supabase functions deploy export-resume-pdf