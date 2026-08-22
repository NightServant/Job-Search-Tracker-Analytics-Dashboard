import type { ReactNode } from 'react'
import * as Sentry from '@sentry/react'
import ErrorFallback from './ErrorFallback'

export default function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={(props) => <ErrorFallback {...props} />}
      onError={(error) => {
        if (!import.meta.env.PROD) {
          console.error(error)
        }
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
