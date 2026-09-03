'use client'

import { toast } from 'sonner'

/**
 * What every write affordance in /demo/* does instead of writing.
 *
 * The demo has no session, no database connection and no write path -- the
 * data is a fixture in the repository. But the screens are the REAL screens,
 * and their write controls (New application, import CSV, delete) render
 * unconditionally rather than being gated on a handler being passed. So they
 * cannot be made to disappear without changing the shared components, which
 * would be changing the actual app to suit the demo.
 *
 * They therefore explain themselves. Silence would read as a bug -- a button
 * that does nothing is indistinguishable from a broken one, and this demo's
 * whole job is to make the product look like it works.
 */
const MESSAGE = 'This is the demo. Create an account to keep your own applications.'

export function demoReadOnly(): void {
  toast('Nothing is saved here', { description: MESSAGE })
}

/** For the handlers whose contract is `Promise<boolean>` -- false means "not saved". */
export async function demoReadOnlyAsync(): Promise<boolean> {
  demoReadOnly()
  return false
}
