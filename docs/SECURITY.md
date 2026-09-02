# Security posture

Written 2026-09-02 after an audit of the repository. Everything below was
verified by reading the code or the migrations, not assumed. Where a control
lives outside this repository — in the Supabase dashboard — it says so, because
a control nobody has switched on is not a control.

## What the audit found

### Secrets — clean

No credential is committed. `git log -S` over the full history finds no
JWT-shaped literal and no service-role key; the only `service_role` hits are the
Postgres role name in a policy and a placeholder in an example file. `.env` is
ignored, and `.env.example` contains placeholders only.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` **is** in the client bundle, and that is
correct. Next inlines any `NEXT_PUBLIC_` variable, the anon key is designed to
be public, and row-level security — not key secrecy — is what protects the data.
Never put the service-role key behind that prefix; it bypasses RLS entirely.

### Row-level security — complete

Twelve tables, twelve `ENABLE ROW LEVEL SECURITY`. No table is missing it.

### Edge functions — one was open, now fixed

`analytics-cache-proxy`, `resume-export-pdf` and `cv-render` each read the
`Authorization` header and call `getUser()` before doing any work.
**`job-url-autofill` did neither.** It fetches an arbitrary external URL
server-side, so an unauthenticated caller had a fetch proxy running inside our
infrastructure, on our egress IP, against our rate budget.

The trap worth naming: Supabase's `verify_jwt` gate is *not* sufficient by
itself, because the anon key **is** a valid JWT and it is public. A gateway that
only asks "is this a valid JWT" admits the entire internet. `getUser()` is what
distinguishes a signed-in person from anyone holding a public key. That call has
been added, after the in-memory throttle so anonymous floods stay cheap to
reject.

Its SSRF defences were already strong and are untouched: non-HTTP protocols,
`localhost`, `.local`, `.internal`, single-label hosts, private IPv4 ranges and
IPv6 literals are all refused.

**The hole is now gated, not just patched.**
`src/__tests__/edgeFunctionAuth.test.ts` reads every function under
`supabase/functions/` and fails if one lacks `getUser()`, reads a service-role
key, or builds its client without forwarding the caller's `Authorization`
header. It was proved to have teeth by removing the fix and watching it fail.
The point is function number five: this defect existed because "check who is
calling" was a habit three files happened to share, and a habit is not a
control. The gate reads source text rather than running the functions — they
are Deno, they call `Deno.serve` at module scope, and standing up a runtime
would cost more than it proves — so it verifies the call is *present*, not that
it is reachable. A floor, not a ceiling, and the floor the actual bug fell
through.

### No storage buckets

None are created in any migration, so there is no public-bucket exposure to
close. If one is added later it defaults to private — keep it that way and serve
files through signed URLs.

## Credentials

`src/lib/credentials.ts` is the single definition of a valid credential, shared
by every auth surface so two forms cannot disagree.

**Emails are normalised — trimmed and lowercased — at the boundary.** This is
the fix for a real duplicate-account vector rather than a tidiness preference:
without it `Gabe@example.com`, `gabe@example.com` and `  GABE@EXAMPLE.COM  ` are
three sign-ups, and a script walking the case permutations of one address can
create a great many rows that all belong to one person.

**Passwords** need 10+ characters, upper and lower case, a digit, a symbol, and
no leading or trailing whitespace, and are capped at 72 characters. The cap is
not arbitrary: bcrypt, which Supabase uses, silently truncates at 72 bytes, so
accepting more lets someone believe in protection they do not have. Ten is the
floor rather than eight because eight is within range of commodity offline
cracking against a stolen hash.

## Rate limiting

`src/lib/authRateLimit.ts` throttles repeated attempts from one browser: five
per minute, then an escalating lockout (30s, 2m, 10m), persisted to
localStorage so a reload does not hand back a fresh budget.

**It is an affordance, not a boundary.** It runs in the client, so anyone
willing to open a console walks past it. It genuinely stops double-submits,
stuck retry loops, and opportunistic stuffing from the page itself. It does not
stop a script hitting the auth API directly.

The registration form also validates *before* the network, which is a real part
of the same story: every request it does not send is a row the auth server does
not have to reject.

### Server-side controls you must switch on

These are the actual boundary and none of them live in this repository:

| Control | Where | Why |
|---|---|---|
| Auth rate limits | Dashboard → Authentication → Rate Limits | The only thing that throttles a script hitting the API directly. |
| CAPTCHA (hCaptcha or Turnstile) | Dashboard → Authentication → Bot and Abuse Protection | The control that actually stops automated sign-up floods. |
| ~~Email confirmations ON~~ | now `supabase/config.toml` | Moved into the repo on 2026-09-03; see below. Still needs `config push` to take effect. |
| Redirect allow-list | Dashboard → Authentication → URL Configuration | Constrains where an OAuth flow may return a token. |
| Leaked-password protection | Dashboard → Authentication → Password | Rejects passwords in known breach corpora, which no client-side rule can. |

## The OTP step is configured in this repo, not in the dashboard

Registration sends a six-digit code and verifies it with `verifyOtp(...,
type: 'signup')`. Supabase's default "Confirm signup" template contains
`{{ .ConfirmationURL }}` and **no token**, so on the stock template no code is
ever sent and verification keeps failing against a code that never existed.

This used to be a manual dashboard edit. It is now `supabase/config.toml` plus
`supabase/templates/confirmation.html`, so the setting is reviewable,
diffable and revertible:

| Setting | Value | Why |
|---|---|---|
| `auth.email.enable_confirmations` | `true` | Without it `signUp()` returns a usable session immediately and the OTP screen is theatre in front of an account that already exists. |
| `auth.email.template.confirmation` | the local template | Carries `{{ .Token }}`. This is the switch that makes step 2 real. |
| `auth.email.otp_length` / `otp_expiry` | `6` / `3600` | Matches what `OtpStep` asks for. |
| `auth.email.max_frequency` | `60s` | A **server-side** resend limit, so unlike `authRateLimit` it is a real boundary. The CLI default is 1s, at which a held key is a mail flood billed to us and delivered to someone else. |
| `auth.minimum_password_length` | `10` | Matches `PASSWORD_MIN_LENGTH`. |
| `auth.password_requirements` | `lower_upper_letters_digits_symbols` | Matches `isPasswordStrong`. |

The last two close the "client validation is duplicated by nothing on the
server" gap for passwords specifically: a rule the browser enforces and the
server does not is a rule anyone can skip with curl.

### Applying it — read before you push

```bash
SUPABASE_AUTH_SITE_URL=https://your-deployed-origin npx supabase config push
```

**`config push` sends the WHOLE file, and this file was generated from CLI
defaults.** Anything left at a default overwrites whatever the dashboard has
now. `site_url` is the one that bites: the generated default is
`http://127.0.0.1:3000`, and pushing that points every auth email and OAuth
return at a developer's laptop. It is therefore `env(SUPABASE_AUTH_SITE_URL)`
with **no fallback**, so an unset variable fails the push loudly instead of
shipping localhost to production.

Diff the file against the dashboard's current Auth settings before the first
push. This has not been pushed from here — it changes a live project, which is
not a call this repo should make on its own.

## OAuth providers

Google and Microsoft. **Microsoft is `azure`** in the SDK — Supabase names the
provider after the identity platform behind it, so `provider: 'microsoft'`
typechecks against nothing and fails at the call.

**Yahoo is not available** — Supabase Auth ships a fixed provider list and
Yahoo is not on it, so a Yahoo button would either need a custom OIDC
integration or would be a button that cannot work. GitHub was the stand-in
until 2026-09-03; Microsoft replaced it because it carries Outlook, Hotmail,
Live and every work account, which is a far larger share of the addresses
people actually job-hunt from.

Each provider must be enabled with a client ID and secret in the dashboard;
those secrets live there and never in this repository.

## Fixed since the audit

- `PasswordInput` drew its reveal control with a magnifying glass and its
  hidden state with a padlock — a search affordance inside a password field.
  It now uses `lu-eye` / `lu-eye-off` from the AnimateIcons registry, asserted
  on glyph geometry rather than on the imported name.

## Still open

- Client-side validation is duplicated by nothing on the server beyond
  Supabase's own rules. That is acceptable while Supabase owns the user table;
  it stops being acceptable the moment a custom endpoint writes credentials.
