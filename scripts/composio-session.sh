#!/usr/bin/env bash
#
# Creates a Composio tool-router session and prints the command that registers
# it with Claude Code.
#
#   ./scripts/composio-session.sh                       # a router over everything
#   ./scripts/composio-session.sh --no-workbench        # without the remote sandbox
#   ./scripts/composio-session.sh --toolkits gmail,googlecalendar
#
# WHY A SCRIPT FOR ONE CURL. Because the curl is not the hard part; knowing
# that a curl is needed at all is. The tool-router URL is not on any screen in
# the Composio dashboard -- it comes back from creating a SESSION -- and the
# first version of docs/INTEGRATIONS.md told a reader to paste
# "<your-tool-router-url>" with no way to obtain one. This is that missing step,
# written down where it cannot be forgotten.
#
# Three details this encodes, each of which cost a round trip on 2026-09-05:
#
#   * `toolkits` is an OBJECT, not an array. `["gmail"]` returns
#     400 "Error in payload.toolkits: Invalid input"; `{"enabled":["gmail"]}`
#     is the allowlist. The API reference types the field as `any` and shows
#     `null`, so the shape is only in prose.
#   * The URL that comes back is on `backend.composio.dev`, NOT the
#     `app.composio.dev/tool_router/v3/...` the docs give as the format.
#     Build it by hand from the documentation and it 404s.
#   * No `mcp.headers` is returned, only `type` and `url`. The auth header is
#     the plain API key.
#
# IT REGISTERS NOTHING ITSELF, matching verify-sending-domain.sh: it stops at
# the point a human should look at what is about to be written, and `claude mcp
# add` writes a credential to ~/.claude.json.

set -euo pipefail
cd "$(dirname "$0")/.."

USER_ID="${COMPOSIO_USER_ID:-gabe}"
TOOLKITS=""
WORKBENCH="true"

while [ $# -gt 0 ]; do
  case "$1" in
    --no-workbench) WORKBENCH="false"; shift ;;
    --toolkits) TOOLKITS="${2:-}"; shift 2 ;;
    --user) USER_ID="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

# The key is never an argument and never lands in shell history. Environment
# first, then the macOS keychain -- the same place the Resend CLI's key lives.
KEY="${COMPOSIO_API_KEY:-}"
if [ -z "$KEY" ] && command -v security >/dev/null 2>&1; then
  KEY="$(security find-generic-password -s composio -w 2>/dev/null || true)"
fi
if [ -z "$KEY" ]; then
  cat >&2 <<'MSG'
No Composio API key found.

  export COMPOSIO_API_KEY=...        (this shell only)

or store it in the keychain once, which keeps it out of shell history:

  security add-generic-password -s composio -a "$USER" -w

Get the key from app.composio.dev -> API Keys.
MSG
  exit 1
fi

PAYLOAD="$(
  USER_ID="$USER_ID" TOOLKITS="$TOOLKITS" WORKBENCH="$WORKBENCH" python3 - <<'PY'
import json, os
body = {"user_id": os.environ["USER_ID"]}
toolkits = os.environ["TOOLKITS"].strip()
if toolkits:
    # An OBJECT with an allowlist. A bare array is the 400 this script exists
    # partly to stop anyone hitting twice.
    body["toolkits"] = {"enabled": [t.strip() for t in toolkits.split(",") if t.strip()]}
if os.environ["WORKBENCH"] == "false":
    body["workbench"] = {"enable": False}
print(json.dumps(body))
PY
)"

echo "Creating a session for user_id=$USER_ID…"
RESPONSE="$(
  curl -sS -X POST https://backend.composio.dev/api/v3.1/tool_router/session \
    -H "x-api-key: $KEY" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD"
)"

URL="$(printf '%s' "$RESPONSE" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
print(d.get('mcp', {}).get('url', ''))
")"

if [ -z "$URL" ]; then
  echo >&2
  echo "No mcp.url in the response:" >&2
  # A 401 here means the key; a 400 means the body -- and a 400 is the better
  # of the two, because auth is checked FIRST, so reaching validation at all
  # proves the key, the endpoint and the method are right.
  printf '%s\n' "$RESPONSE" >&2
  exit 1
fi

printf '%s' "$RESPONSE" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print()
print('  session ', d.get('session_id'))
print('  url     ', d['mcp']['url'])
print('  tools   ', ', '.join(d.get('tool_router_tools', [])))
wb = d.get('config', {}).get('workbench', {})
print('  workbench', 'ENABLED (remote sandbox with shell)' if wb.get('enable') else 'off')
for w in d.get('warnings', []):
    print('  warning ', w)
print()
"

cat <<MSG
  Register it, then start a NEW interactive session -- the per-toolkit OAuth
  runs on first use through COMPOSIO_MANAGE_CONNECTIONS and needs a terminal:

    claude mcp add --transport http composio "$URL" -H "x-api-key: \$COMPOSIO_API_KEY"

  -H, singular, "Name: value". Composio's own Claude Code page says --headers
  with no space, which this CLI rejects.

  Add -s user for every project; the default is local, this repo only. The key
  is written to ~/.claude.json (0600, outside the repo) -- keep it there.
MSG
