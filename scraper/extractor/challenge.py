"""Bot challenges, and what to say when one is served.

PORTED VERBATIM IN BEHAVIOUR from the Deno function, because the behaviour is
the considered part. JobStreet, JobsDB and SEEK answer a server-side fetch with
Cloudflare's interstitial -- measured 2026-09-05: 403 on every HTML path, from
a browser User-Agent with full Accept headers, with only `robots.txt` answering
200 because it is served outside the challenge.

Two rules come out of that and both survive the port:

A BOT CHALLENGE IS NOT A BROKEN LINK. Reporting one as "could not fetch this
URL" sends the reader to check a URL that is perfectly correct. It returns 200
with what the URL alone proves, names the site, and points at pasting -- which
works, because a browser that is already past the challenge is the only thing
on the user's side that can read the page.

A CHALLENGE CAN ARRIVE AS A 200. A page whose only job is to run JS and
redirect parses "successfully" and yields "Just a moment..." as the role, which
is worse than an error because nothing looks broken. So the body is checked as
well as the status.
"""

from __future__ import annotations

import html as _html
import re

import re
from urllib.parse import urlsplit

from .schema import Envelope

# RE-MEASURED 2026-09-06 (M7 Task 8), from a residential PH connection, with
# the browser headers below. The list is SHORTER than it was, and that is the
# result the task existed to produce:
#
#   JobStreet  /  and /jobs   -> 403, "Just a moment...", Cloudflare markers
#   JobsDB     /  and /jobs   -> 200, 950KB, <title>Jobs in Hong Kong ...
#   SEEK       /  and /jobs   -> 403, 50KB, SEEK's OWN page, no CF marker
#   Greenhouse (control)      -> 200        (proves the client, not the sites)
#
# JOBSDB CAME OFF THE LIST. It answered a plain server-side fetch with real
# HTML. Leaving it here would refuse a site we can read, which is the failure
# the parser's own test already guards in the other direction: "a site that
# does NOT block must not be labelled as one".
#
# SEEK STAYS, with its description corrected: it is a 403, not a Cloudflare
# interstitial. The status is a refusal either way, so the behaviour is the
# same, but calling it Cloudflare would send the next person hunting for a
# challenge that is not there.
_CHALLENGED_HOSTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"(^|\.)jobstreet\.com(\.[a-z]{2})?$", re.I), "JobStreet"),
    (re.compile(r"(^|\.)seek\.com(\.[a-z]{2})?$", re.I), "SEEK"),
)

_CHALLENGE_MARKERS = (
    re.compile(r"Just a moment\.\.\.", re.I),
    re.compile(r"cf-browser-verification|cf_chl_opt|__cf_chl", re.I),
    re.compile(r"Checking your browser before accessing", re.I),
)


def challenged_site_name(hostname: str) -> str | None:
    host = re.sub(r"^www\.", "", hostname.strip().lower())
    for pattern, name in _CHALLENGED_HOSTS:
        if pattern.search(host):
            return name
    return None


def looks_like_bot_challenge(status: int, body: str) -> bool:
    if status in (403, 503):
        return True
    head = body[:4000]
    return any(marker.search(head) for marker in _CHALLENGE_MARKERS)


def autofill_from_url_alone(url: str) -> Envelope:
    """What a URL alone establishes, for a page that could not be read.

    Worth returning rather than nothing: it saves a field, and -- more usefully
    -- it confirms the app understood the link, which a bare "could not fetch"
    does not. Confidence is deliberately below every parsed value's, and
    nothing here is guessed from the path: only the site's own name.
    """
    host = urlsplit(url).hostname or ""
    name = challenged_site_name(host)
    values: dict[str, object] = {"url": url}
    confidence: dict[str, float] = {}
    if name:
        values["source"] = name
        confidence["source"] = 1.0
    warning = (
        f"{name} blocks automated reads, so the posting could not be fetched. "
        "Paste the description in by hand."
        if name
        else "That page could not be read automatically. Paste the description in by hand."
    )
    return {"values": values, "confidence": confidence, "warnings": [warning]}


#: Below this much visible text, a page has no posting on it to read.
#:
#: MEASURED, not guessed. Cloudstaff's careers site returns 110KB of HTML
#: containing FIFTEEN visible characters -- "Cloudstaff Jobs" -- because every
#: posting is rendered client-side. The extractor reported three separate
#: vague warnings about that page ("could not confidently detect role title",
#: "salary was not found in page metadata") when the single true statement was
#: that the page it was handed contained nothing at all.
_MIN_VISIBLE_CHARS = 200

_TAG = re.compile(r"(?s)<(script|style|noscript|template)[^>]*>.*?</\1>", re.I)
_ANY_TAG = re.compile(r"(?s)<[^>]+>")
_SPACES = re.compile(r"\s+")


def visible_text_length(html: str) -> int:
    """Roughly how much a reader would see. Scripts and styles are bytes, not
    words, and an app shell is almost entirely both."""
    stripped = _TAG.sub(" ", html or "")
    text = _html.unescape(_ANY_TAG.sub(" ", stripped))
    return len(_SPACES.sub(" ", text).strip())


def looks_like_javascript_shell(html: str) -> bool:
    """Whether this document is an application shell rather than a page.

    Deliberately narrow: a SHORT page is not the same as an empty one, so this
    asks whether there is essentially no text at all. A real posting that is
    merely terse still clears 200 characters comfortably.
    """
    return visible_text_length(html) < _MIN_VISIBLE_CHARS
