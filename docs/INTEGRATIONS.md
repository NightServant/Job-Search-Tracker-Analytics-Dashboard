# Integrations

What is wired up, what is not, and what was ruled out. Every claim was checked
against the live service — none of it is from memory — and each carries the
date it was checked, because these figures move. Read every number as of its
date rather than as a fact about the service.

**Rewritten 2026-09-06.** This file used to carry long sections on services
that turned out to be unusable: Novoresume, JobStreet, LinkedIn, Composio and
docx-editor.dev's paid API. Prose describing what does not work crowds out the
four things that do, so each is now one line in
[Ruled out](#ruled-out--do-not-re-investigate). Nothing measured was lost — the
verdicts and their dates are all still here, just compressed to the sentence
that stops someone re-investigating.

## What the app actually uses

| Service | For | Verified | Status |
|---|---|---|---|
| **FormaTeX** | LaTeX → PDF | 2026-09-04 | **Integrated** — `src/services/integrations/formatex.ts` |
| **Any OpenAI-compatible endpoint** | CV tailoring | 2026-09-04 | **Integrated** — `src/services/integrations/tailoring.ts` |
| **ESCO** (EU skills taxonomy) | ATS skill synonyms | 2026-09-04 | **Integrated, narrowly** — `src/services/integrations/esco.ts` |
| **`docx`** (npm, 9.7.1) | headless Word export | 2026-09-04 | **Integrated** — `src/services/integrations/docxExport.ts` |
| **Scrapling** | job posting parsing | 2026-09-06 | **Integrated** — `scraper/`, deployed as a Vercel service |
| **Firecrawl** | fetching the pages we cannot | 2026-09-07 | **Integrated, optional** — `scraper/app.py` |
| **LinkedIn data export** | your own profile | 2026-09-06 | **Integrated** — `src/services/linkedinExport.ts` |

That is the whole list. Seven working integrations. Anything
not in this table is not in this application.

---

## Ruled out — do not re-investigate

Each line is a measured result, not a guess. The date is when it was measured.

| Service | Why it is not here | Measured |
|---|---|---|
| **Novoresume** | No API exists. No developer docs, no endpoints, no developer programme. Its career AI tools are consumer web pages. | 2026-09-04 |
| **JobStreet / SEEK API** | No Composio toolkit exists; SEEK's own API is employer/ATS-partner only. Its terms also forbid "automatically submitting an application" — so auto-submit is off the table by contract, and pre-fill with a human in the loop is the only compliant shape. | 2026-09-04 |
| **LinkedIn API** | Connects cleanly and still cannot feed the tracker. Self-serve OAuth grants `openid profile email` + `w_member_social` — the connection returns `sub, name, given_name, family_name, email, email_verified, locale, picture` and nothing else. **There is no endpoint for your applications or for job postings at any tier below Talent Solutions partnership.** DO NOT RECONNECT IT EXPECTING OTHERWISE — "active" is exactly what it looks like when the data is unreachable. | 2026-09-05 |
| **Composio** | Tried as a real feature on 2026-09-06 and REMOVED the same day. It does broker a LinkedIn profile connection, and that part worked — but it is a whole vendor, an org-wide API key and a per-user credential store in exchange for eight OIDC fields, and Gabe rejected the trade. It has no toolkit that returns your applications or a job posting. Removed entirely on 2026-09-06: the MCP server, the key and `scripts/composio-session.sh` are all gone, so there is nothing left to reconnect by accident. | 2026-09-06 |
| **docx-editor.dev automation API** | The editor core is Apache-2.0 and browser-only; its Office.js-compatible automation API (`@docx-editor.dev/editor-api`) is under the EigenPal Pro Licence at **$500/month**. The free editor component plus the `docx` npm package do the whole job for nothing. | 2026-09-04 |

**The lesson these share:** whatever a job board or a career service
exposes to developers is built for employers and ATS vendors. The
candidate-facing half is a posting tool. Posting data comes from reading the
page, which is what M7 is about.

---

## LinkedIn data export — your own profile

**Integrated 2026-09-06**, after two other approaches were built and thrown
away the same day. Both failures are worth keeping, because each looked
reasonable right up to the point it did not work:

| Attempt | Why it went |
|---|---|
| **Composio connector** | It worked. But it is a whole vendor, an org-wide API key and a per-user credential store in exchange for eight OIDC fields — no work history, no bullet text. Gabe rejected the trade. |
| **Profile page scraper** | Read JSON-LD and Voyager payloads. Recovered titles and dates and almost never the bullet text under a role, which is the part a CV is written from. Also needed a session cookie or a browser LinkedIn would accept. |

**Settings & Privacy → Get a copy of your data.** First-party, sanctioned, no
credential, cannot be rate limited or blocked, and it carries the descriptions,
certifications, projects and languages that neither of the above could reach.
The cost is that it is not instant — LinkedIn takes minutes to a day.

Files are matched **by their header row, not their filename**, because LinkedIn
renames and re-cases them between exports and a user can drag one file in
without the archive around it. `Profile.csv` is confirmed against a real
export; the other tables are handled from their documented headers and are
each independent, so an unrecognised one costs only itself.

Parsing happens in the browser; only the result is stored, in `user_profiles`.
That table can hold a **postal address and a birth date**, because the export
contains them — `/privacy` says so, and Settings shows them under their own
heading so anyone who does not want them stored knows to clear the profile.

---

## Scrapling — job posting extraction

**Integrated**, `scraper/`, deployed as a Vercel service reached only over a
binding. See `docs/superpowers/plans/2026-09-06-m7-scrapling-autofill.md`.

Two things measured on 2026-09-06 that change how it is used:

* **Some boards render postings with JavaScript.** Cloudstaff answers a plain
  fetch with 110KB of HTML containing *fifteen* visible characters. A headless
  browser is tried when the static fetch comes back as a shell or a challenge.
* **`playwright` does not work on Vercel, and that is now settled.** The
  library installs; the Chromium binary never does, because the Python builder
  runs no post-install step. Production carried ~300MB it could not use, so the
  browser is an optional extra again (`npm run setup:scraper` installs it) and
  **Firecrawl is the fetch that works in a deployment**. `_render` keeps the
  local browser as a second try and simply returns None where it is absent.

An ordinary headless browser is used (`DynamicFetcher`), never Scrapling's
`StealthyFetcher`. A challenge aimed at clients that cannot run a page is not
something a real browser is getting around; a site that refuses an honest
browser has said no.

---

## Firecrawl — the fetch this server cannot do itself

**Integrated 2026-09-07, optional.** `POST https://api.firecrawl.dev/v2/scrape`
with `Authorization: Bearer`, reached from `scraper/app.py` only after an
ordinary HTTP fetch has already come back as a JavaScript shell or a challenge.
Most pages never reach it.

It exists because of a measured dead end, not a preference. Two of the boards
Gabe applies through cannot be read by a plain fetch — Cloudstaff renders its
postings client-side, JobStreet answers a raw request with a Cloudflare
challenge — and the obvious fix, a headless browser, **cannot be deployed**:
`playwright` installs on Vercel and its Chromium never does. A hosted fetch
needs no binary.

Two details that are easy to get wrong:

* **`onlyMainContent` defaults to `true`** and must be set `false`. It would
  return the article body without the `<head>`, and `<head>` is where the
  JSON-LD `JobPosting` lives — the single best source this parser has.
* **v2 takes format OBJECTS**: `[{"type": "rawHtml"}]`. The v1 string form is
  rejected.

The reply's `data.metadata.url` is re-checked against the host rules before the
HTML is parsed. A hosted fetcher follows redirects on our behalf, so where it
LANDED is what matters — the same reason the httpx path re-checks
`response.url`.

**It is a fetcher, not an extractor.** Firecrawl also offers LLM extraction and
this deliberately does not use it: the parsing is Scrapling's, which is tested
against real pages, and the field extraction is `postingDigest`, which verifies
every value against the source text. Trusting a second model would give up that
check for nothing.

**Where the key goes.** The fetch is in `scraper/app.py`, so `FIRECRAWL_API_KEY`
must reach the PYTHON process — it does nothing in `.env.local`, which only Next
reads.

| | |
|---|---|
| local | `scraper/.env` — gitignored, loaded by `app.py` at startup |
| deployment | an ordinary Vercel project variable: `vercel env add FIRECRAWL_API_KEY production` |

Vercel environment variables are project-scoped rather than per-service, so one
entry reaches the Python service. A real environment variable always beats the
local file.

Free tier is 1,000 scrapes a month. **Every posting URL auto-filled is sent to
Firecrawl**, which is why `/privacy` names them.

### The second thing it fetches: a LinkedIn profile (2026-09-09)

`POST /profile` on the same service, behind `/api/profile` in Next, reads a
public LinkedIn profile and turns it into the `UserProfile` the Settings screen
renders. It is Gabe's revision item 8, reversing the 2026-09-06 removal of the
profile-page scraper.

**Firecrawl is the ONLY route here**, unlike `/extract`, which tries an
ordinary fetch first. A plain GET of a LinkedIn profile from a datacenter
address gets an authentication wall or a `999`, every time — so the ordinary
attempt would be a guaranteed wasted round trip, and the local-browser fallback
works on a laptop and never in a deployment. With no key configured the
endpoint answers `503` and says so, rather than pretending the profile is
private.

The payload differs from a posting's in one value: `waitFor` is 2s rather than
6s. A logged-out profile is server-rendered, so there is no posting body to wait
for. `onlyMainContent` stays `false` for the same reason as before — the JSON-LD
`ProfilePage` graph is in `<head>`.

**What it gets:** name, headline, summary, location, picture, `worksFor` →
experience (title, company, period), `alumniOf` → education, `knowsLanguage`,
`sameAs` → websites. **What it does not get, and will not:** the paragraph
under each role. A logged-out profile does not render it and the JSON-LD does
not carry it. `scraper/extractor/profile.py` returns that as a WARNING rather
than leaving the reader to conclude the import is broken.

The CSV-export parser (`src/services/linkedinExport.ts`, `ProfileImport`) is
kept and unused, on Gabe's instruction. It is still the only source that has
ever carried the bullet text.

**Rate limit:** three profile fetches per user per minute in
`src/app/api/profile/route.ts`, tighter than auto-fill's eight — each one costs
a Firecrawl credit and nobody imports their own profile eight times a minute.

---

## FormaTeX — LaTeX → PDF

Real REST API at `api.formatex.io/api/v1`. The contract in
`src/services/integrations/formatex.ts` comes from probing, because FormaTeX's
own `/docs/api` page 404s:

```
GET  api.formatex.io/api/v1/health   -> 200 {"status":"ok"}
POST api.formatex.io/api/v1/compile  -> 401 {"error":"missing API key"}
POST api.formatex.io/api/v1/compile
     with X-API-Key: bogus           -> 401 {"error":"invalid API key"}
POST api.formatex.io/v1/compile      -> 404   (wrong base path)
GET  formatex.io/mcp                 -> 200 text/html (a docs PAGE, not an endpoint)
```

The header name `X-API-Key` is **known** rather than assumed, because the error
**changed** when it was sent. That is the standard every claim in this file is
held to.

## CV tailoring — the contract, not a vendor

Scoring and rewriting are deliberately split:

- **Scoring stays deterministic and in-repo.** `atsMatch.ts` and `atsLint.ts`
  compute it, with tests. A number a user acts on should not come back
  different every time they ask for it.
- **Rewriting goes to any OpenAI-compatible free tier.** Groq, OpenRouter,
  Cloudflare Workers AI and a local Ollama all speak `POST /chat/completions`,
  and every one of those free tiers has moved its limits at least once — so the
  provider is two environment variables, never an import.

The system prompt forbids inventing experience, and that rule is asserted **on
the wire** by a test, so it cannot be edited out quietly.

## ESCO — free, keyless, and used very narrowly

`ec.europa.eu/esco/api` needs no credentials at all (`GET
/search?text=react` → 200, 93 results, no auth). But it is an *occupational*
taxonomy, not a technology index, and using it naively makes the matcher worse:

| query | what ESCO returns |
|---|---|
| `javascript` | "JavaScript" — usable |
| `typescript` | "TypeScript" — usable |
| `postgresql` | "PostgreSQL" — usable |
| `kubernetes` | nothing |
| `docker` | nothing |
| `react` | **"react to emergency situations in a live performance environment"** |
| `software engineer` | 604 hits, led by "utilise computer-aided software engineering tools" |

So a result counts **only when its title exactly equals the search term**. That
is precisely the condition every usable row meets and every trap fails. The
cost is recall; the alternative was teaching the scorer that "react calmly in
stressful situations" satisfies a React requirement.

---

## Job posting extraction — Scrapling (planned, M7)

**Status: chosen, not installed.** Nothing imports it and no route calls it.
Plan: `docs/superpowers/plans/2026-09-05-m7-scrapy-autofill.md`.

Today the Auto-fill button is a Deno edge function
(`supabase/functions/job-url-autofill/`) that fetches the page and runs
**regexes over the HTML string** — `<title>` is found with
`/<title[^>]*>([\s\S]*?)<\/title>/i`, because the Deno edge runtime has no DOM.
It works on pages with JSON-LD and degrades badly on everything else.

### Why Scrapling and not Scrapy

Scrapy was the first candidate and lost on architecture. Both checked
2026-09-06:

| | Scrapy | Scrapling |
|---|---|---|
| Version | 2.18.0 | **0.4.15** (pre-1.0) |
| Licence | BSD-3-Clause | BSD-3-Clause |
| Python | ≥3.10 | ≥3.10 |
| Shape | crawler engine (Twisted reactor, scheduler, dupefilter) | fetcher + parser |
| Per-request use | engine can't be restarted in-process; reactorless mode is **documented as experimental** | ordinary function call |
| Anti-bot | none — plain HTTP | `StealthyFetcher` / `DynamicFetcher`, claims Cloudflare Turnstile/Interstitial bypass |
| Selector maintenance | manual | `adaptive=True` relocates elements after markup changes |
| Maturity | 15 years | 78.6k stars, 6 open issues, active |

**The decisive point is that this app never crawls.** It fetches one URL that a
user pasted and parses it. Scrapy's entire value — scheduler, dupefilter,
concurrency, middlewares — goes unused, while its cost is real: the Twisted
reactor cannot be restarted in a process, which forced a two-lane architecture
purely to work around the framework. Scrapling is a fetcher and a parser, which
is the exact shape of the problem, and it brings the one capability that might
actually unblock the sites that are blocked.

### What was verified, and what was only claimed

Verified 2026-09-06 from `pyproject.toml` and the repository:

- 0.4.15, BSD-3-Clause, `requires-python = ">=3.10"`
- Core deps are small: `lxml`, `cssselect`, `orjson`, `tld`, `w3lib`,
  `typing_extensions`. No browser, no Twisted.
- `fetchers` extra pulls `curl_cffi`, `playwright`, `patchright`,
  `browserforge`, `apify-fingerprint-datapoints`, `msgspec`, `anyio`, `protego`
- `ai` extra pulls `mcp` + `markdownify` — Scrapling ships **its own MCP
  server** and an agent skill. Not adopted; noted so it is not discovered later
  and mistaken for something this project set up.
- Docker images are published per release.
- `Fetcher` uses **no browser**; `DynamicFetcher` and `StealthyFetcher` drive
  Chromium/Chrome through the Playwright API.

**Claimed by the project and NOT yet verified here:** that it "can easily
bypass all types of Cloudflare's Turnstile/Interstitial with automation." That
sentence is the reason Scrapling was chosen and it is the one thing nobody has
tested against JobStreet. **M7 Task 8 tests it.** Until that task reports, this
file says the challenged sites are blocked.

### The deployment consequence nobody should discover late

The Cloudflare-beating fetchers need a **real browser**. A Vercel Python
function caps at 250 MB (500 MB on Fluid); a Chromium or Camoufox install is
larger than that on its own. So the two fetchers cannot share a home:

| Lane | Fetcher | Runs on |
|---|---|---|
| Normal postings (most ATS) | `Fetcher` — HTTP only | Vercel Python function, internal service |
| Challenged hosts | `StealthyFetcher` / `DynamicFetcher` | a container — Scrapling's own published image |

If Task 8 finds the browser lane does not beat the challenge either, **the
second lane is never built** and the paste path stays the answer. The first
lane is worth it on its own for a real DOM and adaptive selectors.

### Challenged hosts, as measured

JobStreet, JobsDB and SEEK answer a server-side fetch with Cloudflare's
`Just a moment...` interstitial — 403 on every HTML path (`/job/<id>`,
`/jobs`, the homepage), from a browser User-Agent with full Accept headers.
Only `robots.txt` answers 200, because it is served outside the challenge.
Measured 2026-09-05 from Supabase's egress.

This is not a parsing problem better selectors would fix: no HTML ever reaches
the function. So the honest behaviour — which the current code already
implements and M7 must preserve — is to return **200 with what the URL alone
proves**, name the reason, and point at pasting, which works. A bot challenge
is not a broken link, and reporting one as "could not fetch this URL" sends the
user to check a URL that is perfectly correct.

---

## Setup

```bash
cp .env.example .env.local   # then fill in only what you want
```

| Variable | Needed for | Where to get it |
|---|---|---|
| `FORMATEX_API_KEY` | LaTeX → PDF | formatex.io dashboard |
| `FORMATEX_BASE_URL` | LaTeX → PDF | defaults to the verified base path |
| `TAILORING_BASE_URL` | AI tailoring | any OpenAI-compatible endpoint |
| `TAILORING_API_KEY` | AI tailoring | same provider |
| `TAILORING_MODEL` | AI tailoring | a model id that provider serves |
| `ESCO_ENABLED` | skills synonyms | nothing — on by default, no key |

Nothing here is required. Every client degrades to a documented fallback, and
`capabilitiesOf()` is what the UI branches on, so an unconfigured feature says
"set these variables" instead of failing mid-edit.

**`TAILORING_API_KEY` is deliberately not `NEXT_PUBLIC_`.** The rails call
`/api/tailor`, which holds the key server-side. A token in the bundle is a
token anyone can read out of the network tab and spend. The same rule will
apply to anything M7 adds.

## The rule this file is kept by

1. **Every claim names how it was checked.** A status with no method behind it
   is a memory, and memories about third-party APIs are wrong within a quarter.
2. **A connection working is not evidence the data is reachable.** LinkedIn is
   the worked example and it is why that row survives in the ruled-out table
   rather than being deleted.
3. **Numbers carry dates.** Toolkit counts, star counts, free-tier limits and
   pricing all move.
4. **Nothing is documented before it is called.** Composio's section used to
   tell you to register a tool-router URL it never told you how to obtain,
   because it was written from documentation instead of from a session.
