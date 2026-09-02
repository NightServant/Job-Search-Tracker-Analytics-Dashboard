import { redirect } from 'next/navigation'

/** /demo has no content of its own; the overview is the demo's front door. */
export default function Page() {
  redirect('/demo/dashboard')
}
