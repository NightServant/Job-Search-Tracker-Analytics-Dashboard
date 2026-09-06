"""The wire contract: what extraction produces, and nothing else.

FIELD-COMPATIBLE WITH `JobAutofillResult` in `src/types/index.ts`, and a test
asserts that by reading both files. The two cannot drift silently, which
matters because the client destructures this shape directly and a missing key
reads to a user as "auto-fill did not find it" rather than as a bug.
"""

from __future__ import annotations

from typing import Any, Literal, TypedDict

WorkMode = Literal["remote", "hybrid", "onsite"]

#: The value keys, in the order the form presents them. The parity test reads
#: this tuple rather than a class body, so it stays introspectable.
VALUE_FIELDS: tuple[str, ...] = (
    "company",
    "role",
    "location",
    "work_mode",
    "source",
    "salary_min",
    "salary_max",
    "url",
)


class Envelope(TypedDict):
    """`{ values, confidence, warnings }` -- the exact shape the Deno function
    returned, so `jobService.autofillFromUrl` and every test around it keep
    working through the cutover."""

    values: dict[str, Any]
    confidence: dict[str, float]
    warnings: list[str]


def empty_envelope() -> Envelope:
    return {"values": {}, "confidence": {}, "warnings": []}
