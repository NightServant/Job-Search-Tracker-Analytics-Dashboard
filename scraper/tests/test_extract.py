"""The Deno parser's twenty cases, ported.

WHY PORTED RATHER THAN REWRITTEN. Each of these is a real posting's shape that
someone hit and encoded -- a Workday locale segment, a LinkedIn "hiring X"
phrase, a percent-encoded company, a malformed JSON-LD block sitting beside a
good one. Rewriting the suite against the new implementation would test what
the new implementation happens to do. Porting it tests that behaviour a user
already relies on did not change when the engine underneath it did.

Where an assertion is deliberately different from the TS original, it says so.
"""

from __future__ import annotations

from extractor.challenge import (
    autofill_from_url_alone,
    challenged_site_name,
    looks_like_bot_challenge,
)
from extractor.core import extract


def test_linkedin_metadata_heuristics():
    html = """
      <html><head>
        <meta property="og:title" content="Senior Software Engineer | LinkedIn" />
        <meta property="og:description" content="Apply now for the Senior Software Engineer role at Acme Corp." />
        <title>Senior Software Engineer | LinkedIn</title>
      </head></html>
    """
    result = extract("https://www.linkedin.com/jobs/view/123", html)
    assert "Senior Software Engineer" in result["values"]["role"]
    assert "Acme Corp" in result["values"]["company"]
    assert result["values"]["source"] == "LinkedIn"


def test_greenhouse_company_from_path():
    html = '<html><head><meta property="og:title" content="Backend Engineer - Stripe" /></head></html>'
    result = extract("https://boards.greenhouse.io/stripe/jobs/987", html)
    assert "stripe" in result["values"]["company"].lower()
    assert "Backend Engineer" in result["values"]["role"]


def test_lever_company_from_path():
    html = '<html><head><meta property="og:title" content="Product Designer - Notion" /></head></html>'
    result = extract("https://jobs.lever.co/notion/abc123", html)
    assert "notion" in result["values"]["company"].lower()
    assert "Product Designer" in result["values"]["role"]


def test_workday_company_from_path():
    html = "<html><head><title>Research Engineer - Workday</title></head></html>"
    result = extract(
        "https://wd5.myworkdayjobs.com/en-US/OpenAI/job/San-Francisco/Research-Engineer_444", html
    )
    assert "openai" in result["values"]["company"].lower()
    assert "Research Engineer" in result["values"]["role"]


def test_workday_en_gb_locale():
    html = "<html><head><title>ML Engineer - Workday</title></head></html>"
    result = extract(
        "https://wd5.myworkdayjobs.com/en-GB/OpenAI/job/London/ML-Engineer_999", html
    )
    assert "openai" in result["values"]["company"].lower()
    assert "ML Engineer" in result["values"]["role"]


def test_json_ld_role_company_salary():
    html = """
      <html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"Staff Frontend Engineer",
       "hiringOrganization":{"name":"Example Inc"},
       "baseSalary":{"@type":"MonetaryAmount","value":{"@type":"QuantitativeValue","minValue":180000,"maxValue":230000}}}
      </script></head></html>
    """
    result = extract("https://careers.example.com/jobs/1", html)
    assert result["values"]["role"] == "Staff Frontend Engineer"
    assert result["values"]["company"] == "Example Inc"
    assert result["values"]["salary_min"] == 180000
    assert result["values"]["salary_max"] == 230000


def test_json_ld_graph():
    html = """
      <html><head><script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"Organization","name":"Other"},
        {"@type":"JobPosting","title":"Platform Engineer","hiringOrganization":{"name":"Graph Co"},
         "baseSalary":{"value":{"minValue":"120000","maxValue":"160000"}}}]}
      </script></head></html>
    """
    result = extract("https://careers.example.com/jobs/2", html)
    assert result["values"]["role"] == "Platform Engineer"
    assert result["values"]["company"] == "Graph Co"
    assert result["values"]["salary_min"] == 120000
    assert result["values"]["salary_max"] == 160000


def test_json_ld_array():
    html = """
      <html><head><script type="application/ld+json">
      [{"@type":"BreadcrumbList"},
       {"@type":"JobPosting","title":"Data Engineer","hiringOrganization":{"name":"Array Inc"}}]
      </script></head></html>
    """
    result = extract("https://careers.example.com/jobs/3", html)
    assert result["values"]["role"] == "Data Engineer"
    assert result["values"]["company"] == "Array Inc"


def test_json_ld_beats_og_title():
    html = """
      <html><head>
        <meta property="og:title" content="Wrong Title - Example" />
        <script type="application/ld+json">
        {"@type":"JobPosting","title":"Correct Title","hiringOrganization":{"name":"Example"}}
        </script>
      </head></html>
    """
    result = extract("https://careers.example.com/jobs/4", html)
    assert result["values"]["role"] == "Correct Title"


def test_meta_with_content_attribute_first():
    # The TS parser needed a SECOND regex for this, because attribute order is
    # a real thing in source text. A DOM makes the question disappear -- which
    # is a large part of why this milestone exists.
    html = '<html><head><meta content="Backend Engineer - Example Inc" property="og:title" /></head></html>'
    result = extract("https://careers.example.com/jobs/5", html)
    assert result["values"]["role"] == "Backend Engineer"


def test_salary_range_from_text_with_en_dash():
    html = "<html><body><p>Compensation: $120,000 – $150,000 per year</p></body></html>"
    result = extract("https://careers.example.com/jobs/6", html)
    assert result["values"]["salary_min"] == 120000
    assert result["values"]["salary_max"] == 150000


def test_decodes_html_entities():
    html = """
      <html><head>
        <meta property="og:site_name" content="AT&amp;T" />
        <meta property="og:title" content="Network Engineer | Careers" />
      </head></html>
    """
    result = extract("https://careers.example.com/jobs/7", html)
    assert result["values"]["company"] == "AT&T"


def test_malformed_json_ld_does_not_throw():
    html = """
      <html><head>
        <script type="application/ld+json">{ this is not valid json }</script>
        <meta property="og:title" content="Frontend Engineer - Example" />
        <meta property="og:site_name" content="Example Co" />
      </head></html>
    """
    result = extract("https://careers.example.com/jobs/8", html)
    assert result["values"]["role"] == "Frontend Engineer"
    assert result["values"]["company"] == "Example Co"


def test_warnings_when_nothing_is_available():
    result = extract("https://careers.example.com/jobs/9", "<html></html>")
    joined = " ".join(result["warnings"])
    assert "Could not confidently detect company" in joined
    assert "Could not confidently detect role" in joined
    assert "Salary was not found" in joined


def test_cleans_linkedin_boilerplate():
    html = """
      <html><head>
        <meta property="og:title" content="Bluesky HR Consultancy Inc. by 2x | LinkedIn" />
        <meta property="og:description" content="Bluesky HR Consultancy Inc. hiring Data Analyst in Makati, National Capital Region" />
        <title>Bluesky HR Consultancy Inc. hiring Data Analyst in Makati, National Capital Region | LinkedIn</title>
      </head></html>
    """
    result = extract("https://www.linkedin.com/jobs/view/123", html)
    company = result["values"]["company"].lower()
    assert "bluesky hr consultancy" in company
    assert "by 2x" not in company
    assert "data analyst" in result["values"]["role"].lower()


def test_decodes_percent_encoded_and_plus():
    html = """
      <html><head>
        <meta property="og:title" content="Senior%20Engineer%20%7C%20Acme%20Corp" />
        <meta property="og:site_name" content="ACME+Corp" />
      </head></html>
    """
    result = extract("https://careers.example.com/jobs/encoded", html)
    assert "Senior Engineer" in result["values"]["role"]
    assert result["values"]["company"] == "ACME Corp"


def test_challenged_site_names():
    assert challenged_site_name("ph.jobstreet.com") == "JobStreet"
    assert challenged_site_name("www.jobstreet.com.ph") == "JobStreet"
    assert challenged_site_name("www.seek.com.au") == "SEEK"
    # JOBSDB CAME OFF THE LIST, re-measured 2026-09-06 (M7 Task 8): 200 with
    # 950KB of real HTML from the same headers JobStreet still refuses. See
    # extractor/challenge.py for the full table.
    assert challenged_site_name("hk.jobsdb.com") is None
    # A site that does NOT block must not be labelled as one, or the app stops
    # trying to read pages it can read perfectly well.
    assert challenged_site_name("boards.greenhouse.io") is None
    assert challenged_site_name("jobs.lever.co") is None
    # Not a substring match: this must not fire on an unrelated host.
    assert challenged_site_name("notjobstreet.com.evil.test") is None


def test_challenge_detected_by_status_and_by_body():
    assert looks_like_bot_challenge(403, "") is True
    assert looks_like_bot_challenge(503, "") is True
    assert looks_like_bot_challenge(200, "<html><title>Just a moment...</title>") is True
    assert looks_like_bot_challenge(200, '<div class="cf-browser-verification">') is True
    assert looks_like_bot_challenge(200, "<html><title>Frontend Engineer at Acme</title>") is False


def test_url_alone_says_what_it_can_prove():
    result = autofill_from_url_alone("https://ph.jobstreet.com/job/86776684")
    assert result["values"]["source"] == "JobStreet"
    assert result["values"]["url"] == "https://ph.jobstreet.com/job/86776684"
    # Nothing is invented from the path -- no role, no company.
    assert "role" not in result["values"]
    assert "company" not in result["values"]
    joined = " ".join(result["warnings"])
    assert "JobStreet blocks automated reads" in joined
    assert "aste" in joined  # "Paste"/"paste"


def test_unknown_blocking_host_still_explains_itself():
    result = autofill_from_url_alone("https://unknown.example/job/1")
    assert "source" not in result["values"]
    assert "could not be read" in " ".join(result["warnings"]).lower()


def test_challenge_short_circuits_extraction():
    # The whole pipeline, not just the predicate: a 403 must never reach the
    # parser, or it "succeeds" and returns "Just a moment..." as the role.
    result = extract("https://ph.jobstreet.com/job/1", "<html><title>Just a moment...</title></html>", status=403)
    assert result["values"].get("role") is None
    assert result["values"]["source"] == "JobStreet"
