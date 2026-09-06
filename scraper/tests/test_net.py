"""The SSRF gate.

This is the security-critical half of the service, and it is ported rather than
rewritten for that reason -- the ranges below are the ones the Deno function
chose after review, and re-deriving them from memory is how one gets dropped.

`is_disallowed_hostname` is deliberately conservative: a name it cannot resolve
to a public address is refused. A false refusal costs one auto-fill; a false
allow is an open proxy on our egress IP.
"""

from __future__ import annotations

import pytest

from extractor.net import is_disallowed_hostname, normalize_target_url, reject_reason


@pytest.mark.parametrize(
    "host",
    [
        "localhost",
        "app.localhost",
        "printer.local",
        "db.internal",
        "intranet",  # single label -- the shape of an internal target
        "127.0.0.1",
        "10.0.0.1",
        "172.16.0.1",
        "172.31.255.255",
        "192.168.1.1",
        "169.254.169.254",  # cloud metadata, the classic SSRF target
        "100.64.0.1",  # carrier-grade NAT
        "0.0.0.0",
        "224.0.0.1",  # multicast
        "::1",
        "fe80::1",  # link-local
        "fd00::1",  # unique-local
    ],
)
def test_private_and_internal_hosts_are_refused(host):
    assert is_disallowed_hostname(host) is True


@pytest.mark.parametrize(
    "host",
    ["boards.greenhouse.io", "jobs.lever.co", "www.linkedin.com", "8.8.8.8", "careers.example.com"],
)
def test_public_hosts_are_allowed(host):
    # The positive companion: a gate that refuses everything passes every
    # negative test above and breaks the feature.
    assert is_disallowed_hostname(host) is False


def test_trailing_dot_and_brackets_do_not_bypass():
    # `127.0.0.1.` and `[::1]` are the same targets wearing punctuation.
    assert is_disallowed_hostname("127.0.0.1.") is True
    assert is_disallowed_hostname("[::1]") is True


def test_normalises_what_a_person_pastes():
    assert normalize_target_url("acme.com/jobs/1") == "https://acme.com/jobs/1"
    assert normalize_target_url("//acme.com/jobs/1") == "https://acme.com/jobs/1"
    assert normalize_target_url("https://acme.com/jobs/1") == "https://acme.com/jobs/1"
    assert normalize_target_url("  ") == ""


def test_reject_reason_covers_scheme_length_and_host():
    assert reject_reason("") == "URL is required"
    assert reject_reason("https://acme.com/" + "a" * 3000) == "URL is too long"
    assert reject_reason("ftp://acme.com/x") == "URL must start with http:// or https://"
    assert reject_reason("file:///etc/passwd") == "URL must start with http:// or https://"
    assert reject_reason("http://169.254.169.254/latest/meta-data/") == (
        "URL must be a public job posting URL"
    )
    assert reject_reason("https://boards.greenhouse.io/acme/jobs/1") is None
