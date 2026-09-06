"""The field sets on both sides of the wire must be identical.

WHY THIS EXISTS, and it is not hypothetical: `work_mode` was extracted by the
Deno function from the day it shipped -- from JSON-LD's `jobLocationType` and
from the page text, with a confidence score attached -- and `JobAutofillResult`
never declared it. So the client could not read it and dropped it on every
auto-fill. Nothing failed; the field just never filled in. This test is what
makes that class of silence impossible.

It reads the TYPESCRIPT SOURCE rather than a generated artefact, because the
artefact is what would drift. A brittle regex over a hand-written union is the
cost; the union is eight lines that change once a milestone.
"""

from __future__ import annotations

import re
from pathlib import Path

from extractor.schema import VALUE_FIELDS

_TYPES = Path(__file__).resolve().parents[2] / "src" / "types" / "index.ts"


def _ts_union(name: str) -> set[str]:
    source = _TYPES.read_text(encoding="utf-8")
    match = re.search(rf"export type {name} =(.*?);", source, re.S)
    assert match, f"{name} not found in {_TYPES}"
    return set(re.findall(r"'([a-z_]+)'", match.group(1)))


def test_confidence_union_matches_the_extractor():
    ts = _ts_union("JobAutofillField")
    py = set(VALUE_FIELDS)
    assert ts == py, (
        "JobAutofillField and extractor.schema.VALUE_FIELDS disagree.\n"
        f"  only in TypeScript: {sorted(ts - py)}\n"
        f"  only in Python:     {sorted(py - ts)}"
    )


def test_values_pick_matches_the_extractor():
    """The `Pick<...>` on `JobAutofillResult.values` is a SECOND list of the
    same fields, and it is the one the form destructures. It drifted from the
    confidence union once already."""
    source = _TYPES.read_text(encoding="utf-8")
    match = re.search(r"export interface JobAutofillResult \{(.*?)\n\}", source, re.S)
    assert match, "JobAutofillResult not found"
    picked = set(re.findall(r"'([a-z_]+)'", match.group(1)))
    assert picked == set(VALUE_FIELDS), (
        "JobAutofillResult.values and extractor.schema.VALUE_FIELDS disagree.\n"
        f"  only in TypeScript: {sorted(picked - set(VALUE_FIELDS))}\n"
        f"  only in Python:     {sorted(set(VALUE_FIELDS) - picked)}"
    )


def test_every_extracted_key_is_declared():
    """Belt and braces: run a real extraction and confirm nothing it produces
    is outside the declared set. A parser that invents a key is the other way
    this drifts."""
    from extractor.core import extract

    html = """<html><head><title>Senior Engineer - Acme</title>
    <script type="application/ld+json">{"@type":"JobPosting","title":"Senior Engineer",
    "hiringOrganization":{"name":"Acme"},"jobLocation":{"address":{"addressLocality":"Manila"}},
    "baseSalary":{"value":{"minValue":1,"maxValue":2}},"jobLocationType":"TELECOMMUTE"}</script>
    </head></html>"""
    produced = set(extract("https://careers.example.com/j/1", html)["values"])
    assert produced <= set(VALUE_FIELDS), f"undeclared keys: {sorted(produced - set(VALUE_FIELDS))}"
