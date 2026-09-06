"""The one place Scrapling is touched.

THE BOUNDARY THAT MAKES A 0.x DEPENDENCY SURVIVABLE. Scrapling is 0.4.15 and
its API can move -- it already differs from what its README implies: there is
no `css_first`, `.css()` returns a `Selectors` collection, and reading a string
means `.css(...)[0].get()`. Every one of those details lives here. The site
modules see `Page`, which is ours.

`adaptive` is passed through per query rather than set once on the document:
Scrapling can relocate an element after a page changes, and that is worth
having for a per-site selector written against one board's markup. It is NOT
worth having for `title` or `og:*`, which are standards and cannot drift.
"""

from __future__ import annotations

import json
from typing import Any

from scrapling import Selector


class Page:
    """A parsed HTML document, addressed by CSS."""

    def __init__(self, html: str, url: str = "") -> None:
        self._sel = Selector(html, url=url)
        self.url = url
        self.html = html

    def first(self, css: str, *, adaptive: bool = False) -> str | None:
        """The first match's text, or None. `adaptive=True` lets Scrapling
        relocate the element if the markup moved -- see the module note."""
        try:
            found = self._sel.css(css, adaptive=adaptive)
        except Exception:
            return None
        if not len(found):
            return None
        node = found[0]
        value = node.get() if hasattr(node, "get") else node
        return None if value is None else str(value)

    def text_block(self, css: str) -> str | None:
        """All visible text under the first match, newlines between blocks.

        `get_all_text()` rather than `.get()`: the latter hands back the node's
        outer HTML, which is markup a textarea should never receive. This is
        the one call that reads a container's PROSE rather than an attribute,
        and it exists because a job posting's body is not in any meta tag.
        """
        try:
            found = self._sel.css(css)
        except Exception:
            return None
        if not len(found):
            return None
        node = found[0]
        if not hasattr(node, "get_all_text"):
            return None
        try:
            text = node.get_all_text()
        except Exception:
            return None
        return str(text) if text else None

    def all(self, css: str) -> list[str]:
        try:
            found = self._sel.css(css)
        except Exception:
            return []
        out: list[str] = []
        for node in found:
            value = node.get() if hasattr(node, "get") else node
            if value is not None:
                out.append(str(value))
        return out

    def meta(self, key: str) -> str | None:
        """A meta tag by `property` OR `name`.

        Two selectors because the two attributes are used interchangeably in
        the wild -- OpenGraph says `property`, Twitter and the HTML spec say
        `name`, and plenty of pages mix them. The Deno version needed two
        regexes AND a reversed one for attribute order; a DOM makes attribute
        order a non-question, which is most of the argument for this milestone.
        """
        for attr in ("property", "name"):
            value = self.first(f'meta[{attr}="{key}"]::attr(content)')
            if value:
                return value
        return None

    def json_ld(self) -> list[dict[str, Any]]:
        """Every JSON-LD node on the page, `@graph` flattened in.

        Malformed blocks are skipped rather than raising: one bad script must
        not cost the page its good ones, and pages with three JSON-LD blocks of
        which one is broken are common.
        """
        nodes: list[dict[str, Any]] = []
        for raw in self.all('script[type="application/ld+json"]::text'):
            try:
                parsed = json.loads(raw)
            except (ValueError, TypeError):
                continue
            candidates = parsed if isinstance(parsed, list) else [parsed]
            for candidate in candidates:
                if not isinstance(candidate, dict):
                    continue
                nodes.append(candidate)
                graph = candidate.get("@graph")
                if isinstance(graph, list):
                    nodes.extend(n for n in graph if isinstance(n, dict))
        return nodes

    def job_posting(self) -> dict[str, Any] | None:
        """The first JSON-LD node that says it is a JobPosting.

        `@type` is a string on most pages and a list on some, so it is
        normalised before comparison -- a list-typed node was silently skipped
        by the string equality the Deno version started with.
        """
        for node in self.json_ld():
            raw_type = node.get("@type")
            types = raw_type if isinstance(raw_type, list) else [raw_type]
            if any(str(t).lower() == "jobposting" for t in types if t is not None):
                return node
        return None
