"""The extraction service.

INTERNAL ONLY. It has no auth of its own and it must never get a public route:
a service that fetches an arbitrary URL on request IS an open proxy running on
our egress IP with our rate budget, which is the thing the Deno function's
twenty-line comment warns about. `vercel.json` declares it as a service with no
top-level rewrite, so it is unroutable from the internet and reachable only
over the binding `/api/autofill` holds. Auth, rate limiting and the first SSRF
check all live in that route.

The redirect check runs here anyway -- see extractor/net.py for why the second
copy is not redundant.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import httpx
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from extractor.challenge import (
    autofill_from_url_alone,
    looks_like_bot_challenge,
    looks_like_javascript_shell,
)
from extractor.core import extract
from extractor.net import normalize_target_url, reject_reason
from extractor.profile import extract_profile

REQUEST_TIMEOUT_S = 12.0

#: How long to let a page finish rendering itself, after the network goes idle.
#:
#: MEASURED, on Cloudstaff (2026-09-06). `network_idle` alone returned a page
#: whose 4,930 visible characters were ENTIRELY its cookie banner -- the
#: posting had not been written to the DOM yet. Six seconds got the whole
#: posting; three did not.
RENDER_SETTLE_MS = 6000
RENDER_TIMEOUT_MS = 45_000

#: Firecrawl: a hosted fetcher that runs the page and handles the proxying.
#:
#: IT REPLACES THE BROWSER THIS SERVICE CANNOT SHIP. `playwright` installs on
#: Vercel and its Chromium never does -- the Python builder runs no
#: post-install step -- so JavaScript rendering worked locally and nowhere
#: else. A hosted fetch needs no binary, which is the whole point.
#:
#: `onlyMainContent` MUST BE FALSE. It defaults to true and would hand back the
#: article body without the `<head>` -- and `<head>` is where the JSON-LD
#: JobPosting lives, which is the single best source this parser has. Asking
#: for "the main content" would quietly throw away the good half.
FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v2/scrape"
FIRECRAWL_TIMEOUT_S = 60.0
MAX_HTML_BYTES = 2_000_000

# The header set the Deno function arrived at. Kept verbatim: it is what a
# browser sends, and several boards vary their markup by it.
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
}

def _load_local_env(path: Path = Path(__file__).with_name(".env")) -> None:
    """Reads `scraper/.env` into the environment, for local runs only.

    WHY THIS EXISTS. The web app's secrets live in `.env.local`, which Next
    loads; this service is a separate Python process started by
    `npm run dev:scraper` and never sees that file. Without something here the
    only way to give the extractor a key locally is to export it in whichever
    shell happens to start uvicorn -- which works once and is forgotten by the
    next terminal.

    A DEPLOYMENT NEVER REACHES THIS: the file is gitignored and absent, and
    Vercel sets real environment variables, which take precedence because an
    existing key is left alone.

    Hand-parsed rather than pulling in python-dotenv: it is `KEY=VALUE`, and a
    dependency for twelve lines is a dependency to keep upgrading.
    """
    try:
        if not path.is_file():
            return
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip("'\"")
            # A real environment variable always wins.
            if key and key not in os.environ:
                os.environ[key] = value
    except OSError:
        # An unreadable local file must never stop the service starting.
        pass


_load_local_env()

app = FastAPI(title="worktrack-extractor", docs_url=None, redoc_url=None)


class ProfileRequest(BaseModel):
    url: str


class ExtractRequest(BaseModel):
    url: str
    #: HTML the CALLER already has, which skips the fetch entirely.
    #:
    #: The parser never cared where the string came from, so this costs nothing
    #: and buys the pages no server can reach: anything behind a login, and
    #: anything whose operator refuses datacenter traffic. A browser that is
    #: already looking at the posting is not a scraper.
    html: str | None = None


def firecrawl_profile_payload(url: str) -> dict[str, Any]:
    """The profile fetch's body.

    SAME SHAPE AS A POSTING'S, and for the same reason: `onlyMainContent` stays
    False because the JSON-LD `ProfilePage` graph lives in `<head>`, which is
    exactly what "main content" throws away. The wait is shorter -- a profile
    is server-rendered for a logged-out visitor, so there is no posting body to
    wait for.
    """
    return {
        "url": url,
        "formats": [{"type": "rawHtml"}],
        "onlyMainContent": False,
        "waitFor": 2000,
        "timeout": RENDER_TIMEOUT_MS,
    }


def firecrawl_payload(url: str) -> dict[str, Any]:
    """The request body, separated so it can be asserted on without a network."""
    return {
        "url": url,
        # v2 takes format OBJECTS, not strings.
        "formats": [{"type": "rawHtml"}],
        # See FIRECRAWL_ENDPOINT: the head is not optional for this parser.
        "onlyMainContent": False,
        "waitFor": RENDER_SETTLE_MS,
        "timeout": RENDER_TIMEOUT_MS,
    }


def firecrawl_html(payload: dict[str, Any]) -> tuple[str | None, str | None]:
    """The HTML and the final URL out of a Firecrawl reply.

    Returns `(html, final_url)`. The final URL matters as much as the HTML: a
    hosted fetcher follows redirects on our behalf, so where it LANDED is the
    thing that has to pass the host check -- exactly the reason the httpx path
    re-checks `response.url` rather than trusting what was asked for.
    """
    if not isinstance(payload, dict) or not payload.get("success"):
        return None, None
    data = payload.get("data")
    if not isinstance(data, dict):
        return None, None
    html = data.get("rawHtml") or data.get("html")
    metadata = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}
    final = metadata.get("url") or metadata.get("sourceURL")
    return (html if isinstance(html, str) and html.strip() else None,
            final if isinstance(final, str) else None)


async def _firecrawl_fetch(
    url: str, payload: dict[str, Any] | None = None
) -> tuple[str | None, str]:
    """Fetch through Firecrawl. Returns `(html, reason)`.

    `reason` IS THE POINT OF THIS SHAPE. Every failure here used to collapse
    into `None`, which is fine for `/extract` -- it has an ordinary fetch and a
    browser to fall back on, so the caller only needs to know it did not work.
    `/profile` has no fallback: Firecrawl is the only route, so "it did not
    work" is the entire answer the user gets, and "Could not read that profile
    page. Check the link is public" sent Gabe off to check a link that was fine
    (2026-09-10, first real test).

    The reasons are distinguishable because the fixes are: an exhausted plan is
    a billing page, a 401 is a wrong key, a refused host is Firecrawl declining
    the site, and an empty body is a page that rendered to nothing.
    """
    key = os.environ.get("FIRECRAWL_API_KEY", "").strip()
    if not key:
        return None, "no-key"
    try:
        async with httpx.AsyncClient(timeout=FIRECRAWL_TIMEOUT_S) as client:
            response = await client.post(
                FIRECRAWL_ENDPOINT,
                headers={"Authorization": f"Bearer {key}"},
                json=payload or firecrawl_payload(url),
            )
    except httpx.TimeoutException:
        return None, "timeout"
    except Exception:
        return None, "unreachable"

    if response.status_code != 200:
        # 402 is an exhausted plan, 429 a rate limit, 401 a bad key, and 403
        # is Firecrawl declining the site itself. None is worth a stack trace
        # and all four are worth telling apart.
        detail = ""
        try:
            body = response.json()
            if isinstance(body, dict):
                detail = str(body.get("error") or body.get("message") or "")[:200]
        except Exception:
            detail = response.text[:200]
        return None, f"http-{response.status_code}" + (f": {detail}" if detail else "")

    try:
        html, final = firecrawl_html(response.json())
    except Exception:
        return None, "unreadable-response"
    if final and reject_reason(final):
        return None, "redirected-to-blocked-host"
    if not html:
        return None, "empty-body"
    return html, "ok"


async def _fetch_via_firecrawl(
    url: str, payload: dict[str, Any] | None = None
) -> str | None:
    """The `/extract` path, which only needs to know whether it worked."""
    html, _ = await _firecrawl_fetch(url, payload)
    return html


def _render(url: str) -> str | None:
    """The page as a browser sees it, for sites that render themselves.

    A PLAIN HEADLESS BROWSER, deliberately. Scrapling also ships
    `StealthyFetcher`, which exists to defeat bot detection -- this uses
    `DynamicFetcher`, which just runs the page's own JavaScript. Rendering a
    page the way a browser would is ordinary; dressing up to get past a site
    that has said no is a different thing, and not something this service does.
    Sites that refuse it fall through to the caller supplying HTML instead.
    """
    try:
        from scrapling.fetchers import DynamicFetcher

        page = DynamicFetcher.fetch(
            url,
            headless=True,
            network_idle=True,
            timeout=RENDER_TIMEOUT_MS,
            wait=RENDER_SETTLE_MS,
        )
        return page.html_content or None
    except Exception:
        # Rendering is the SECOND attempt, so a failure here is not fatal --
        # the static HTML is still what gets parsed, and its own warnings then
        # describe what was missing.
        return None


async def _fetch_rendered(url: str) -> str | None:
    """The page as a browser sees it, by whichever route is available.

    FIRECRAWL FIRST, because it is the one that works in production. The local
    browser is the fallback: it needs a Chromium that only exists on a
    developer's machine, so in a deployment this second attempt simply returns
    None and the caller falls through to its own message.

    Neither is reached unless the ordinary fetch already came back as a shell
    or a challenge -- rendering costs money or a browser launch, and most pages
    need neither.
    """
    via_firecrawl = await _fetch_via_firecrawl(url)
    if via_firecrawl:
        return via_firecrawl
    return await asyncio.to_thread(_render, url)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/profile")
async def profile_endpoint(body: ProfileRequest) -> JSONResponse:
    """A public LinkedIn profile, read through Firecrawl.

    FIRECRAWL IS THE ONLY ROUTE HERE, unlike `/extract` which tries an ordinary
    fetch first. A plain GET of a LinkedIn profile from a datacenter address
    gets an authentication wall or a 999, every time -- so the ordinary attempt
    would be a guaranteed round trip to a page that cannot be parsed, and
    falling back to a local headless browser would work on a laptop and never
    in a deployment. One route that works, or a message saying why not.

    The same SSRF gate as every other fetch in this service, and the landed URL
    is re-checked because a hosted fetcher follows redirects on our behalf.
    """
    url = normalize_target_url(body.url)
    reason = reject_reason(url)
    if reason:
        return JSONResponse({"error": reason}, status_code=400)

    if not os.environ.get("FIRECRAWL_API_KEY", "").strip():
        # 503, not 500: the deployment is missing a key, which is a
        # configuration fact rather than a failure of this request.
        return JSONResponse(
            {"error": "Profile import is not configured for this deployment."},
            status_code=503,
        )

    html, reason = await _firecrawl_fetch(url, firecrawl_profile_payload(url))
    if not html:
        # THE REASON REACHES THE USER, because there is no fallback route here
        # and a generic message sends them to check a link that is fine.
        friendly = {
            "timeout": "The profile page took too long to load. Try again.",
            "unreachable": "Could not reach the page reader. Try again shortly.",
            "empty-body": (
                "That page came back empty. LinkedIn shows a sign-in wall to "
                "visitors for some profiles; only a public one can be read."
            ),
            "redirected-to-blocked-host": "That link redirected somewhere it should not.",
            "unreadable-response": "The page reader returned something unexpected.",
        }.get(reason)
        if friendly is None and reason.startswith("http-402"):
            friendly = "The page reader's monthly quota is used up."
        if friendly is None and reason.startswith("http-401"):
            friendly = "The page reader rejected our credentials."
        if friendly is None and reason.startswith("http-403"):
            friendly = "The page reader will not fetch that site."
        if friendly is None and reason.startswith("http-429"):
            friendly = "The page reader is rate limiting us. Try again in a minute."
        return JSONResponse(
            {
                "error": friendly or "Could not read that profile page.",
                # The raw reason, so a failure can be diagnosed from the
                # response instead of from a log nobody kept.
                "reason": reason,
            },
            status_code=422,
        )
    if len(html.encode("utf-8", "ignore")) > MAX_HTML_BYTES:
        return JSONResponse({"error": "Profile page is too large"}, status_code=422)

    return JSONResponse(extract_profile(url, html), status_code=200)


@app.post("/extract")
async def extract_endpoint(body: ExtractRequest) -> JSONResponse:
    url = normalize_target_url(body.url)
    reason = reject_reason(url)
    if reason:
        return JSONResponse({"error": reason}, status_code=400)

    # CALLER-SUPPLIED HTML SHORT-CIRCUITS EVERYTHING. No fetch, so no timeout,
    # no redirect check to repeat, and no way for this service to be pointed at
    # something the caller could not already read.
    if body.html:
        if len(body.html.encode("utf-8", "ignore")) > MAX_HTML_BYTES:
            return JSONResponse({"error": "Page content is too large"}, status_code=422)
        return JSONResponse(extract(url, body.html, 200), status_code=200)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=REQUEST_TIMEOUT_S, headers=BROWSER_HEADERS
        ) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        return JSONResponse({"error": "Timed out while fetching job page"}, status_code=504)
    except httpx.HTTPError:
        return JSONResponse({"error": "Could not fetch this URL"}, status_code=422)

    final_url = str(response.url)
    # THE REDIRECT IS A SECOND URL. The caller validated what the user typed;
    # only this can see where it landed.
    if reject_reason(final_url):
        return JSONResponse({"error": "URL redirected to an invalid host"}, status_code=422)

    body_text = response.text

    # A challenge answers before the content-type check, because a 403
    # interstitial is often served as HTML and would otherwise read as a
    # perfectly ordinary failed fetch.
    #
    # RENDERING IS TRIED FIRST, THOUGH, and the distinction matters. JobStreet
    # answers a raw HTTP fetch with Cloudflare's "Just a moment" interstitial
    # and answers an ORDINARY HEADLESS BROWSER with the page (measured
    # 2026-09-06: 403 vs 200, 6,320 visible characters, no challenge). The
    # challenge is aimed at clients that cannot run the page, so running it is
    # not getting around anything -- it is being the kind of client the site
    # already serves.
    #
    # `_render` uses a plain browser for exactly that reason. Scrapling also
    # ships `StealthyFetcher`, whose purpose is to defeat bot detection, and
    # this service does not use it: a site that says no to a real browser has
    # said no, and the answer to that is the caller supplying HTML from their
    # own session, not a better disguise.
    if looks_like_bot_challenge(response.status_code, body_text):
        rendered = await _fetch_rendered(final_url)
        if rendered and not looks_like_bot_challenge(200, rendered):
            return JSONResponse(extract(final_url, rendered, 200), status_code=200)
        return JSONResponse(autofill_from_url_alone(final_url), status_code=200)

    if response.status_code >= 400:
        return JSONResponse(
            {"error": f"Could not fetch page (status {response.status_code})"}, status_code=422
        )

    content_type = (response.headers.get("content-type") or "").lower()
    if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
        return JSONResponse({"error": "URL did not return an HTML page"}, status_code=422)

    if not body_text or len(body_text.encode("utf-8", "ignore")) > MAX_HTML_BYTES:
        return JSONResponse({"error": "Page content is too large or empty"}, status_code=422)

    # A JAVASCRIPT SHELL IS NOT A PAGE. Cloudstaff answers a plain fetch with
    # 110KB of HTML containing fifteen visible characters, because every
    # posting is rendered client-side -- and the extractor then produced three
    # vague warnings about a document that simply had nothing in it. Rendering
    # is tried only here, on the pages that need it, because it costs a browser
    # launch and most pages do not.
    if looks_like_javascript_shell(body_text):
        rendered = await _fetch_rendered(final_url)
        if rendered and not looks_like_javascript_shell(rendered):
            body_text = rendered

    return JSONResponse(extract(final_url, body_text, response.status_code), status_code=200)
