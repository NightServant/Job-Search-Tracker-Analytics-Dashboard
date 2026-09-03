#!/usr/bin/env bash
#
# Pushes supabase/config.toml to the linked project, refusing to run unless
# every credential the file interpolates is actually present.
#
# WHY THIS EXISTS. `supabase config push` treats a missing `env(...)` as a
# WARNING, not an error:
#
#     WARN: environment variable is unset: RESEND_API_KEY
#
# and then sends `pass = ""`. Combined with `enabled = true` in the SMTP block,
# that is a config the API happily accepts and which breaks EVERY auth email on
# the project -- signup codes, password resets, email changes. The failure is
# silent, remote, and only shows up when somebody cannot receive a code.
#
# It nearly happened here on 2026-09-03: the push got as far as the confirmation
# prompt with an empty password and was stopped only because a SECOND variable
# was also unset and happened to fail regex validation on the way out. Relying
# on one mistake to catch another is not a safety property.
#
# So: assert first, push second. A missing variable stops this script locally,
# where the cost is reading one line, rather than remotely, where the cost is a
# broken signup flow nobody notices for a day.
#
# The values are read from .env and never printed. `set -a` exports what the
# file defines so `env(...)` can resolve it; the trap clears them again.

set -euo pipefail
cd "$(dirname "$0")/.."

REQUIRED=(
  SUPABASE_AUTH_SITE_URL      # the production origin; no default, on purpose
  RESEND_API_KEY              # SMTP password. Empty here means broken email there.
  SUPABASE_AUTH_SMTP_SENDER   # the From address; Resend rejects unverified domains
)

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

missing=()
for var in "${REQUIRED[@]}"; do
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Refusing to push: these are unset or empty in .env" >&2
  for var in "${missing[@]}"; do
    echo "  - $var" >&2
  done
  echo >&2
  echo "supabase config push would only WARN about these and send empty values." >&2
  echo "With [auth.email.smtp] enabled = true, an empty password breaks every" >&2
  echo "auth email on the project. See docs/SECURITY.md." >&2
  exit 1
fi

echo "All required variables are set. Pushing…"
exec npx supabase config push "$@"
