import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // Vite injected __APP_VERSION__ via `define`. Next has no equivalent global,
    // so the same value is published as a normal public variable and read
    // through src/lib/env.ts like everything else.
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '0.0.0',
    // Vercel exposes the commit as VERCEL_GIT_COMMIT_SHA; locally there is none.
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  // The Vite app still lives in src/ and must not be swept into the Next build.
  pageExtensions: ['tsx', 'ts'],
  /**
   * `docx` is required at runtime, never bundled.
   *
   * Bundling it BROKE THE BUILD, and not in a way that named itself: with
   * /api/cv/docx present, `next build` failed at "Collecting page data" with
   * `Cannot find module for page: /_not-found` and `/gallery` -- two pages
   * that have nothing to do with Word export -- and a MODULE_NOT_FOUND deep
   * inside `.next/server/webpack-runtime.js`. Removing that one route made it
   * pass, which is how it was traced. `docx` pulls jszip and a pile of Node
   * built-ins; webpack tripped over them and corrupted the shared runtime
   * chunk the other pages resolve through.
   *
   * Listing it here tells Next to `require()` it from node_modules at request
   * time instead, which is correct for a server-only library anyway -- it is
   * ~2MB of zip machinery no client should ever receive.
   */
  serverExternalPackages: ['docx'],
  /**
   * THE MIDDLEWARE RUNS ON NODE, AND THIS FLAG IS WHAT MAKES THAT REAL.
   *
   * vercel.json declares `services` -- `web` (this app) bound to `extractor`
   * (the FastAPI scraper in scraper/). Services do not support the Edge
   * runtime, and Next compiles middleware to an Edge Function by default, so
   * the first deploy of src/middleware.ts failed the build outright:
   *
   *   Edge Runtime is not supported in services. Service "web" produced Edge
   *   Function output "src/middleware".
   *
   * `runtime: 'nodejs'` in the middleware's own config is the other half. ON
   * ITS OWN IT IS WORSE THAN USELESS: without this flag Next 15.5 accepts the
   * export, builds successfully, and SILENTLY EMITS NO MIDDLEWARE AT ALL --
   * the `ƒ Middleware` line disappears from the build summary and the auth
   * gate ceases to exist. A green build that quietly removes the thing
   * standing in front of every private route is the worst shape a failure can
   * take, so neither half of this may be removed without the other.
   *
   * NEXT 15.5.23 WARNS "Unrecognized key(s) in object: 'nodeMiddleware'" AND
   * HONOURS IT ANYWAY -- the config schema lags the feature. The same build
   * prints "Experiments (use with caution): ✓ nodeMiddleware". Do not chase
   * that warning; it is noise, and the behaviour is verified below.
   *
   * DO NOT TRUST middleware-manifest.json TO CONFIRM ANY OF THIS. For node
   * middleware it stays `{"middleware":{},"sortedMiddleware":[]}` even when
   * the middleware is present and running. The only honest check is a request:
   * `next start`, then GET /dashboard signed out and expect 307 -> /login.
   *
   * This is also the direction Vercel recommends independently of the services
   * constraint -- Edge is no longer the preferred runtime, and Node middleware
   * runs in the same regions.
   */
  experimental: {
    nodeMiddleware: true,
  },
  eslint: {
    // The repo already lints via `npm run lint` with its own config. Next bundles
    // a stricter one that fails the build on pre-existing `any` usages across
    // M1/M2 service code. Adopting it here would mean rewriting working code for
    // no migration benefit, and would hide a real regression behind noise.
    // Lint remains a separate gate; revisit when M5 rewrites those files anyway.
    ignoreDuringBuilds: true,
  },
  // The Applications screen moved from /jobs to /applications in M5; the old
  // URL is live in production (bookmarks, shared links), so it redirects
  // rather than 404ing.
  async redirects() {
    return [{ source: '/jobs', destination: '/applications', permanent: true }]
  },
}

export default nextConfig
