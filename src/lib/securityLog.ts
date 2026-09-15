/**
 * One line per security-relevant event, on the server, as JSON.
 *
 * WHY IT EXISTS. The brief asks for "logging for authentication attempts, API
 * errors, and unusual traffic patterns so suspicious behavior can be
 * detected", and before this the app had none of it. A rejected API call
 * returned a 401 and vanished: nothing recorded that it happened, so nothing
 * could notice a thousand of them. The throttles in /api/autofill and
 * /api/profile were firing into silence, which makes them a control nobody can
 * audit -- you cannot tell a working rate limit from one that never triggers.
 *
 * `console.*` AND NOTHING ELSE, which is the whole implementation. On Vercel,
 * stdout and stderr from a function are collected into Runtime Logs, queryable
 * and forwardable to a log drain. A logging LIBRARY would add a dependency, a
 * transport and a buffer to reach the same file descriptor. The upgrade path,
 * if these ever need to survive Vercel's retention or trigger an alert, is a
 * drain configured in the dashboard -- not different code here.
 *
 * ONE LINE OF JSON, NOT PROSE. A log nobody can query is a log nobody reads:
 * "unusual traffic" means counting events by `kind` and `userId` over a
 * window, and that is a `WHERE` clause against structured fields or it is
 * grep. The `[security]` prefix is the one concession to human reading.
 *
 * WHAT MUST NEVER GO IN ONE, and this is the part that makes the difference
 * between a security log and an incident:
 *
 *   NO TOKENS, no `Authorization` header, no session id. A log drain is a
 *   second place a credential can leak from, and it is the one place people
 *   forget to secure because it is "just logs".
 *   NO PASSWORDS, obviously, and no EMAIL ADDRESSES. An email is the identifier
 *   an attacker is usually trying to confirm; logging "auth.failed for
 *   gabe@example.com" turns a log drain into a user-enumeration oracle. The
 *   user id is a UUID, is meaningless outside the database, and is what a
 *   query actually needs.
 *   NO REQUEST BODIES. They hold CV text and job descriptions.
 *
 * IP ADDRESSES ARE ACCEPTED BUT NOT REQUIRED, and callers pass them only for
 * the events where "which client" is the question being asked. An IP is
 * personal data under GDPR; docs/SECURITY.md is the place that decision is
 * recorded if it is ever taken further.
 *
 * IT NEVER THROWS. A logger that can fail is a route that can 500 because it
 * tried to write a log line, which would make this file the outage rather than
 * the record of one.
 */

/**
 * What happened. A closed set, because the point of the field is to be
 * grouped by.
 *
 *   auth.rejected      a request arrived without a valid bearer token. The
 *                      ordinary "signed out" case as well as a forged one --
 *                      they are indistinguishable from here, which is why the
 *                      interesting signal is the RATE rather than the event.
 *   auth.unavailable   Supabase could not be reached to verify a token, so the
 *                      route failed closed. Worth separating: a spike here is
 *                      an outage, not an attack.
 *   rate.limited       a per-user throttle refused a request. THE `unusual
 *                      traffic` SIGNAL: one of these is a rage-click, a
 *                      hundred is a loop or a script.
 *   request.rejected   input failed validation at the boundary -- an SSRF-gated
 *                      URL, a body that is not JSON, a payload over the cap.
 *   request.failed     the route reached an upstream and the upstream failed.
 *   config.missing     the deployment is missing a binding or a key. Not an
 *                      attack and logged anyway: it is the difference between
 *                      "broken for everyone" and "refused this caller".
 */
export type SecurityEventKind =
  | 'auth.rejected'
  | 'auth.unavailable'
  | 'rate.limited'
  | 'request.rejected'
  | 'request.failed'
  | 'config.missing'

export interface SecurityEvent {
  kind: SecurityEventKind
  /** The route, as a path. Never the full URL: a query string carries ids. */
  route: string
  /** The signed-in user's UUID, when one was established. Never an email. */
  userId?: string
  /** A short, non-sensitive reason. Never an upstream error body. */
  reason?: string
  /** HTTP status the caller was given. */
  status?: number
}

export function logSecurityEvent(event: SecurityEvent): void {
  try {
    const line = JSON.stringify({
      // A fixed, greppable prefix INSIDE the object as well as outside it, so
      // a drain that splits on whitespace and a human reading the console both
      // have something to filter on.
      tag: 'security',
      at: new Date().toISOString(),
      ...event,
    })
    // `warn`, not `error`: none of these is a fault in the application, and
    // routing them to stderr's error channel would make an ordinary signed-out
    // request look like a crash in any dashboard that counts error lines.
    console.warn(`[security] ${line}`)
  } catch {
    // Serialisation cannot realistically fail on this shape, and a logger that
    // throws would turn the act of recording an event into the event.
  }
}
