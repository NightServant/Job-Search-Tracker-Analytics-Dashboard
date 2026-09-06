"""`extract()` -- the whole pipeline, over HTML that has already been fetched.

SEPARATE FROM FETCHING ON PURPOSE. Everything here is a pure function of
`(url, html)`, so the fixture tests are the same code path the service runs and
there is no network in the test suite. The FastAPI app in `app.py` owns the
fetch, the timeouts and the SSRF re-check; this owns what the page means.

ORDER: JSON-LD, then the site heuristic, then the generic fallbacks. Each stage
only fills what the one before it left empty, so a board that publishes proper
structured data keeps its 0.95 and never has it overwritten by a guess from a
page title.
"""

from __future__ import annotations

from urllib.parse import urlsplit

from . import registry
from .challenge import autofill_from_url_alone, looks_like_bot_challenge
from .normalise import normalize_company, normalize_role, source_from_host
from .page import Page
from .schema import Envelope
from .sites import generic


def extract(url: str, html: str, status: int = 200) -> Envelope:
    if looks_like_bot_challenge(status, html):
        return autofill_from_url_alone(url)

    host = urlsplit(url).hostname or ""
    values: dict[str, object] = {"url": url, "source": source_from_host(host)}
    confidence: dict[str, float] = {"url": 1.0, "source": 0.9}

    page = Page(html, url=url)

    generic.extract(page, host, values, confidence)

    site = registry.for_host(host)
    if site is not None:
        site(page, values, confidence)

    generic.fallbacks(page, values, confidence)

    # NORMALISE LAST. The company has to be settled before the role can have it
    # stripped off the front -- "Acme Senior Engineer" only becomes "Senior
    # Engineer" once we know the company is Acme.
    if values.get("company"):
        values["company"] = normalize_company(str(values["company"]))
    if values.get("role"):
        values["role"] = normalize_role(str(values["role"]), str(values.get("company") or ""))

    # A normaliser that empties a field must not leave the key behind: the
    # client treats a present key as a value to write into the form.
    for key in ("company", "role"):
        if key in values and not values[key]:
            del values[key]
            confidence.pop(key, None)

    # NO WARNING FOR A FIELD THE PAGE DID NOT HAVE (Gabe, 2026-09-06).
    #
    # This used to announce every absent field: no company, no role, no salary.
    # Most job postings do not publish a salary at all -- almost none in the
    # Philippines do -- so the commonest outcome of a PERFECT extraction was a
    # row of warnings, which trains a reader to stop reading them. And an empty
    # field is already visible: it is the empty field.
    #
    # The form says "Filled the empty fields only. Review every field before
    # saving," which covers it. What is left here is the case where something
    # actually went wrong and the values are a guess rather than a reading --
    # see `autofill_from_url_alone`, which sets its own warning because a
    # caller cannot otherwise tell that nothing was read at all.
    return {"values": values, "confidence": confidence, "warnings": []}
