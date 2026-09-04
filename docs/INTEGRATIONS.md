# Integrations

What is wired up, what is not, and why. Every claim below was checked against
the live service on 2026-09-04 — none of it is from memory, and the three
places the brief and reality disagreed are recorded rather than smoothed over.

## What was asked for, and what exists

| Service | Asked for | Reality | Status |
|---|---|---|---|
| **FormaTeX** | LaTeX generation and compiling | Real REST API at `api.formatex.io/api/v1` | **Integrated** |
| **docx-editor.dev** | Word creation, editing, export | Real, Apache-2.0, **browser-only** (React/Vue). Its automation API is Pro at $500/mo | **Partly** — see below |
| **Novoresume** | CV tailoring and ATS scoring "via API" | **No API exists.** No developer docs, no endpoints, no developer programme | **Replaced** |
| **Composio** | Connectors, autofill, tracking | Real, 1326 toolkits, MCP | **Documented, needs your account** |
| **JobStreet** | A connector | **No toolkit exists** on Composio; SEEK's own API is employer-only | **Replaced** |

### How each was verified

```
GET  ec.europa.eu/esco/api/search?text=react   -> 200, 93 results, no credentials
GET  api.formatex.io/api/v1/health             -> 200 {"status":"ok"}
POST api.formatex.io/api/v1/compile            -> 401 {"error":"missing API key"}
POST api.formatex.io/api/v1/compile
     with X-API-Key: bogus                     -> 401 {"error":"invalid API key"}
POST api.formatex.io/v1/compile                -> 404   (wrong base path)
GET  formatex.io/mcp                           -> 200 text/html (a docs PAGE, not an endpoint)
```

The header name `X-API-Key` is known rather than assumed because the error
**changed** when it was sent. FormaTeX's own `/docs/api` page 404s, so the
contract in `src/services/integrations/formatex.ts` comes from probing.

## Novoresume: why it is not here

Novoresume's career AI tools are consumer web pages. There is no API, no
developer documentation and no developer programme, so there was nothing to
integrate. Gabe's instruction was to use **free public APIs** instead, and the
replacement splits the job in two:

- **Scoring stays deterministic and in-repo.** `atsMatch.ts` and `atsLint.ts`
  already compute it, with tests. A number a user acts on should not come back
  different every time they ask for it.
- **Rewriting goes to any OpenAI-compatible free tier.** Groq, OpenRouter,
  Cloudflare Workers AI and a local Ollama all speak `POST /chat/completions`,
  and every one of those free tiers has moved its limits at least once — so the
  provider is two environment variables, never an import.

`src/services/integrations/tailoring.ts` holds the client. The system prompt
forbids inventing experience, and that rule is asserted **on the wire** by a
test, so it cannot be edited out quietly.

## ESCO: free, keyless, and used very narrowly

`ec.europa.eu/esco/api` needs no credentials at all. But it is an
*occupational* taxonomy, not a technology index, and using it naively would
make the matcher worse:

| query | what ESCO returns |
|---|---|
| `javascript` | "JavaScript" — usable |
| `typescript` | "TypeScript" — usable |
| `postgresql` | "PostgreSQL" — usable |
| `kubernetes` | nothing |
| `docker` | nothing |
| `react` | **"react to emergency situations in a live performance environment"** |
| `software engineer` | 604 hits, led by "utilise computer-aided software engineering tools" |

So a result counts **only when its title exactly equals the search term**.
That is precisely the condition every usable row above meets and every trap
fails. The cost is recall; the alternative was teaching the scorer that "react
calmly in stressful situations" satisfies a React requirement.

## JobStreet

No Composio toolkit exists — its HR & Recruiting category has 22 toolkits
(Ashby, BambooHR, Greenhouse, Lever, Workday, ZipRecruiter, Dice…) and no APAC
job board. SEEK's own API is for employers and ATS partners.

**Two constraints worth knowing before building anything here.** SEEK's API
terms say candidate profile data may be used only to *pre-fill* forms, that
candidates must be able to review and edit before submission, and that it must
**not** be used for "automatically submitting an application". So auto-submit
is off the table by contract, not by taste — pre-fill with a human in the loop
is the only compliant shape.

Per Gabe's decision, JobStreet is reached by extending the existing
`supabase/functions/job-url-autofill` edge function, which already parses
postings, is SSRF-hardened, and backs the Auto-fill button on the application
form.

## Setup

```bash
cp .env.example .env.local   # then fill in only what you want
```

| Variable | Needed for | Where to get it |
|---|---|---|
| `FORMATEX_API_KEY` | LaTeX → PDF | formatex.io dashboard |
| `TAILORING_BASE_URL` | AI tailoring | e.g. a free OpenAI-compatible endpoint |
| `TAILORING_API_KEY` | AI tailoring | same provider |
| `TAILORING_MODEL` | AI tailoring | a model id that provider serves |
| `ESCO_ENABLED` | skills synonyms | nothing — on by default, no key |

Nothing here is required. Every client degrades to a documented fallback, and
`capabilitiesOf()` is what the UI branches on, so an unconfigured feature says
"set these variables" instead of failing mid-edit.

**`TAILORING_API_KEY` is deliberately not `NEXT_PUBLIC_`.** The rails call
`/api/tailor`, which holds the key server-side. A token in the bundle is a
token anyone can read out of the network tab and spend.

## Composio (needs your account)

The tool-router URL is per-account, so it cannot be committed. Run:

```bash
claude mcp add --transport http composio <your-tool-router-url> --header "x-api-key: <your-key>"
```

Then restart Claude Code. The first tool call triggers Composio's OAuth flow.

A JobStreet toolkit would have to be authored as a **custom** toolkit in the
dashboard, and it would be a wrapper around scraping either way — which is
what the edge function already does, without the extra hop.

## docx-editor.dev

The core is Apache-2.0 and fits this app (React 19). But it is **browser-only**
and its Office.js-compatible automation API (`@docx-editor.dev/editor-api`) is
under the EigenPal Pro Licence at $500/month.

Per Gabe's decision: the free editor component for editing, and the `docx` npm
package (installed, 9.7.1) for headless `.docx` output. No licence fee, full
pipeline.
