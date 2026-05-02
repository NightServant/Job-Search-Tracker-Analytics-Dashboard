import * as Sentry from '@sentry/react'

export function initSentry(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN ?? '').trim()
  if (!dsn) return

  const environment =
    (import.meta.env.VITE_SENTRY_ENVIRONMENT ?? '').trim() || import.meta.env.MODE

  Sentry.init({
    dsn,
    environment,
    release: `job-search-tracker@${__APP_VERSION__}`,
  })
}
