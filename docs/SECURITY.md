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
| Custom SMTP | Dashboard → Project Settings → Auth, or `[auth.email.smtp]` | **Blocking the OTP step.** Without it the free tier refuses email-template changes, so no verification code is ever sent. See below. |
| CAPTCHA (hCaptcha or Turnstile) | Dashboard → Authentication → Bot and Abuse Protection | The control that actually stops automated sign-up floods. |
| ~~Email confirmations ON~~ | now `supabase/config.toml` | Moved into the repo and **pushed** on 2026-09-03. |
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

### Applying it

```bash
SUPABASE_AUTH_SITE_URL=https://your-deployed-origin npx supabase config push
```

**PUSHED on 2026-09-03.** The remote auth config now carries the production
`site_url`, the redirect allow-list, the 10-character password minimum,
`lower_upper_letters_digits_symbols`, and a 6-digit OTP.

**`config push` sends the WHOLE file, and this file was generated from CLI
defaults.** Anything left at a default overwrites whatever the dashboard has.
Read the diff it prints before answering the prompt — the first attempt here
proved why:

| Setting | Remote before | Local file | Outcome |
|---|---|---|---|
| `site_url` | `http://localhost:3000` | production origin | **Fixed.** Every auth email and OAuth return had been pointing at a laptop. |
| `additional_redirect_urls` | `[]` | production + localhost | Fixed. |
| `minimum_password_length` | `6` | `10` | Fixed. |
| `password_requirements` | `""` | upper/lower/digit/symbol | Fixed. |
| `otp_length` | `8` | `6` | Fixed — `OtpStep` asks for six. |
| **`mfa.totp.enroll_enabled`** | **`true`** | **`false`** | **Caught and reverted.** The CLI generates these `false`; the project has them **on**. Pushing the generated default would have silently disabled app-authenticator MFA for everyone enrolled, as a side effect of a change about email templates. The file now says `true`. |

`site_url` is `env(SUPABASE_AUTH_SITE_URL)` with **no fallback**, so an unset
variable fails the push loudly instead of shipping localhost to production.

### Never run `supabase config push` directly — use `npm run push:auth-config`

`config push` treats a missing `env(...)` as a **warning, not an error**:

```
WARN: environment variable is unset: RESEND_API_KEY
```

and then sends `pass = ""`. Combined with `enabled = true` in the SMTP block,
that is a config the API accepts and which breaks **every auth email on the
project** — signup codes, password resets, email changes. The failure is
silent, remote, and only surfaces when somebody cannot receive a code.

It nearly happened on 2026-09-03. The push reached the confirmation prompt
with an empty password and was stopped only because a *second* variable was
also unset and happened to fail regex validation on the way out. Relying on one
mistake to catch another is not a safety property.

`scripts/push-auth-config.sh` asserts every required variable is non-empty
before it will run, reads them from `.env`, and never prints them. A missing
variable stops it locally, where the cost is reading one line.

```bash
npm run push:auth-config
```

Required: `SUPABASE_AUTH_SITE_URL` and `SUPABASE_AUTH_SMTP_SENDER` in `.env`.

`RESEND_API_KEY` is **read from the macOS keychain**, not from `.env`. `resend
login` stores it under service `resend-cli`, and the script pulls it into one
process's environment for the length of one push. That is deliberate: the key
is an SMTP password, and the alternative is leaving it in plaintext in the
working tree, one `git add -f` from being committed. Set it in `.env` only
where there is no keychain, such as CI.

### Custom SMTP — done

Resend, pushed 2026-09-03. `smtp.resend.com:465`, user `resend` (the literal
string, the same for every Resend account), password from the keychain. This
lifted the free-tier restriction below, so the OTP template is now live on the
project and a signup sends a six-digit code rather than a link.

`email_sent` was raised from the CLI default of 2/hour to 30. Two an hour is
the built-in provider's cap and it throttles the PROJECT rather than each user,
so the third person to register in an hour would have silently received nothing.

**THE SENDING DOMAIN IS NOT VERIFIED, AND THAT IS A REAL LIMIT.** The From
address is `onboarding@resend.dev`, which Resend delivers **only to the address
that owns the Resend account**. Every other recipient is dropped silently — not
bounced, not errored, just never delivered. It is enough to test the flow end
to end and it is useless for real signups.

**Verified by test on 2026-09-03.** An email rendered from the real template
was sent through Resend SMTP and reached `last_event: delivered` — but only to
`egabecervantes@gmail.com`, the address that owns the Resend account. Sending
to any other recipient returns:

```
403 validation_error: You can only send testing emails to your own email
address. To send emails to other recipients, please verify a domain at
resend.com/domains, and change the `from` address to an email using this
domain.
```

### To reach real users

A verified sending domain is the only way, and it needs a domain whose DNS you
control. The one domain on the Resend account, `smart-hrms.onrender.com`, can
**never** be verified: Render owns the `onrender.com` zone and issues
subdomains without DNS delegation, so the SPF and DKIM records Resend requires
cannot be added. It is dead weight on the account and can be removed.

The Vercel project is still on a `vercel.app` subdomain, which has the same
problem for the same reason.

Once a domain exists, the rest is scripted:

```bash
npm run verify:domain mail.your-domain.com            # prints the DNS records
# add them at the DNS host, then:
npm run verify:domain mail.your-domain.com -- --check # polls until verified
```

Then set `SUPABASE_AUTH_SMTP_SENDER=no-reply@mail.your-domain.com` in `.env`
and run `npm run push:auth-config`. Nothing else changes — the template, the
SMTP host and the auth config are already in place and already pushed.

**Send from a subdomain**, `mail.your-domain.com` rather than the apex. It is
Resend's own guidance and the reason is containment: a transactional sender
that earns a bad reputation damages only that subdomain, leaving the apex —
which is what people type, and what carries any real mail — untouched.

The script exists because `resend domains verify` is **asynchronous**. It
returns immediately whether or not DNS has propagated, so a fresh
`not_started` reads as "your records are wrong" when it usually means "ask
again in a minute". The script polls and tells the two apart.

Availability checked 2026-09-03, for reference rather than as a
recommendation: `worktrack.dev` $9.99/yr and `useworktrack.com` $11.25/yr were
free; `worktrack.app`, `worktrack.io` and `getworktrack.com` were taken.

#### Free routes to a domain

- **GitHub Student Developer Pack** — Namecheap gives a free `.me` for a year,
  Name.com a free domain across 25+ TLDs including `.app` and `.dev`, and
  `.TECH` one free `.TECH`. A real registrar with full DNS control, which is
  what SPF and DKIM need.
- **eu.org** — free permanently, does not expire, and it delegates NS, so DNS
  control is complete. Two things to know before starting, because both bite
  in the middle:

  1. **Nameservers must exist before you apply.** The form wants two working
     nameservers, so the Cloudflare zone has to be created *first* — add
     `yourname.eu.org` to Cloudflare, take the two nameservers it assigns, and
     put those in the eu.org application. The zone sits "pending" until eu.org
     delegates to it, which is expected, not an error.
  2. **Approval is manual, by volunteers, and takes days to weeks.** There is
     no queue position and no support channel.

  Availability is checkable with `dig` rather than a signup — a name with no
  NS, SOA or A record is free:

  ```bash
  dig +short NS worktrack.eu.org
  ```

  Checked 2026-09-03: `worktrack.eu.org`, `worktrackapp.eu.org` and
  `worktrack-app.eu.org` all resolved nothing.

  **Deliverability is the real cost.** `.eu.org` is a legitimate registry
  running since 1996, but it is a free subdomain service, and spam filters
  weigh that. Combined with a brand-new sending reputation, verification codes
  are more likely to land in spam than they would from a registered domain.
  Free, permanent, and the weakest of the three on the one axis that matters
  for auth email.

Not viable, each for a specific reason worth writing down:

- **Freenom** (`.tk`, `.ml`, `.ga`, `.cf`, `.gq`) — stopped new registrations,
  and those TLDs are heavily spam-filtered even when they work.
- **`js.org`, `vercel.app`, `onrender.com`** — subdomains without DNS
  delegation. No TXT record means no DKIM, which means no sending.
- **`is-a.dev`** — free and GitHub-PR based, and its Terms of Service
  explicitly forbid AI-created pull requests, naming Claude Code among others,
  on pain of blocking the author from their repositories. Register it by hand
  or not at all.

**Every free route needs a human.** The Student Pack needs student
verification, `eu.org` needs an account and manual approval, `is-a.dev` needs a
hand-written PR. That is the one step in this chain that cannot be automated,
and it is worth knowing before starting rather than halfway through.

#### Cloudflare Email Routing does NOT solve this

It is worth stating because it looks like it should. **Email Routing is receive
and forward only.** Cloudflare's own docs split the two products: Email Routing
"for handling incoming emails", and a separate Email Sending beta that is
"Available on Workers Paid plan". Routing cannot act as an SMTP relay, so it
cannot deliver a Supabase verification code.

Where it IS useful is the other direction, and it is free: once a domain is on
Cloudflare, Email Routing can forward `hello@your-domain` to a personal inbox,
so the address a signup email comes FROM can receive replies. That complements
Resend rather than replacing it — and it still needs the domain first.

### The restriction this lifted

Before custom SMTP was configured, the first push was rejected outright:

```
unexpected status 400: Email template modification is not available for free
tier projects using the default email provider. Please upgrade your plan or
configure a custom SMTP provider.
```

The push is **atomic**, so that one rejection meant *nothing* was applied — not
the `site_url` fix, not the password rules. The template block is therefore
commented out in `config.toml` and the rest of the file now lands.

**This means the registration OTP step does not work in production yet.**
`enable_confirmations` is on, so a signup sends Supabase's stock email — a
confirmation *link* with no `{{ .Token }}` in it — and the verification screen
waits for a code that was never sent.

Two ways out, either of which is enough:

1. **Configure custom SMTP** under `[auth.email.smtp]`. Resend, SendGrid and
   Postmark all have free tiers, and a custom provider lifts the restriction.
2. **Upgrade the project** off the free tier.

Then uncomment the three `[auth.email.template.confirmation]` lines and push
again. The template is already written and reviewed at
`supabase/templates/confirmation.html`.

## Analytics

**Vercel Web Analytics**, added 2026-09-03. Cookieless: it sets no cookie,
assigns no identifier and does not follow a visitor between sites or between
visits. That is why there is no consent banner — there is nothing to consent
to — and it is the reason it was chosen over Google Analytics, which is neither.

It is loaded as `/_vercel/insights/script.js` rather than through
`@vercel/analytics`. **The package cannot be installed here.** All of its peers
are `optional: true`, including `@sveltejs/kit`, and npm resolves them anyway —
colliding the `vite@5` that vitest brings with the `vite@8` SvelteKit's plugin
wants. Verified on npm 11.10.1, so it is current behaviour rather than an old
resolver, and Vercel runs `npm install` on every build: adding the package
would have broken the deploy, not just the laptop. The package's only job is to
inject that script and re-report on route changes, and the script hooks the
History API itself.

The tag is production-only, and the feature must also be switched on in the
project's Analytics tab — the tag alone collects nothing.

**The privacy policy changed in the same commit.** It previously said this
application had "no analytics vendor, no advertising network and no third-party
tracking", which shipping this would have made false. A policy describing the
previous version of the product is worse than a vague one, because it is
confidently wrong. `page.test.tsx` now fails if the vendor goes unnamed or the
old blanket denial returns.

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
