# M7 — Scrapling Extraction Pipeline for Auto-fill

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development` or `fable-mode:fable-milestone-execution`. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the regex-over-HTML extractor behind the Auto-fill button with Scrapling, so extraction runs against a real DOM with adaptive selectors, every supported site has a fixture-locked test plus a nightly live canary, and `docs/INTEGRATIONS.md` states measured per-site coverage generated from that canary.

**Status, 2026-09-06: THE EXTRACTOR IS BUILT. THE DEPLOYMENT IS NOT.**

Done, with 49 passing Python tests:

- `scraper/` -- Scrapling 0.4.15 pinned, core only (7 packages, no browser).
- `extractor/` -- schema, normalisers, the SSRF gate, the challenge handling,
  a generic JSON-LD/OpenGraph extractor and four board heuristics, all behind
  `Page`, the one module that touches Scrapling.
- **All twenty of the Deno parser's cases ported and passing**, plus the SSRF
  gate and a TS-to-Python field-parity test.
- `app.py` -- the FastAPI service. Written, imports, not deployed.
- `.github/workflows/scraper.yml` -- the offline suite on every push.

Two defects fell out of building it, both fixed and both shipped:

- **`work_mode` was extracted and thrown away.** The Deno parser had computed
  it since it shipped -- from `jobLocationType` and from page text, with a
  confidence score -- and `JobAutofillResult` never declared the field, so the
  form could not read it. The parity test is what found it.
- **JobsDB was on the blocked list and is not blocked.** See Task 8 below.

**Tasks 1 and 6 are now done too, and deployed.**

Task 1's gate was answered by a branch spike rather than by reading: Vercel
Services WORKS on this Hobby account. The build log reads `Using Python 3.13
from scraper/.python-version` and `Creating virtual environment at
.../python/services/extractor/.venv`, and the deployment reports
`{"nodejs":4,"python":1}` where every previous one reported `{"nodejs":4}`. It
also settled the second unknown: `web` rooted at `.` is accepted while
`extractor` is rooted at `scraper/` INSIDE it, which the docs' sibling-directory
example did not cover.

Verified on production after the merge:

| probe | result | what it proves |
|---|---|---|
| `POST /api/autofill`, no token | `401 {"error":"Sign in to use this."}` | the route exists and authenticates |
| `GET /health` | **404** | the extractor has no public route |
| `GET /` | 200 | the site is unaffected |

**STILL UNVERIFIED BY ME: the binding at runtime.** Whether `EXTRACTOR_URL` is
injected and reachable can only be seen from an authenticated request, and I
cannot sign in. One signed-in click of Auto-fill settles it. If the binding is
missing the route answers `503 "Auto-fill is not configured for this
deployment."` rather than failing obscurely, and `git revert -m 1` on the merge
puts Auto-fill back on the Deno function, which is still deployed.

**Task 9 (deleting the edge function) is deliberately NOT done** until that
click happens. Task 7's live canary is also not armed: it makes scheduled
requests to third parties and is not worth arming until the path it guards is
confirmed.

**Supersedes** `2026-09-05-m7-scrapy-autofill.md` (deleted). Scrapy lost; the comparison is recorded in `docs/INTEGRATIONS.md` so it is not re-argued.

---

## Why Scrapling replaced Scrapy

The short version: **this app never crawls.** It fetches one URL a user pasted
and parses it. Scrapy's whole value — scheduler, dupefilter, concurrency,
middleware chain — goes unused, while its cost is structural: a Twisted reactor
cannot be restarted in a process, so the previous plan carried a two-lane
architecture that existed only to work around the framework. That complexity is
now gone.

Scrapling also brings the one thing Scrapy cannot: `StealthyFetcher` and
`DynamicFetcher`, which claim to bypass Cloudflare's Turnstile/Interstitial.
That is the exact wall JobStreet, JobsDB and SEEK put up.

**The honest caveat, and it is load-bearing:** that bypass claim is the
project's, not a measurement. Nobody here has run it against JobStreet. **Task
8 tests it, and is allowed to conclude it does not work.** Everything before
Task 8 is worth building whether or not the answer is yes, because a real DOM
and adaptive selectors fix the *other* half — the half that fails silently on
ordinary career sites today.

Verified 2026-09-06 (`pyproject.toml`, repo): Scrapling 0.4.15, BSD-3-Clause,
`requires-python >=3.10`, 78.6k stars, 6 open issues, Docker images per
release. Core deps are `lxml`, `cssselect`, `orjson`, `tld`, `w3lib` — no
browser and no Twisted. `Fetcher` uses no browser; `DynamicFetcher` and
`StealthyFetcher` drive Chromium/Chrome via the Playwright API.

**Risk to hold in view: 0.4.15 is pre-1.0.** Mitigation is Task 2's boundary —
Scrapling is a fetch-and-select layer behind our own `extract()`, never an
architecture we spread through the codebase. Pin the exact version.

---

## Architecture

```
                    src/app/api/autofill/route.ts       ← auth, rate limit, SSRF
                                 │                        (Next, public)
                                 │  internal binding
                                 ▼
                    scraper/  (Vercel Service, NOT publicly routable)
                      app.py  FastAPI  POST /extract
                                 │
                      extract(url) → Scrapling Fetcher → adaptive selectors
                                 │
                                 └─ challenged host? → Task 8 decides whether
                                    a browser lane exists at all
```

**One code path, two possible fetchers.** `Fetcher` (HTTP only, no browser)
serves every normal posting and fits a Vercel Python function. The browser
fetchers need Chromium or Camoufox — larger on their own than the 250 MB
function limit (500 MB on Fluid) — so if Task 8 says they work, they deploy as
a **container** using Scrapling's published image, and `extract()` routes
challenged hosts to it. **If Task 8 says they do not work, that lane is never
built** and the paste path stays the answer.

### Deployment

```jsonc
// vercel.json — replaces the current two-line file
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "web":       { "root": ".",        "framework": "nextjs" },
    "extractor": { "root": "scraper/", "entrypoint": "app:app" }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": { "service": "web" } }
  ]
}
```

`extractor` gets **no** top-level rewrite, so it has no public URL; `web`
reaches it over a binding. Verified from Vercel's docs 2026-09-06: *"A service
is internal by default and will not be routable from the Internet unless you
expose it,"* and bindings inject the target URL as an env var.

This matters more than it looks. A public Python function that fetches an
arbitrary URL is precisely the open fetch proxy that
`supabase/functions/job-url-autofill/index.ts` spends twenty lines warning
about — it would need its own auth, its own SSRF guard and its own rate
limiter, three copies of security code that must never disagree.

**Vercel Services requires an account permission.** Task 1 checks before
anything is built on it. Plan B — a separate unlisted project gated by
`EXTRACTOR_SHARED_SECRET` — is strictly worse and is not the default.

### Where the gate lives

`src/app/api/__tests__/routesAreGuarded.test.ts` scans every `route.ts` under
`src/app/api` and asserts it imports `@/lib/apiAuth`, calls
`await authenticate(request)`, branches on `if (!auth.ok)`, and does so before
`request.json()`. The new route satisfies that or the suite fails. That test is
a feature here: it is what stops M7 shipping the fourth unauthenticated route.

---

## Repository layout

```
scraper/
  pyproject.toml            # scrapling[fetchers]==0.4.15, fastapi; requires-python ">=3.12"
  .python-version           # 3.14
  app.py                    # FastAPI: POST /extract {url} -> envelope
  extractor/
    __init__.py
    schema.py               # JobValues — the wire contract
    registry.py             # hostname -> site module
    core.py                 # extract(url) — fetch, dispatch, envelope
    challenge.py            # port of looksLikeBotChallenge / autofillFromUrlAlone
    sites/
      generic.py            # JSON-LD JobPosting + OpenGraph. The default.
      linkedin.py  greenhouse.py  lever.py  workday.py
  tests/
    fixtures/<site>/<case>.html
    fixtures/<site>/<case>.expected.json
    test_<site>.py
```

`venv/` at the repo root is a scratch environment holding matplotlib/pandas and
is **not** this project's environment. `scraper/` gets its own; `.gitignore`
covers it.

## The wire contract

The response envelope stays exactly what the client already parses —
`{ values, confidence, warnings }` — so `jobService.autofillFromUrl`,
`ApplicationForm`'s `onAutofill` prop and every existing test keep their shape.
**`JobAutofillResult` in `src/types/index.ts` does not change in this
milestone.** A contract test (Task 3) reads both files and asserts the field
sets are equal, so Python and TypeScript cannot drift silently.

Fields: `company, role, location, work_mode, source, salary_min, salary_max, url`.

---

## Decisions needed from Gabe before Task 4

1. **`robots.txt` policy.** Scrapling ships `protego` (the same parser Scrapy
   uses). Recommendation: obey it for the canary and backfill crawls; for the
   single user-pasted fetch, treat it as a fetch on the user's behalf and do
   not. LinkedIn's robots.txt disallows nearly everything, so obeying it
   everywhere removes the best-covered site in the current parser. Policy call,
   not technical — the plan will not pick it silently.
2. **How far Task 8 may go.** Plain `Fetcher` only, or may it try
   `StealthyFetcher` with a real browser against the challenged hosts?
3. **Indeed and Glassdoor** — in M7, or later? Neither exists today.
4. **`adaptive=True` on or off by default?** Auto-relocating an element after
   markup changes is the feature; it can also silently keep returning *a*
   value after the right one is gone. Recommendation: on, with the canary
   asserting values rather than mere presence, so a drifted selector still
   trips something.

---

## Tasks

### Task 0 — `scraper/` skeleton, green empty suite
- [ ] `pyproject.toml`: `requires-python ">=3.12"`; `scrapling[fetchers]==0.4.15`, `fastapi`, `uvicorn`; dev `pytest`.
- [ ] `.python-version` = `3.14`. `.gitignore`: `scraper/.venv/`, `__pycache__/`, `*.pyc`.
- [ ] `npm run test:scraper` → `cd scraper && pytest`, wired into `package.json`.
- [ ] **Gate:** `pytest` collects zero tests without error; `python -c "import scrapling"` succeeds.

### Task 1 — Confirm the deployment shape before building on it
- [ ] Confirm Vercel Services is available on this account. Record the exact command and output in the task report.
- [ ] If yes: `vercel.json` gets `services` + the single rewrite; `web` declares the binding. If no: Plan B, and **write in the report that Plan B is in force**, because every later task's threat model changes.
- [ ] Measure the built bundle size with `scrapling[fetchers]` installed. `curl_cffi`, `playwright` and `patchright` are in that extra and may alone blow the limit — if so, split to a `fetchers`-free install for the HTTP lane and record the actual dependency set used.
- [ ] **Gate:** `GET /health` returns 200 from the Next server process **and is not routable from the public deployment URL**. Both halves demonstrated; the second is the security property.

### Task 2 — The extraction boundary and the generic site module (TDD)
- [ ] Save three real pages carrying `application/ld+json` `JobPosting` (one Greenhouse, one Lever, one plain career site) as byte-verbatim fixtures.
- [ ] Write each `.expected.json` **first**, by hand, from reading the page. Watch the tests fail.
- [ ] Implement `schema.py`, `sites/generic.py`: JSON-LD first (`title`, `hiringOrganization.name`, `jobLocation.address`, `baseSalary.value.{minValue,maxValue}`, `jobLocationType`), OpenGraph second, `<title>` last, keeping the confidence ladder `parser.ts` already uses (JSON-LD 0.95, og 0.7, title 0.55).
- [ ] Port the normalisers from `parser.ts` — `normalizeCompany`, `normalizeRole`, `inferWorkModeFromText`, `extractSalaryRangeFromText`, entity decoding — and port every case from `src/lib/__tests__/jobAutofillParser.test.ts` into `pytest`, so nothing regresses.
- [ ] **The boundary rule:** site modules take a parsed page and return values. Scrapling types do not leak past `core.py`. This is what makes a 0.x dependency survivable.
- [ ] **Gate:** all fixture tests pass; every case in the existing TS parser test has a passing Python equivalent.

### Task 3 — `extract()`, dispatch, and the field-parity contract test
- [ ] `core.py: extract(url) -> dict` — fetch, pick the site module via `registry.py` (`generic` default, matching the hosts `extractAutofill` branches on today), return `{values, confidence, warnings}`.
- [ ] `challenge.py`: port `looksLikeBotChallenge` and `autofillFromUrlAlone` **verbatim in behaviour**. A challenge returns **200 with what the URL alone proves plus a named warning**, never a generic error. This is the behaviour `parser.ts` argues for at length and it must survive the port.
- [ ] Re-validate the final URL after redirects — the route validated the *input*; a redirect is a second URL and gets checked where the fetch lands.
- [ ] Contract test: read `src/types/index.ts` and `schema.py`, assert equal field sets. Must fail if either side adds a field alone.
- [ ] **Gate:** tests cover challenge-as-403, challenge-as-200, non-HTML content-type, oversized body, redirect-to-private-host.

### Task 4 — Per-site modules
One fixture set and one test file each, TDD, before the module.
- [ ] `greenhouse.py`, `lever.py` — mostly JSON-LD; these pin `source` and the company-from-path rule.
- [ ] `workday.py` — `myworkdayjobs.com` renders client-side. Measure what the server actually returns first; if it is a shell, say so in the fixture README rather than writing selectors that pass only against a fixture.
- [ ] `linkedin.py` — port the `hiring <Role>` og:description rule (the highest-signal heuristic in `parser.ts`) and **drop** the "last resort scan body text for ` at COMPANY`" fallback: at confidence 0.5 it is a coin flip presented as data.
- [ ] `indeed.py` only if Decision 3 says yes.
- [ ] **Gate:** every site has ≥2 fixtures, one of them a page *missing* fields, so the warnings path is covered.

### Task 5 — `/api/autofill` and the client switch
- [ ] `src/app/api/autofill/route.ts`: `authenticate(request)` first, then rate limit, then SSRF-validate, then call the bound extractor.
- [ ] Port `isDisallowedHostname`, `normalizeTargetUrl` and the IPv4/IPv6 private-range checks from `index.ts` into `src/lib/` **with their tests** rather than rewriting them — they are the security-critical part and they are already correct.
- [ ] `jobService.autofillFromUrl` swaps `supabase.functions.invoke('job-url-autofill')` for `fetch('/api/autofill')` with the bearer token, keeping the Sentry breadcrumbs, the `requestId` and the `!('values' in data)` shape check.
- [ ] Keep the Deno function deployed and unchanged until Task 9's cutover gate. Two live paths for one milestone is the cost of not breaking the button.
- [ ] **Gate:** `routesAreGuarded.test.ts` passes with the new route; `jobService.test.ts` and both `applications` page tests pass **unmodified**; signed-out `curl` to `/api/autofill` gets 401.

### Task 6 — The automated workflow *(the headline of this milestone)*
- [ ] **Fixture regression, every PR.** `.github/workflows/scraper.yml` runs `pytest` on any push touching `scraper/**`. Offline, deterministic, seconds.
- [ ] **Live canary, nightly (`0 3 * * *`).** One long-lived public posting per supported site; assert the required fields extract **with their expected values**, not merely that something came back — see Decision 4.
- [ ] **Failure opens an issue, not a red badge nobody reads.** The canary writes `canary-report.json`; a step opens or updates one issue titled `Autofill coverage: <site>`, naming the site and the exact field that went missing, and closes it on the next green run.
- [ ] **Fixture refresh is one command**, writing both the `.html` and a candidate `.expected.json`. Fixing a broken site becomes: refresh, watch the test fail, fix the selector, watch it pass.
- [ ] **The coverage table is generated.** `scripts/coverage-table.py` turns `canary-report.json` into the table in `docs/INTEGRATIONS.md` between `<!-- coverage:start -->` / `<!-- coverage:end -->`, stamped with the run date, committed by the nightly job when it changes. **This is what stops that document going stale by hand.**
- [ ] **Backfill, `workflow_dispatch` only** — re-enriches saved rows with missing fields. Never scheduled: it touches user data and must be a deliberate act.
- [ ] **Gate:** break one selector on a branch and watch the PR job go red naming that site; point the canary at a 404 and watch the issue open. Both demonstrated, not described.

### Task 7 — Adaptive selectors, measured rather than assumed
- [ ] Turn `adaptive=True` on for the site modules. Take a fixture, mutate its markup the way a real redesign would (rename a class, move a node one level), and assert the value is still found.
- [ ] Then assert the **failure** direction: delete the element entirely and confirm extraction reports it missing rather than relocating onto something plausible-but-wrong. A silent wrong answer is worse than a warning.
- [ ] **Gate:** both directions covered by tests. If the second cannot be made to pass, `adaptive` goes off and this task records why.

### Task 8 — DONE, 2026-09-06, and it changed the answer

Measured from a residential PH connection with the service's own browser
headers, on `/` and `/jobs` for each:

| site | status | body | verdict |
|---|---|---|---|
| JobStreet | 403 | 6KB, `Just a moment...`, Cloudflare markers | **blocked** |
| **JobsDB** | **200** | **950KB, `<title>Jobs in Hong Kong ...`** | **NOT blocked** |
| SEEK | 403 | 50KB, SEEK's own page, no CF marker | **blocked (403, not a challenge)** |
| Greenhouse | 200 | 190KB | control -- proves the client, not the sites |

**JobsDB came off the blocked list, in both implementations.** It answers a
plain server-side fetch with real HTML. Leaving it there refused a site the app
can read, which is the exact failure `parser.ts`'s own test already guards in
the other direction: "a site that does NOT block must not be labelled as one".

**SEEK's description was wrong and its behaviour is unchanged.** It is a 403
with SEEK's own page, not a Cloudflare interstitial. The status is the refusal
either way; calling it Cloudflare would send the next person hunting for a
challenge that is not there.

**The browser lane was NOT attempted.** Decision 2 was never answered, and
trying TLS impersonation or a headless browser against a site that is refusing
us is not something to do on an assumption.

### Task 8 (original text) — measure, then decide whether a browser lane exists
- [ ] Run `Fetcher` against JobStreet, JobsDB and SEEK from a GitHub runner (a different egress from Supabase's — worth one data point, since 2026-09-05's measurement came from one network). Record status, `content-type`, first 200 bytes.
- [ ] Per Decision 2, then try `StealthyFetcher`. **This is the test of the claim M7 was chosen on.**
- [ ] **This task is allowed to conclude "still blocked."** If it does: no browser lane is built, `CHALLENGED_HOSTS` ports across unchanged, and `INTEGRATIONS.md` gains a second dated measurement — which is stronger evidence than one.
- [ ] If it succeeds, report it as *"worked on this date, from this IP, with this fetcher"* and never as "JobStreet is supported." Then scope the container lane as its own task; do **not** fold it into this one.
- [ ] **Gate:** a host → fetcher → status → verdict table with raw evidence in the task report. No site module is added for a host this task could not read.

### Task 9 — Docs, then cutover
- [ ] Update `docs/INTEGRATIONS.md`'s Scrapling section from the Task 6/7/8 **reports**, not from this plan. Its "Planned, M7. Not installed." status becomes a measured one. The claim/verified split in that section is the thing to preserve.
- [ ] `.env.example` gains only variables the code reads. `EXTRACTOR_URL` is injected by the binding and does not belong there; `EXTRACTOR_SHARED_SECRET` appears only under Plan B.
- [ ] `src/app/privacy/page.tsx`: unchanged **if** no third-party proxy or browser service was adopted. If one was, that page names it in the same commit — it currently claims Vercel and Supabase are the only third parties involved, and `page.test.tsx` holds it to that.
- [ ] Delete `supabase/functions/job-url-autofill/`; repoint `load-tests/job-autofill.yml` at `/api/autofill`.
- [ ] **Gate:** `npm run test`, `npm run lint`, `npm run build`, `cd scraper && pytest` green; Auto-fill verified in the browser against three real postings; `grep -rn "job-url-autofill" --include="*.ts" --include="*.tsx" .` returns nothing outside plan documents.

---

## Risks

| Risk | Mitigation |
|---|---|
| **Scrapling is 0.4.15** — pre-1.0, API may break | Exact pin; Scrapling types never leak past `core.py` (Task 2's boundary rule) |
| The Cloudflare bypass claim does not hold | Task 8 is written to accept that answer; nothing before it depends on the claim |
| `scrapling[fetchers]` pulls playwright/patchright and blows the function size limit | Task 1 measures it; the HTTP lane can install without that extra |
| Vercel Services unavailable on this account | Task 1 checks first; Plan B documented and strictly worse |
| `adaptive=True` relocates onto a wrong element and reports confidently | Task 7 tests the failure direction explicitly; canary asserts values, not presence |
| Fixtures rot into tests passing against pages that no longer exist | The nightly canary is the whole answer |
| Two live autofill paths during M7 | Deno function untouched, deleted only at Task 9's gate |

## Out of scope

Auto-submitting applications (SEEK's terms forbid it), Scrapling's MCP server
and agent skill (it ships both; neither is adopted), any change to
`JobAutofillResult` or to `ApplicationForm`'s props.
