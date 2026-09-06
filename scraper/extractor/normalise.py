"""Text normalisers, ported from `supabase/functions/job-url-autofill/parser.ts`.

PORTED RATHER THAN REWRITTEN. Each of these encodes a decision someone made
against a real posting -- stripping "| LinkedIn" off a title, dropping a
"hiring ..." tail, decoding a percent-encoded company out of a URL path. The
twenty cases in `src/lib/__tests__/jobAutofillParser.test.ts` are the record of
which ones matter, and they are ported alongside so a regression is visible
rather than inferred.

The PARSING moves to a real DOM (see sites/); only this string handling stays
regex, because that is what it legitimately is.
"""

from __future__ import annotations

import html as _html
import re
from urllib.parse import unquote_plus

_WS = re.compile(r"\s+")


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    return _html.unescape(_WS.sub(" ", value).strip()).strip()


def decode_possibly_encoded(value: str) -> str:
    """A company read out of a URL path is often percent-encoded, and `+` there
    is a space. `unquote_plus` does both; a malformed escape is left alone
    rather than raising, matching the TS `try/catch`."""
    if not value:
        return ""
    try:
        return unquote_plus(value)
    except Exception:  # pragma: no cover - unquote_plus is total in practice
        return value


_BY_SUFFIX = re.compile(r"\s+by\s+[^,|-]+$", re.I)
_TRAILING_SEGMENT = re.compile(r"\s*[|\-:].*$", re.I)


def normalize_company(raw: str) -> str:
    if not raw:
        return ""
    value = clean_text(decode_possibly_encoded(raw))
    value = _BY_SUFFIX.sub("", value)
    value = _TRAILING_SEGMENT.sub("", value)
    return value.strip()


_BOARD_TAIL = re.compile(
    r"\s*[|\-:]\s*.*(LinkedIn|Careers|Workday|Greenhouse|Indeed|Glassdoor|–|—).*$",
    re.I,
)
_HIRING_TAIL = re.compile(r"\b(hiring|recruiting)\b.*$", re.I)


def normalize_role(raw: str, company: str | None = None) -> str:
    if not raw:
        return ""
    value = clean_text(decode_possibly_encoded(raw))
    value = _BOARD_TAIL.sub("", value)
    if company:
        value = re.sub(r"^" + re.escape(company) + r"\s+", "", value, flags=re.I)
    value = _HIRING_TAIL.sub("", value)
    if company:
        c = _WS.sub(" ", company).strip()
        if c and value.lower().startswith(c.lower()):
            value = value[len(c) :].strip()
    return value.strip()


_REMOTE = re.compile(r"(remote|work from home|telecommute|telework)", re.I)
_HYBRID = re.compile(r"hybrid", re.I)
_ONSITE = re.compile(r"(on[- ]site|onsite|in[- ]person)", re.I)


def infer_work_mode(text: str) -> str | None:
    if not text:
        return None
    if _REMOTE.search(text):
        return "remote"
    if _HYBRID.search(text):
        return "hybrid"
    if _ONSITE.search(text):
        return "onsite"
    return None


def title_to_role(title: str) -> str:
    """The first segment of a page title. `Role - Company | Board` is the shape
    almost every board uses, and everything after the first separator is the
    board talking rather than the posting."""
    if not title:
        return ""
    return clean_text(re.split(r"\s[-|]\s", title)[0] or title)


def source_from_host(hostname: str) -> str:
    return re.sub(r"^www\.", "", hostname, flags=re.I)


def parse_salary_value(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        digits = re.sub(r"[^\d.]", "", value)
        if not digits:
            return None
        try:
            return float(digits)
        except ValueError:
            return None
    return None


_RANGE = re.compile(
    r"\$\s?([\d,]{2,})(?:\.\d+)?\s*(?:-|to|–|—)\s*\$\s?([\d,]{2,})(?:\.\d+)?",
    re.I,
)


def salary_range_from_text(text: str) -> tuple[float | None, float | None]:
    match = _RANGE.search(_WS.sub(" ", text))
    if not match:
        return None, None
    try:
        return float(match.group(1).replace(",", "")), float(match.group(2).replace(",", ""))
    except ValueError:
        return None, None
