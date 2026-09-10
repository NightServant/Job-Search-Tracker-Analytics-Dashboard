"""A LinkedIn profile from Apify's `crawlerbros/linkedin-profile-scraper`.

WHY A SECOND SOURCE. `profile.py` reads the JSON-LD `Person` graph out of a
Firecrawl fetch, and on the first real test that route did not get a page at
all. LinkedIn serves most guest profile requests an anti-bot challenge, and
Firecrawl is a fetcher rather than a challenge solver -- so the good parser had
nothing to parse.

This actor solves the challenge server-side and returns STRUCTURED JSON, so
there is no HTML to parse here at all: the work is mapping their field names
onto `UserProfile`. It also reaches sections the JSON-LD never carried --
certifications, projects, volunteer work, personal websites.

WHAT IT COSTS, because that is not a detail. The actor is pay-per-event:
$0.50 per gigabyte of memory at start (minimum one event) plus $0.01 per
result. One profile at 1GB is about $0.51. `app.py` pins the memory for
exactly this reason.

EVERY FIELD IS OPTIONAL AND THE KEY NAMES ARE READ DEFENSIVELY. The actor
omits a field entirely rather than returning null, so `.get()` everywhere is
the contract rather than caution -- and its README names the nested concepts
("issuer, issue date, credential ID") without pinning the exact keys, so the
few that matter are looked up under every plausible spelling. A wrong guess
here loses one field quietly; a crash loses the whole import.

Everything is PURE: a dataset row in, a `UserProfile` out. The run lives in
`app.py`, so this is testable against a saved row with no network and no spend.
"""

from __future__ import annotations

from typing import Any

from .profile import EMPTY_PROFILE, _clean, _listed


def _block(value: Any) -> str | None:
    """A trimmed multi-line string, or None.

    `_clean` COLLAPSES NEWLINES, which is right for a name and wrong for the
    bullet text under a role -- it turned four bullets into one run-on
    sentence, destroying the only structure the field has. Caught by
    `test_current_roles_come_before_past_ones` before it shipped.

    Each line is trimmed and runs of blank lines collapse to one, so a scraped
    block does not arrive with ragged indentation; the line breaks themselves
    survive, which is what `whitespace-pre-wrap` on the app side renders.
    """
    if not isinstance(value, str):
        return None
    lines = [" ".join(line.split()) for line in value.splitlines()]
    out: list[str] = []
    for line in lines:
        if not line and (not out or not out[-1]):
            continue
        out.append(line)
    text = "\n".join(out).strip()
    return text or None


def _pick_block(node: Any, *names: str) -> str | None:
    """`_pick`, for the fields whose line breaks are the point."""
    if not isinstance(node, dict):
        return None
    for name in names:
        value = _block(node.get(name))
        if value:
            return value
    return None


def _pick(node: Any, *names: str) -> str | None:
    """The first of `names` that holds a non-empty string."""
    if not isinstance(node, dict):
        return None
    for name in names:
        value = _clean(node.get(name))
        if value:
            return value
    return None


def _period(node: Any, *, start: str = "startDate", end: str = "endDate") -> str | None:
    """`start – end` as free text, matching `ProfileExperience.period`.

    FREE TEXT, NOT A DATE PAIR. The actor returns whatever LinkedIn displayed,
    which is a year alone as often as a month and a year, and a current role
    has no end at all. Nothing downstream does arithmetic on this -- it prints
    it. A single `dateRange` string, which some sections use instead, is taken
    as-is.
    """
    if not isinstance(node, dict):
        return None
    ready = _pick(node, "dateRange", "duration")
    if ready:
        return ready
    first = _clean(node.get(start))
    last = _clean(node.get(end))
    if first and last:
        return f"{first} – {last}"
    if first:
        return f"{first} – Present"
    return last


def _experiences(row: dict[str, Any]) -> list[dict[str, Any]]:
    """Current positions first, then past ones.

    ORDER IS THE POINT of doing it in two passes rather than concatenating
    whatever came back: a CV reads most-recent-first, and the actor returns
    these as two separate lists precisely because it knows which is which.
    """
    out: list[dict[str, Any]] = []
    for key in ("currentPositions", "pastPositions"):
        for position in _listed(row.get(key)):
            if not isinstance(position, dict):
                continue
            title = _pick(position, "title", "role", "position")
            company = _pick(position, "company", "companyName", "organisation")
            if not title and not company:
                continue
            out.append(
                {
                    "title": title or "",
                    "company": company,
                    "period": _period(position),
                    "location": _pick(position, "location"),
                    # THE FIELD THE WHOLE IMPORT EXISTS FOR, and the reason
                    # this source is worth paying for: the bullet text under a
                    # role is what a CV is written from, and the JSON-LD route
                    # never carried it.
                    "description": _pick_block(position, "description", "summary"),
                }
            )
    return out


def _education(row: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for school in _listed(row.get("education")):
        if not isinstance(school, dict):
            continue
        name = _pick(school, "school", "schoolName", "name")
        if not name:
            continue
        # `degree` and `fieldOfStudy` are separate columns and both are
        # optional. "BSc, Computer Science" reads as one line on a CV.
        degree = _pick(school, "degree", "degreeName")
        field = _pick(school, "fieldOfStudy", "field")
        parts = [part for part in (degree, field) if part]
        out.append(
            {
                "school": name,
                "degree": ", ".join(parts) or None,
                "period": _period(school),
            }
        )
    return out


def _certifications(row: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for cert in _listed(row.get("certifications")):
        if not isinstance(cert, dict):
            continue
        name = _pick(cert, "name", "title")
        if not name:
            continue
        out.append(
            {
                "name": name,
                "authority": _pick(cert, "issuer", "authority", "organization"),
                "period": _pick(cert, "issueDate", "date", "issued") or _period(cert),
            }
        )
    return out


def _projects(row: dict[str, Any]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for project in _listed(row.get("projects")):
        if not isinstance(project, dict):
            continue
        title = _pick(project, "title", "name")
        if not title:
            continue
        out.append(
            {
                "title": title,
                "description": _pick_block(project, "description", "summary"),
                "url": _pick(project, "url", "link"),
            }
        )
    return out


def _websites(row: dict[str, Any]) -> list[str]:
    """`websites` is a list of `{label, url}`; only the address is stored.

    A bare string is accepted too, because a source that omits empty fields is
    a source that will one day simplify a shape.
    """
    out: list[str] = []
    for site in _listed(row.get("websites")):
        url = site if isinstance(site, str) else _pick(site, "url", "link")
        cleaned = _clean(url)
        if cleaned and cleaned not in out:
            out.append(cleaned)
    return out


def profile_from_apify(row: dict[str, Any], requested_url: str) -> dict[str, Any]:
    """A `UserProfile`-shaped dict plus the warnings worth showing."""
    profile = dict(EMPTY_PROFILE)
    warnings: list[str] = []

    profile["name"] = _pick(row, "name", "fullName")
    profile["headline"] = _pick(row, "headline")
    profile["location"] = _pick(row, "location")
    profile["summary"] = _pick_block(row, "summary", "about")
    profile["pictureUrl"] = _pick(row, "profilePicture", "profilePic", "photo")
    profile["url"] = _pick(row, "profileUrl") or requested_url

    company = row.get("currentCompany")
    profile["industry"] = _pick(company, "industry")

    profile["experiences"] = _experiences(row)
    profile["education"] = _education(row)
    profile["certifications"] = _certifications(row)
    profile["projects"] = _projects(row)
    profile["websites"] = _websites(row)

    # WHAT THIS SOURCE CANNOT GIVE, said once rather than discovered later.
    # LinkedIn does not publish skills or languages to a signed-out visitor, so
    # no scraper of a guest profile can return them -- and a profile that
    # imports with an empty skills list looks like a broken import rather than
    # a limit of the source.
    warnings.append(
        "Skills and languages are not on a signed-out profile page, so they do "
        "not come through. Add them by hand, or import a LinkedIn data export."
    )
    if not profile["experiences"]:
        warnings.append("No work history came back. Add your roles by hand.")
    elif all(item["description"] is None for item in profile["experiences"]):
        warnings.append(
            "LinkedIn redacted the detail under each role for this profile — "
            "the titles and dates came through, the bullet text did not."
        )

    return {"profile": profile, "warnings": warnings}
