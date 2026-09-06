"""The default extractor: structured data first, metadata second, title last.

THE CONFIDENCE LADDER IS THE POINT. JSON-LD is the posting telling you what it
is, so it scores 0.95; OpenGraph is the posting telling a social network what
to show, so 0.7; a `<title>` is whatever the CMS concatenated, so 0.55. The
numbers are carried over from the Deno parser unchanged, because the UI shows
them and a user has already learned what they mean.
"""

from __future__ import annotations

import html as _html
import re
from typing import Any

from ..normalise import (
    clean_text,
    infer_work_mode,
    parse_salary_value,
    salary_range_from_text,
    source_from_host,
    title_to_role,
)
from ..page import Page

#: The six the form can store -- the same vocabulary as SUPPORTED_CURRENCIES
#: and the `jobs_salary_currency_check` constraint. A seventh detected here
#: would be a value the application form has to throw away.
_SUPPORTED_CURRENCIES = frozenset({"PHP", "USD", "EUR", "GBP", "SGD", "AUD"})


def _location_from_json_ld(posting: dict[str, Any]) -> str:
    raw = posting.get("jobLocation")
    locations = raw if isinstance(raw, list) else [raw]
    for location in locations:
        if not isinstance(location, dict):
            continue
        address = location.get("address")
        if not isinstance(address, dict):
            continue
        parts = [
            clean_text(str(address.get(key) or ""))
            for key in ("addressLocality", "addressRegion", "addressCountry")
        ]
        parts = [p for p in parts if p]
        if parts:
            return ", ".join(parts)
    return clean_text(str(posting.get("jobLocationType") or ""))



#: schema.org `employmentType` values, mapped to something a person filtering a
#: pipeline would actually type. The vocabulary is fixed by the spec, so this is
#: a translation table rather than a guess.
_EMPLOYMENT_TYPES = {
    "FULL_TIME": "full-time",
    "PART_TIME": "part-time",
    "CONTRACTOR": "contract",
    "TEMPORARY": "temporary",
    "INTERN": "internship",
    "VOLUNTEER": "volunteer",
    "PER_DIEM": "per-diem",
}

#: Technologies worth recognising in prose when the posting published no
#: `skills` array.
#:
#: A CURATED LIST, NOT A GUESS AT WHAT LOOKS TECHNICAL. Anything inferred from
#: shape -- capitalised words, things ending in `.js` -- pulls in company names
#: and sentence starts, and a tech stack full of noise is worse than an empty
#: one because the reader has to audit it. Each entry is matched on a word
#: boundary, case-insensitively, and offered at low confidence.
_TECH_VOCABULARY: tuple[str, ...] = (
    "JavaScript", "TypeScript", "Python", "Java", "Kotlin", "Swift", "Go", "Rust",
    "Ruby", "PHP", "C#", "C++", "Scala", "Elixir", "Dart",
    "React", "React Native", "Next.js", "Vue", "Nuxt", "Angular", "Svelte",
    "Node.js", "Express", "Django", "Flask", "FastAPI", "Rails", "Laravel",
    "Spring Boot", "NestJS", ".NET",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Firebase",
    "SQLite", "DynamoDB", "Elasticsearch", "GraphQL", "REST",
    "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform",
    "Vercel", "Netlify", "CI/CD", "Jenkins", "GitHub Actions",
    "Tailwind", "CSS", "HTML", "Figma", "Git", "Linux",
    "TensorFlow", "PyTorch", "pandas", "NumPy",
)


def _description_from_dom(page: Page) -> str | None:
    """The posting body, read from the page rather than from a meta tag.

    Every candidate is measured and the LONGEST wins. A job page's posting body
    is reliably its densest block of prose -- the competition is navigation,
    a footer and a benefits blurb, all of which are shorter. Picking the first
    match instead would take `main` on a site whose `main` wraps the whole
    page including its chrome.
    """
    best: str | None = None
    for selector in _DESCRIPTION_SELECTORS:
        text = page.text_block(selector)
        if not text:
            continue
        cleaned = re.sub(r"\n\s*\n\s*\n+", "\n\n", text).strip()
        if len(cleaned) < _MIN_DESCRIPTION:
            continue
        if best is None or len(cleaned) > len(best):
            best = cleaned
    return best


def _as_list(value: object) -> list[str]:
    """schema.org fields are routinely a string, a list, or a comma-joined
    string pretending to be one field."""
    if isinstance(value, str):
        return [part.strip() for part in re.split(r"[,;/]|\band\b", value) if part.strip()]
    if isinstance(value, list):
        out: list[str] = []
        for entry in value:
            out.extend(_as_list(entry))
        return out
    if isinstance(value, dict):
        return _as_list(value.get("name") or "")
    return []


def _dedupe(items: list[str], limit: int) -> list[str]:
    """Order-preserving, case-insensitive dedupe. The first spelling wins, so
    a posting that writes `React` before `react` keeps the capitalised one."""
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        cleaned = clean_text(item)
        if not cleaned or len(cleaned) > 40:
            continue
        key = cleaned.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(cleaned)
        if len(out) >= limit:
            break
    return out


def _tech_from_prose(text: str) -> list[str]:
    """Known technologies named in the posting body.

    Word-boundary matched so `Go` does not fire on `going` and `React` does not
    fire on `reaction`. Names carrying regex metacharacters -- `C++`, `.NET`,
    `Next.js` -- are escaped, which is why this builds a pattern per term
    rather than one big alternation over raw strings.
    """
    found: list[str] = []
    for term in _TECH_VOCABULARY:
        pattern = rf"(?<![\w+#.]){re.escape(term)}(?![\w+#])"
        if re.search(pattern, text, re.I):
            found.append(term)
    return found


def _currency_from_json_ld(posting: dict[str, Any]) -> str | None:
    """`baseSalary.currency`, when the employer stated one."""
    value = posting.get("baseSalary")
    if not isinstance(value, dict):
        return None
    code = clean_text(str(value.get("currency") or "")).upper()
    return code if code in _SUPPORTED_CURRENCIES else None


def _salary_from_json_ld(posting: dict[str, Any]) -> tuple[float | None, float | None]:
    base = posting.get("baseSalary")
    if not isinstance(base, dict):
        return None, None
    value = base.get("value")
    if isinstance(value, (int, float, str)):
        single = parse_salary_value(value)
        return (single, single) if single is not None else (None, None)
    if not isinstance(value, dict):
        return None, None
    return parse_salary_value(value.get("minValue")), parse_salary_value(value.get("maxValue"))


#: How much posting text is worth carrying. Long enough for the longest real
#: posting, short enough that a page which hands back its whole DOM cannot put
#: a megabyte into a form field.
_MAX_DESCRIPTION = 20_000

#: Below this, a block of text is not a job posting.
#:
#: THE NUMBER EXISTS BECAUSE OF A REAL FAILURE. Auto-fill filled the
#: description with "Experience an extraordinary global career at Cloudstaff,
#: the #1 workplace everywhere. Join our talented team..." -- the site's
#: `og:description`, which is marketing copy identical on every page of the
#: site. That is worse than an empty field: a wrong ROLE is visibly wrong and
#: gets corrected, whereas a wrong DESCRIPTION silently becomes what the ATS
#: keyword match scores against and what AI tailoring is told the job is.
_MIN_DESCRIPTION = 200

#: Where a posting body actually lives, most specific first.
#:
#: No case-insensitive attribute flag (`[class*="x" i]`): lxml's CSS engine
#: does not support it, so the common casings are listed instead.
_DESCRIPTION_SELECTORS: tuple[str, ...] = (
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job_description"]',
    '[id*="job-description"]',
    '[id*="jobDescription"]',
    '[data-testid*="description"]',
    '[data-automation*="jobDescription"]',
    '[class*="posting-description"]',
    '[class*="vacancy-description"]',
    "article",
    '[role="main"]',
    "main",
)


def _html_to_text(raw: str) -> str:
    """JSON-LD `description` is HTML far more often than not.

    The spec says string; every board fills it with `<p>` and `<ul>`. Stripping
    tags rather than rendering them, because the destination is a textarea and
    the ATS keyword match reads words, not markup. Block-level tags become
    newlines first so the list items do not run together into one sentence.
    """
    text = re.sub(r"(?i)<\s*(?:br|/p|/li|/div|/h[1-6])\s*/?>", "\n", raw)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = _html.unescape(text)
    # Collapse runs of spaces WITHOUT eating the newlines that carry structure.
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip()


def extract(page: Page, host: str, values: dict[str, Any], confidence: dict[str, float]) -> None:
    posting = page.job_posting()
    if posting:
        title = clean_text(str(posting.get("title") or ""))
        org = posting.get("hiringOrganization")
        company = clean_text(str(org.get("name") or "")) if isinstance(org, dict) else ""
        location = _location_from_json_ld(posting)
        smin, smax = _salary_from_json_ld(posting)

        if title:
            values["role"] = title
            confidence["role"] = 0.95
        if company:
            values["company"] = company
            confidence["company"] = 0.95
        if location:
            values["location"] = location
            confidence["location"] = 0.9
        if smin is not None:
            values["salary_min"] = smin
            confidence["salary_min"] = 0.9
        if smax is not None:
            values["salary_max"] = smax
            confidence["salary_max"] = 0.9
        currency = _currency_from_json_ld(posting)
        if currency:
            values["salary_currency"] = currency
            confidence["salary_currency"] = 0.9

        description = _html_to_text(str(posting.get("description") or ""))
        if description:
            values["description"] = description[:_MAX_DESCRIPTION]
            # The highest confidence anything here gets: this is the posting
            # body as the employer published it, not a guess about which part
            # of the page is the posting.
            confidence["description"] = 0.95

        skills = _dedupe(
            _as_list(posting.get("skills")) + _as_list(posting.get("occupationalCategory")),
            limit=30,
        )
        if skills:
            values["tech_stack"] = skills
            confidence["tech_stack"] = 0.9

        facets: list[str] = []
        for raw in _as_list(posting.get("employmentType")):
            facets.append(_EMPLOYMENT_TYPES.get(raw.upper().replace("-", "_").replace(" ", "_"), raw))
        facets.extend(_as_list(posting.get("industry")))
        tags = _dedupe(facets, limit=10)
        if tags:
            values["tags"] = tags
            confidence["tags"] = 0.85
        mode = infer_work_mode(str(posting.get("jobLocationType") or ""))
        if mode:
            values["work_mode"] = mode
            confidence["work_mode"] = 0.9


def fallbacks(page: Page, values: dict[str, Any], confidence: dict[str, float]) -> None:
    """Everything the per-site pass did not settle. Runs last, and only fills
    keys that are still missing -- a site module's 0.7 must never be overwritten
    by a generic 0.55."""
    og_title = page.meta("og:title")
    tw_title = page.meta("twitter:title")
    page_title = page.first("title::text")

    if not values.get("role"):
        candidate = title_to_role(og_title or tw_title or page_title or "")
        if candidate:
            values["role"] = candidate
            confidence["role"] = 0.7 if (og_title or tw_title) else 0.55

    if not values.get("company"):
        site_name = page.meta("og:site_name")
        if site_name:
            values["company"] = site_name
            confidence["company"] = 0.6

    if not values.get("location"):
        locality = page.meta("job:location") or page.meta("geo.placename")
        if locality:
            values["location"] = locality
            confidence["location"] = 0.5

    if not values.get("work_mode"):
        haystack = "\n".join(
            part
            for part in (
                page.meta("og:description"),
                page.meta("description"),
                og_title,
                tw_title,
                page_title,
                page.html,
            )
            if part
        )
        mode = infer_work_mode(haystack)
        if mode:
            values["work_mode"] = mode
            confidence.setdefault("work_mode", 0.5)

    if not values.get("description"):
        # The page body, before any meta tag. A posting that published no
        # JSON-LD still HAS its posting on the page.
        body = _description_from_dom(page)
        if body:
            values["description"] = body[:_MAX_DESCRIPTION]
            confidence["description"] = 0.6

    if not values.get("description"):
        # og:description LAST, and only when it is long enough to plausibly be
        # a posting rather than a tagline. This is the check that rejects
        # "Experience an extraordinary global career at ... Apply now!", which
        # is what this fallback used to hand back on a page whose real posting
        # it never looked at.
        summary = clean_text(page.meta("og:description") or page.meta("description") or "")
        if len(summary) >= _MIN_DESCRIPTION:
            values["description"] = summary[:_MAX_DESCRIPTION]
            confidence["description"] = 0.4

    if not values.get("tech_stack"):
        # Scanned over the DESCRIPTION rather than the whole document: a page's
        # navigation, footer and cookie banner mention technologies too, and
        # they are not what the job asked for.
        body = str(values.get("description") or "")
        found = _dedupe(_tech_from_prose(body), limit=30)
        if found:
            values["tech_stack"] = found
            confidence["tech_stack"] = 0.4

    if values.get("salary_min") is None and values.get("salary_max") is None:
        smin, smax, currency = salary_range_from_text(page.html)
        if smin is not None:
            values["salary_min"] = smin
            confidence["salary_min"] = 0.45
        if smax is not None:
            values["salary_max"] = smax
            confidence["salary_max"] = 0.45
        # Only alongside a figure it belongs to. A currency with no amount is
        # not a fact about the salary, it is a fact about the page's footer.
        if currency and smin is not None:
            values["salary_currency"] = currency
            confidence["salary_currency"] = 0.45
