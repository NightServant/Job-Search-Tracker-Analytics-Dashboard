/**
 * A passthrough, and it exists for one reason: so /login and /signup do NOT
 * inherit (app)/layout.tsx's auth guard.
 *
 * That guard redirects a signed-out visitor to /login. Under it, /login would
 * redirect a signed-out visitor to /login -- forever -- and /signup would be
 * unreachable by exactly the people who need it.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg-canvas">{children}</div>
}
