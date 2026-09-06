"""Hostname to site module.

The same host patterns `extractAutofill` branched on, in one table instead of
an if/else chain -- so adding a board is a row, and so a test can assert the
whole set at once.
"""

from __future__ import annotations

from typing import Callable

from .sites import boards

SiteExtractor = Callable[..., None]

_ROUTES: tuple[tuple[str, SiteExtractor], ...] = (
    ("linkedin.com", boards.linkedin),
    ("greenhouse.io", boards.greenhouse),
    ("lever.co", boards.lever),
    ("myworkdayjobs.com", boards.workday),
    ("workday.com", boards.workday),
)


def for_host(hostname: str) -> SiteExtractor | None:
    host = (hostname or "").lower()
    for needle, extractor in _ROUTES:
        if needle in host:
            return extractor
    return None


def known_hosts() -> tuple[str, ...]:
    return tuple(needle for needle, _ in _ROUTES)
