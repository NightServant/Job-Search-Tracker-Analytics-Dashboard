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
                              # Read from the keychain when absent -- see below.
  SUPABASE_AUTH_SMTP_SENDER   # the From address; Resend rejects unverified domains
)

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# RESEND_API_KEY comes from the macOS keychain if it is not already in .env.
#
# `resend login` stores the key under service "resend-cli" with storage set to
# "secure_storage", so the key is in the keychain and NOT in
# ~/.config/resend/credentials.json -- that file holds only the profile name,
# the key type and its permission.
#
# Reading it here rather than copying it into .env is the point: the key is an
# SMTP password that would otherwise sit in plaintext in the working tree, in a
# file that is one `git add -f` away from being committed. This way it stays in
# the keychain, is read into one process's environment for the length of one
# push, and is never written down. It is also never echoed -- the assignment is
# quiet and nothing below prints the value.
#
# If the entry is absent the assignment is empty and the check below catches
# it, so a machine without the CLI simply falls back to .env.
if [ -z "${RESEND_API_KEY:-}" ] && command -v security >/dev/null 2>&1; then
  RESEND_API_KEY="$(security find-generic-password -s resend-cli -w 2>/dev/null || true)"
  export RESEND_API_KEY
fi

missing=()
for var in "${REQUIRED[@]}"; do
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Refusing to push: these are unset or empty" >&2
  for var in "${missing[@]}"; do
    echo "  - $var" >&2
  done
  echo >&2
  echo "supabase config push would only WARN about these and send empty values." >&2
  echo "With [auth.email.smtp] enabled = true, an empty password breaks every" >&2
  echo "auth email on the project. See docs/SECURITY.md." >&2
  echo >&2
  echo "RESEND_API_KEY is read from .env, or from the macOS keychain if you" >&2
  echo "have run: resend login" >&2
  exit 1
fi

echo "All required variables are set. Pushing…"
exec npx supabase config push "$@"
