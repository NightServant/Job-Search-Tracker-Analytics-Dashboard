"""The four boards that need more than JSON-LD.

Each is a HEURISTIC over a specific board's habits, which is exactly why it
belongs behind a hostname check rather than in `generic`. They run BEFORE the
generic fallbacks and AFTER JSON-LD, so a board that publishes structured data
keeps its 0.95 and these only fill what is left.
"""

from __future__ import annotations

import re
from typing import Any

from ..normalise import clean_text, title_to_role
from ..page import Page


def _path_parts(url: str) -> list[str]:
    from urllib.parse import urlsplit

    return [p for p in urlsplit(url).path.split("/") if p]


def linkedin(page: Page, values: dict[str, Any], confidence: dict[str, float]) -> None:
    og_title = page.meta("og:title") or ""
    og_description = page.meta("og:description") or ""

    if not values.get("role") and og_title:
        values["role"] = title_to_role(re.sub(r"\s*\|\s*LinkedIn.*$", "", og_title, flags=re.I))
        confidence["role"] = 0.75

    # `hiring <Role>` is LinkedIn's own phrasing and the highest-signal thing on
    # the page -- it beats the title-derived role, which is why it overwrites.
    if og_description:
        match = re.search(r"\bhiring\s+(.+?)(?:\s+in\b|[.,]|$)", og_description, re.I)
        role = clean_text(match.group(1)) if match else ""
        if role:
            values["role"] = role
            confidence["role"] = 0.85

    if not values.get("company") and og_description:
        match = re.search(r"\bat\s+([^.,|-]+)", og_description, re.I)
        company = clean_text(match.group(1)) if match else ""
        if company:
            values["company"] = company
            confidence["company"] = 0.65

    if not values.get("company"):
        title = og_title or page.first("title::text") or ""
        match = re.search(r"(?:\b|^)\s*([^|\n]+?)\s+at\s+([^|\n]+)\s*(?:\||$)", title, re.I)
        if match and match.group(2):
            company = clean_text(match.group(2))
            if company:
                values["company"] = company
                confidence["company"] = 0.7
        else:
            before_pipe = clean_text(title.split("|")[0])
            if before_pipe and re.search(
                r"\b(inc|llc|corp|consultancy|co|company|ltd)\b", before_pipe, re.I
            ):
                values["company"] = before_pipe
                confidence["company"] = 0.6

    # THE BODY SCAN IS GONE, deliberately. The Deno parser ended with a
    # last-resort regex for " at COMPANY" anywhere in the document, scored 0.5.
    # At that confidence it is a coin flip presented as data, and it filled the
    # company field with whatever noun followed the first "at" on the page.
    # Leaving the field empty is the honest answer, and the form already says
    # so with a warning.

    values["source"] = "LinkedIn"
    confidence["source"] = 1.0


def greenhouse(page: Page, values: dict[str, Any], confidence: dict[str, float]) -> None:
    parts = _path_parts(page.url)
    if not values.get("company") and parts:
        values["company"] = clean_text(parts[0].replace("-", " ").replace("_", " "))
        confidence["company"] = 0.7
    og_title = page.meta("og:title")
    if not values.get("role") and og_title:
        values["role"] = title_to_role(og_title)
        confidence["role"] = 0.8
    values["source"] = "Greenhouse"
    confidence["source"] = 1.0


def lever(page: Page, values: dict[str, Any], confidence: dict[str, float]) -> None:
    parts = _path_parts(page.url)
    if not values.get("company") and parts:
        values["company"] = clean_text(parts[0].replace("-", " ").replace("_", " "))
        confidence["company"] = 0.75
    og_title = page.meta("og:title")
    if not values.get("role") and og_title:
        values["role"] = title_to_role(og_title)
        confidence["role"] = 0.8
    values["source"] = "Lever"
    confidence["source"] = 1.0


def workday(page: Page, values: dict[str, Any], confidence: dict[str, float]) -> None:
    parts = _path_parts(page.url)
    if not values.get("company") and len(parts) >= 2:
        # Workday paths carry a locale segment (`en-US`) whose NEXT segment is
        # the tenant. Where there is no locale, the second segment is.
        index = next((i for i, p in enumerate(parts) if re.match(r"^en[-_]?[A-Z]{2,}", p, re.I)), -1)
        candidate = parts[index + 1] if index >= 0 and index + 1 < len(parts) else parts[1]
        if candidate:
            values["company"] = clean_text(candidate.replace("-", " ").replace("_", " "))
            confidence["company"] = 0.7
    title = page.first("title::text")
    if not values.get("role") and title:
        values["role"] = title_to_role(title)
        confidence["role"] = 0.65
    values["source"] = "Workday"
    confidence["source"] = 1.0
