"""The default extractor: structured data first, metadata second, title last.

THE CONFIDENCE LADDER IS THE POINT. JSON-LD is the posting telling you what it
is, so it scores 0.95; OpenGraph is the posting telling a social network what
to show, so 0.7; a `<title>` is whatever the CMS concatenated, so 0.55. The
numbers are carried over from the Deno parser unchanged, because the UI shows
them and a user has already learned what they mean.
"""

from __future__ import annotations

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

    if values.get("salary_min") is None and values.get("salary_max") is None:
        smin, smax = salary_range_from_text(page.html)
        if smin is not None:
            values["salary_min"] = smin
            confidence["salary_min"] = 0.45
        if smax is not None:
            values["salary_max"] = smax
            confidence["salary_max"] = 0.45
