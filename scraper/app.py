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

REQUEST_TIMEOUT_S = 12.0

#: How long to let a page finish rendering itself, after the network goes idle.
#:
#: MEASURED, on Cloudstaff (2026-09-06). `network_idle` alone returned a page
#: whose 4,930 visible characters were ENTIRELY its cookie banner -- the
#: posting had not been written to the DOM yet. Six seconds got the whole
#: posting; three did not.
RENDER_SETTLE_MS = 6000
RENDER_TIMEOUT_MS = 45_000
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

app = FastAPI(title="worktrack-extractor", docs_url=None, redoc_url=None)


class ExtractRequest(BaseModel):
    url: str
    #: HTML the CALLER already has, which skips the fetch entirely.
    #:
    #: The parser never cared where the string came from, so this costs nothing
    #: and buys the pages no server can reach: anything behind a login, and
    #: anything whose operator refuses datacenter traffic. A browser that is
    #: already looking at the posting is not a scraper.
    html: str | None = None


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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
        rendered = await asyncio.to_thread(_render, final_url)
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
        rendered = await asyncio.to_thread(_render, final_url)
        if rendered and not looks_like_javascript_shell(rendered):
            body_text = rendered

    return JSONResponse(extract(final_url, body_text, response.status_code), status_code=200)
