#!/usr/bin/env bash
#
# Takes a domain from "I own this" to "Supabase Auth sends from it".
#
#   ./scripts/verify-sending-domain.sh worktrack.dev          # step 1: get records
#   ./scripts/verify-sending-domain.sh worktrack.dev --check  # step 2: after adding them
#
# WHY A SCRIPT FOR FOUR COMMANDS. The four are easy; the order and the waiting
# are not. `resend domains verify` is ASYNCHRONOUS -- it returns immediately
# whether or not DNS has propagated, so the obvious reading of a fresh
# "not_started" is "the records are wrong", when it usually means "ask again in
# a minute". This polls, and tells the difference.
#
# It also stops at the two points where a human is genuinely required: adding
# records at the registrar, and deciding the sending domain is correct. It does
# not push anything on its own.
#
# SENDING FROM A SUBDOMAIN IS THE RECOMMENDED SHAPE (Resend's own guidance):
# `mail.your-domain.com` rather than the apex. A transactional sender that
# earns a bad reputation then damages only that subdomain, and the apex --
# which is what people type and what carries any real mail -- is untouched.
# Pass the subdomain as the argument if you want that.

set -euo pipefail
cd "$(dirname "$0")/.."

DOMAIN="${1:-}"
MODE="${2:-}"

if [ -z "$DOMAIN" ]; then
  echo "usage: $0 <domain> [--check]" >&2
  echo >&2
  echo "  $0 mail.example.com           create it and print the DNS records" >&2
  echo "  $0 mail.example.com --check   verify after the records are added" >&2
  exit 1
fi

if ! command -v resend >/dev/null 2>&1; then
  echo "resend CLI not found. npm install -g resend-cli, then: resend login" >&2
  exit 1
fi

id_for() {
  resend domains list --json 2>/dev/null \
    | python3 -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit(0)
for x in d.get('data', []):
    if x.get('name') == '$DOMAIN':
        print(x['id']); break
"
}

show_records() {
  resend domains get "$1" --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
print()
print('  Add these at your DNS host, exactly as shown:')
print()
for r in d.get('records', []):
    print('   type   ', r.get('type'))
    print('   name   ', r.get('name'))
    print('   value  ', r.get('value'))
    if r.get('priority') is not None:
        print('   prio   ', r.get('priority'))
    print('   status ', r.get('status'))
    print()
print('  Domain status:', d.get('status'))
"
}

ID="$(id_for)"

if [ "$MODE" != "--check" ]; then
  if [ -n "$ID" ]; then
    echo "$DOMAIN already exists on the Resend account."
  else
    echo "Creating $DOMAIN…"
    # ap-northeast-1: the region the account's existing domain uses, and the
    # closest of the four to the Philippines. Region affects the sending IPs,
    # not correctness.
    resend domains create --name "$DOMAIN" --region ap-northeast-1 >/dev/null
    ID="$(id_for)"
  fi
  show_records "$ID"
  echo "  Then re-run:  $0 $DOMAIN --check"
  exit 0
fi

if [ -z "$ID" ]; then
  echo "$DOMAIN is not on the Resend account. Run without --check first." >&2
  exit 1
fi

echo "Asking Resend to verify $DOMAIN…"
resend domains verify "$ID" >/dev/null 2>&1 || true

# Verification is async and DNS takes time to propagate. Poll rather than
# reporting the first "not_started" as a failure.
for attempt in $(seq 1 10); do
  STATUS="$(resend domains get "$ID" --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))")"
  echo "  attempt $attempt: $STATUS"
  if [ "$STATUS" = "verified" ]; then
    echo
    echo "Verified. Now set the sender and push:"
    echo
    echo "  SUPABASE_AUTH_SMTP_SENDER=no-reply@$DOMAIN   # in .env"
    echo "  npm run push:auth-config"
    exit 0
  fi
  [ "$attempt" -lt 10 ] && sleep 20
done

echo
echo "Still not verified. That is usually propagation rather than a wrong record."
show_records "$ID"
echo "  Re-run with --check in a few minutes."
exit 1
