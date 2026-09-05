# Integrations

What is wired up, what is not, and why. Every claim below was checked against
the live service — none of it is from memory, and the places the brief and
reality disagreed are recorded rather than smoothed over. Most of it was
checked on 2026-09-04; the Composio section on 2026-09-05, when it was
actually connected and four of its documented details turned out to be wrong.
Figures move: read each as of its date rather than as a fact about the
service.

## What was asked for, and what exists

| Service | Asked for | Reality | Status |
|---|---|---|---|
| **FormaTeX** | LaTeX generation and compiling | Real REST API at `api.formatex.io/api/v1` | **Integrated** |
| **docx-editor.dev** | Word creation, editing, export | Real, Apache-2.0, **browser-only** (React/Vue). Its automation API is Pro at $500/mo | **Partly** — see below |
| **Novoresume** | CV tailoring and ATS scoring "via API" | **No API exists.** No developer docs, no endpoints, no developer programme | **Replaced** |
| **Composio** | Connectors, autofill, tracking | Real, 1,505 toolkits, MCP | **Connected** as dev tooling (2026-09-05); not in the app |
| **JobStreet** | A connector | **No toolkit exists** on Composio; SEEK's own API is employer-only | **Replaced** |
| **LinkedIn** | (not asked for; tried 2026-09-05) | Toolkit exists and connects, but self-serve OAuth grants profile + post only. No jobs or applications data at any tier below partner | **Connected, and it cannot feed the tracker** |

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

## Job boards: JobStreet and LinkedIn

Two attempts, one conclusion, so they live together: **the posting data comes
from parsing the page, not from an API.** Whatever a job board exposes to
developers is built for employers and ATS vendors; the candidate-facing half is
a posting tool.

### JobStreet

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

### LinkedIn

A toolkit DOES exist, it connects cleanly, and it still cannot feed the
tracker. This is a measured result rather than a prediction -- connected
2026-09-05, `status: active`, verified through `COMPOSIO_MANAGE_CONNECTIONS`.

**What the active connection returns is the whole story:** `sub`, `name`,
`given_name`, `family_name`, `email`, `email_verified`, `locale`, `picture`.
That is the OpenID Connect `openid profile email` claim set verbatim -- the
self-serve tier and nothing beyond it.

The toolkit advertises 22 actions. They split by what LinkedIn will actually
grant:

| Works on self-serve | Needs partner approval |
|---|---|
| get my info, get person profile, create post, create article/URL share, comment, delete post, image and video upload | company info, organization page statistics, share statistics, audience counts, ad targeting facets, ad targeting search |

The second column is Marketing API surface. LinkedIn's self-serve OAuth grants
three scopes -- profile, email, and `w_member_social` -- and everything else,
including connections, messaging and anything jobs-related, is gated behind a
partner programme that is not self-service. (`r_liteprofile` was also replaced
by `r_basicprofile`; older tutorials name a scope that no longer exists for new
applications.)

**There is no endpoint for your applications or for job postings at any tier
below Talent Solutions partnership.** So a connected LinkedIn account can say
who you are and post on your behalf. It cannot tell this app where you applied.

DO NOT RECONNECT IT EXPECTING OTHERWISE. The connection working is not evidence
that the data is reachable, and "active" is exactly what it looks like when it
is not -- which is why this section records the claim set rather than just the
status.

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

## Composio

**Connected on 2026-09-05**, at `local` scope — this repository only. Verified
with `claude mcp list`:

```
composio: https://backend.composio.dev/tool_router/trs_.../mcp (HTTP) - ✔ Connected
```

It is DEVELOPER TOOLING, not a feature of the app. Nothing under `src/` imports
Composio, no route calls it, and `COMPOSIO_API_KEY` is deliberately **absent
from `.env.example`** — putting it there would say the application needs it,
and the application does not. It gives Claude Code access to Composio's
toolkits while working on this repo. Shipping Composio to users is a different
project; see "If it ever goes in the app" below.

### Getting a session

`scripts/composio-session.sh` does this. Read it rather than this section if
you only want the commands; what follows is why each step is what it is.

**THE TOOL ROUTER URL IS NOT IN THE DASHBOARD.** This is the step the old
version of this section omitted, and it sent a reader hunting for a URL that
does not exist on any screen. It told you to run

```bash
claude mcp add --transport http composio <your-tool-router-url> …
```

with no way to obtain `<your-tool-router-url>`. You get one by creating a
**session**, which is an API call:

```bash
curl -X POST https://backend.composio.dev/api/v3.1/tool_router/session \
  -H "x-api-key: $COMPOSIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"gabe"}'
```

The response carries `mcp.url`, and that is what goes in the `add` command.

Four things that cost a round trip each, recorded so they cost nobody another:

1. **`toolkits` is an OBJECT, not an array.** `{"toolkits":["gmail"]}` returns
   `400 Error in payload.toolkits: Invalid input`. The allowlist form is
   `{"toolkits":{"enabled":["gmail","googlecalendar"]}}`, with `disabled` as
   the mutually exclusive denylist. The API reference types the field as `any`
   and shows `null` in its example, so the shape is only in prose.

   You usually want neither. `user_id` is the sole required field, and an
   unrestricted router is the normal case — discovering the right tool is what
   a router is *for*.

2. **The returned host is not the documented one.** The docs give the format as
   `app.composio.dev/tool_router/v3/{session_id}/mcp`; the API returns
   `backend.composio.dev/tool_router/{session_id}/mcp`. Building the URL by
   hand from the documentation produces a 404. Use what the response says.

3. **No `mcp.headers` comes back** — only `type` and `url`. The auth header is
   your plain API key.

4. **Auth is checked before the payload**, so a bad body with a bad key returns
   401 and tells you nothing about the body. A `400` is therefore good news: it
   means the key, the endpoint and the method are all correct.

### Registering it

```bash
claude mcp add --transport http composio "<mcp.url>" -H "x-api-key: $COMPOSIO_API_KEY"
```

`-H` / `--header`, singular, `"Name: value"`. Composio's own Claude Code page
says `--headers` with no space, which this CLI rejects — checked against
`claude mcp add --help`.

`-s user` puts it in every project; the default is `local`, this one only.
Then **start a new interactive session**: the per-toolkit OAuth runs on first
use, through `COMPOSIO_MANAGE_CONNECTIONS`, and needs a terminal.

The key is stored in `~/.claude.json` (`-rw-------`, home directory, outside
the repo). It is not committed and must not be moved anywhere that is.

### What you get

Six meta-tools, not 1,505 individual ones — `COMPOSIO_SEARCH_TOOLS`,
`COMPOSIO_GET_TOOL_SCHEMAS`, `COMPOSIO_MULTI_EXECUTE_TOOL`,
`COMPOSIO_MANAGE_CONNECTIONS`, `COMPOSIO_REMOTE_WORKBENCH`,
`COMPOSIO_REMOTE_BASH_TOOL`. The router searches and dispatches, which is why
skipping `toolkits` costs nothing.

**The workbench is on by default**, and it is worth knowing rather than
discovering: `workbench.enable: true` with `proxy_execution_enabled` and a
remote bash tool. It is an isolated sandbox on Composio's infrastructure, not
this machine, but it is a code-execution environment nobody asked for. Pass
`--no-workbench` to the script to create a session without it.

**Session lifetime is unknown.** Nothing in the documentation states whether
these expire, and it has not been long enough to find out. If `claude mcp list`
starts reporting the server as failed, recreate the session and re-add it —
that is a minute's work either way.

### Toolkit count

1,505 on 2026-09-05, read off the dashboard. This document previously said
1,326, checked 2026-09-04. The number moves; treat any figure here as of its
date rather than as a fact about the service.

### Gmail and Calendar are already reachable without it

The first-party claude.ai connectors for Gmail, Google Calendar and Google
Drive are connected and authorised on this machine. For Gabe's own mail and
calendar, prefer those — they are already authenticated and one hop shorter.
Composio earns its place on the ~1,500 toolkits that have no first-party
connector, not on the three that do.

### If it ever goes in the app

Not planned, and the shape is worth writing down so it is not re-derived under
pressure. Users connecting *their own* Gmail is a genuinely different system
from the above — the connectors on this machine are Gabe's, not theirs.

- `COMPOSIO_API_KEY` server-side only, never `NEXT_PUBLIC_`. Same rule, same
  reason as `TAILORING_API_KEY`.
- One **auth config** per toolkit, created once.
- Per-user **connected account** via `composio.connectedAccounts.link(userId,
  authConfigId)`, which returns a `redirectUrl`. Use `link()`, **not**
  `initiate()`: Composio is retiring `initiate()` for Composio-managed OAuth
  (2026-05-08 for new organisations, 2026-07-03 for all). Most tutorials still
  show `initiate()`.
- `user_id` is the hinge. It is `"gabe"` in the session above; there it is the
  Supabase user id, one session per user.
- The route goes under `/api/` behind `requireUser`, or
  `src/app/api/__tests__/routesAreGuarded.test.ts` fails.
- **`src/app/privacy/page.tsx` changes in the same commit.** It currently
  states that no AI is used anywhere and names every third party that receives
  anything. Reading a user's mail through Composio makes both sentences false,
  and `page.test.tsx` holds that page to the schema. A privacy policy
  describing the previous version of the product is worse than a vague one.

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
