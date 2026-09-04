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
