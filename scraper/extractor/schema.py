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
    #: The ISO code the salary was quoted in. Without it a peso range is stored
    #: under whatever default the user happened to set -- right by accident,
    #: and wrong the moment they read a posting from anywhere else.
    "salary_currency",
    #: The posting itself, in full. It is what the ATS keyword match reads and
    #: what AI tailoring is given, so a blank description makes both of those
    #: features guess -- and it is the field a human is least willing to
    #: retype, which is the whole argument for auto-fill.
    "description",
    #: Technologies named by the posting. Feeds the ATS keyword match and AI
    #: tailoring directly, which is why it is worth extracting rather than
    #: leaving to the reader to retype out of the description.
    "tech_stack",
    #: Employment type, industry, category -- the facets worth filtering a
    #: pipeline by. Kept apart from tech_stack because they are not skills.
    "tags",
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
