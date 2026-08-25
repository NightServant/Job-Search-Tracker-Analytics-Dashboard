import * as Sentry from '@sentry/react'
import { runtimeFlags } from './env'

export function initSentry(): void {
  const dsn = runtimeFlags.sentryDsn
  if (!dsn) return

  const environment =
    runtimeFlags.sentryEnvironment || runtimeFlags.mode

  Sentry.init({
    dsn,
    environment,
    release: `job-search-tracker@${runtimeFlags.appVersion}`,
  })
}
