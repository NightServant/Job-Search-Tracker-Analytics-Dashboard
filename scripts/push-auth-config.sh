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
  SUPABASE_AUTH_SMTP_USER     # the Brevo login email, which is the SMTP username
  BREVO_SMTP_KEY              # SMTP password. Empty here means broken email there.
                              # Read from the keychain when absent -- see below.
  SUPABASE_AUTH_SMTP_SENDER   # the From address; must be a VERIFIED SENDER in Brevo
)

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# BREVO_SMTP_KEY comes from the macOS keychain if it is not already in .env.
#
# THE KEYCHAIN READ IS KEPT FROM THE RESEND ERA and the reasoning is unchanged:
# this is an SMTP password, and the alternative is a plaintext credential in
# the working tree, in a file that is one `git add -f` away from being
# committed. It stays in the keychain, is read into one process's environment
# for the length of one push, and is never echoed -- the assignment is quiet
# and nothing below prints the value.
#
# THE SERVICE NAME IS OURS, NOT A CLI'S. `resend login` created its own
# keychain entry under "resend-cli"; Brevo ships no CLI, so store it yourself,
# once:
#
#   security add-generic-password -s worktrack-smtp -a brevo -w
#
# and it is read back here. If the entry is absent the assignment is empty and
# the check below catches it, so a machine without a keychain simply falls back
# to .env.
if [ -z "${BREVO_SMTP_KEY:-}" ] && command -v security >/dev/null 2>&1; then
  BREVO_SMTP_KEY="$(security find-generic-password -s worktrack-smtp -w 2>/dev/null || true)"
  export BREVO_SMTP_KEY
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
  echo "BREVO_SMTP_KEY is read from .env, or from the macOS keychain. Brevo" >&2
  echo "ships no CLI, so store it yourself, once:" >&2
  echo >&2
  echo "  security add-generic-password -s worktrack-smtp -a brevo -w" >&2
  echo >&2
  echo "It is the SMTP KEY from Brevo's SMTP & API page -- not the account" >&2
  echo "password and not the xkeysib- API key, neither of which authenticates" >&2
  echo "against smtp-relay.brevo.com." >&2
  echo >&2
  echo "SUPABASE_AUTH_SMTP_USER is the 'Login' on that same page, which is a" >&2
  echo "generated <id>@smtp-brevo.com address rather than your own email." >&2
  echo "SUPABASE_AUTH_SMTP_SENDER must be an address VERIFIED under Senders." >&2
  exit 1
fi

# A LEFTOVER SENDER IS PRESENT-BUT-WRONG, which the loop above cannot see.
#
# The checks above only catch EMPTY values, and the failure this one prevents
# is worse than empty: `onboarding@resend.dev` is Resend's shared sender, it
# sat in .env for months, and it is a perfectly non-empty string. Pushed to a
# project whose SMTP block now points at Brevo, it produces a config that the
# API accepts and that Brevo then refuses on every send -- because Brevo will
# only send FROM an address verified under Senders, and it has never heard of
# resend.dev. Same silent, remote, day-later failure the rest of this script
# exists to stop, arriving through the one gap the emptiness test leaves.
case "$SUPABASE_AUTH_SMTP_SENDER" in
  *@resend.dev)
    echo "Refusing to push: SUPABASE_AUTH_SMTP_SENDER is still a Resend address." >&2
    echo >&2
    echo "  $SUPABASE_AUTH_SMTP_SENDER" >&2
    echo >&2
    echo "The SMTP block sends through Brevo now, and Brevo will only send FROM" >&2
    echo "an address you have verified under Senders, Domains & Dedicated IPs." >&2
    echo "Verify one there, then set it here. A resend.dev sender would push" >&2
    echo "cleanly and fail on every email afterwards." >&2
    exit 1
    ;;
esac

echo "All required variables are set. Pushing…"
exec npx supabase config push "$@"
