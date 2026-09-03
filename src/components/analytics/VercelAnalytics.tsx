import Script from 'next/script'

/**
 * Vercel Web Analytics, loaded as the script rather than through
 * `@vercel/analytics`.
 *
 * WHY NOT THE PACKAGE. It cannot be installed here. Every one of its peers is
 * marked `optional: true` -- including `@sveltejs/kit`, which this project
 * does not use and never will -- and npm resolves them anyway, hitting a
 * conflict between the `vite@5` that vitest still brings and the `vite@8` that
 * SvelteKit's plugin wants. Verified on npm 11.10.1, so this is current
 * behaviour rather than an old resolver: Vercel runs `npm install` on every
 * build, which means adding the package would not merely be awkward locally,
 * it would break the deploy.
 *
 * The package's whole job is to inject this one script and to re-report on
 * client-side route changes. The script does the second part itself -- it
 * hooks the History API -- so what is lost by skipping the package is the
 * typed wrapper, not the behaviour.
 *
 * PRODUCTION ONLY. `/_vercel/insights/script.js` is served by the Vercel edge
 * and does not exist anywhere else, so loading it in `next dev` is a guaranteed
 * 404 in every developer's console. It also has to be switched on in the
 * project's Analytics tab; this tag alone collects nothing.
 *
 * IT IS COOKIELESS AND SETS NO IDENTIFIER, which is the reason it was chosen
 * over Google Analytics and the reason there is no consent banner. That is a
 * claim with legal weight, so docs/SECURITY.md and the privacy policy both
 * name it -- the policy previously said this application had NO analytics
 * vendor at all, and shipping this without changing that sentence would have
 * made the policy false.
 */
export function VercelAnalytics() {
  if (process.env.NODE_ENV !== 'production') return null

  return <Script src="/_vercel/insights/script.js" strategy="afterInteractive" defer />
}
