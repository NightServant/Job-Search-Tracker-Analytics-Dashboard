type MonitoringLevel = 'info' | 'warning' | 'error'

export interface MonitoringEvent {
  functionName: string
  requestId: string
  event: 'invocation' | 'success' | 'error' | 'throttle' | 'slow'
  level: MonitoringLevel
  latencyMs?: number
  status?: number
  callerKey?: string
  dbConnections?: number
  retryAfterSeconds?: number
  message?: string
  extra?: Record<string, unknown>
}

export interface ThrottleConfig {
  limit: number
  windowMs: number
}

export interface ThrottleDecision {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

interface ThrottleState {
  count: number
  windowStart: number
}

const throttleBuckets = new Map<string, ThrottleState>()
const SLOW_REQUEST_THRESHOLD_MS = 3000

function normalizeHeaderValue(value: string | null): string {
  return (value ?? '').trim()
}

function getForwardedIp(request: Request): string {
  const headers = request.headers
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-forwarded-for'),
    headers.get('x-real-ip'),
  ]

  for (const candidate of candidates) {
    const normalized = normalizeHeaderValue(candidate)
    if (!normalized) continue

    const ip = normalized.split(',')[0]?.trim() ?? ''
    if (ip) return ip
  }

  return 'unknown'
}

function getBearerToken(request: Request): string {
  const authorization = normalizeHeaderValue(request.headers.get('authorization'))
  if (!authorization.toLowerCase().startsWith('bearer ')) return ''

  return authorization.slice(7).trim().slice(0, 48)
}

export function getRequestIdentity(request: Request): string {
  const bearerToken = getBearerToken(request)
  if (bearerToken) return `auth:${bearerToken}`

  return `ip:${getForwardedIp(request)}`
}

export function createRequestId(functionName: string): string {
  return `${functionName}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function evaluateThrottle(
  existing: ThrottleState | undefined,
  now: number,
  config: ThrottleConfig,
): { state: ThrottleState; decision: ThrottleDecision } {
  const windowStart = existing && now - existing.windowStart < config.windowMs ? existing.windowStart : now
  const nextCount = existing && now - existing.windowStart < config.windowMs ? existing.count + 1 : 1
  const remaining = Math.max(config.limit - nextCount, 0)
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + config.windowMs - now) / 1000))

  return {
    state: {
      count: nextCount,
      windowStart,
    },
    decision: {
      allowed: nextCount <= config.limit,
      remaining,
      retryAfterSeconds,
    },
  }
}

export function takeThrottleSlot(
  key: string,
  config: ThrottleConfig,
  now = Date.now(),
): ThrottleDecision {
  if (throttleBuckets.size > 1000) {
    for (const [bucketKey, bucketState] of throttleBuckets.entries()) {
      if (now - bucketState.windowStart > config.windowMs * 2) {
        throttleBuckets.delete(bucketKey)
      }
    }
  }

  const current = throttleBuckets.get(key)
  const { state, decision } = evaluateThrottle(current, now, config)
  throttleBuckets.set(key, state)
  return decision
}

function getSentryDsn(): string {
  return (
    Deno.env.get('EDGE_SENTRY_DSN') ||
    Deno.env.get('SENTRY_DSN') ||
    Deno.env.get('SUPABASE_EDGE_SENTRY_DSN') ||
    ''
  ).trim()
}

function getEnvironmentName(): string {
  return (
    Deno.env.get('EDGE_SENTRY_ENVIRONMENT') ||
    Deno.env.get('SENTRY_ENVIRONMENT') ||
    Deno.env.get('SUPABASE_ENVIRONMENT') ||
    Deno.env.get('NODE_ENV') ||
    'production'
  ).trim()
}

async function sendSentryEnvelope(event: MonitoringEvent): Promise<void> {
  const dsn = getSentryDsn()
  if (!dsn) return

  try {
    const parsed = new URL(dsn)
    const projectId = parsed.pathname.replace(/^\//, '')
    if (!projectId) return

    const envelopeUrl = `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`
    const eventId = crypto.randomUUID().replace(/-/g, '')
    const payload = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      environment: getEnvironmentName(),
      level: event.level,
      logger: 'edge-monitoring',
      transaction: event.functionName,
      message: `${event.functionName}:${event.event}`,
      tags: {
        function: event.functionName,
        requestId: event.requestId,
        event: event.event,
        ...(event.status ? { status: String(event.status) } : {}),
      },
      extra: {
        latencyMs: event.latencyMs,
        dbConnections: event.dbConnections,
        callerKey: event.callerKey,
        retryAfterSeconds: event.retryAfterSeconds,
        message: event.message,
        ...(event.extra || {}),
      },
    }

    const envelopeHeader = {
      event_id: eventId,
      sent_at: new Date().toISOString(),
      dsn,
    }

    const itemHeader = {
      type: 'event',
      content_type: 'application/json',
    }

    await fetch(envelopeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: `${JSON.stringify(envelopeHeader)}\n${JSON.stringify(itemHeader)}\n${JSON.stringify(payload)}`,
    })
  } catch {
    // Monitoring must never block the request path.
  }
}

export function emitMonitoringEvent(event: MonitoringEvent): void {
  const payload = {
    kind: 'edge_metric',
    timestamp: new Date().toISOString(),
    ...event,
  }

  console.log(JSON.stringify(payload))

  if (event.event === 'error' || event.event === 'throttle' || event.event === 'slow') {
    void sendSentryEnvelope(event)
  }
}

export function buildInvocationEvent(params: {
  functionName: string
  requestId: string
  callerKey?: string
  dbConnections?: number
}): MonitoringEvent {
  return {
    functionName: params.functionName,
    requestId: params.requestId,
    event: 'invocation',
    level: 'info',
    callerKey: params.callerKey,
    dbConnections: params.dbConnections,
  }
}

export function buildCompletionEvent(params: {
  functionName: string
  requestId: string
  status: number
  latencyMs: number
  callerKey?: string
  dbConnections?: number
  message?: string
  extra?: Record<string, unknown>
}): MonitoringEvent {
  const isSlow = params.latencyMs >= SLOW_REQUEST_THRESHOLD_MS
  return {
    functionName: params.functionName,
    requestId: params.requestId,
    event: isSlow ? 'slow' : 'success',
    level: isSlow ? 'warning' : 'info',
    status: params.status,
    latencyMs: params.latencyMs,
    callerKey: params.callerKey,
    dbConnections: params.dbConnections,
    message: params.message,
    extra: params.extra,
  }
}

export function buildErrorEvent(params: {
  functionName: string
  requestId: string
  status: number
  latencyMs: number
  callerKey?: string
  dbConnections?: number
  message: string
  extra?: Record<string, unknown>
}): MonitoringEvent {
  return {
    functionName: params.functionName,
    requestId: params.requestId,
    event: 'error',
    level: 'error',
    status: params.status,
    latencyMs: params.latencyMs,
    callerKey: params.callerKey,
    dbConnections: params.dbConnections,
    message: params.message,
    extra: params.extra,
  }
}

export function buildThrottleEvent(params: {
  functionName: string
  requestId: string
  callerKey?: string
  retryAfterSeconds: number
  dbConnections?: number
  message?: string
}): MonitoringEvent {
  return {
    functionName: params.functionName,
    requestId: params.requestId,
    event: 'throttle',
    level: 'warning',
    callerKey: params.callerKey,
    dbConnections: params.dbConnections,
    retryAfterSeconds: params.retryAfterSeconds,
    message: params.message,
  }
}
