import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    // Vite injected __APP_VERSION__ via `define`. Next has no equivalent global,
    // so the same value is published as a normal public variable and read
    // through src/lib/env.ts like everything else.
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '0.0.0',
  },
  // The Vite app still lives in src/ and must not be swept into the Next build.
  pageExtensions: ['tsx', 'ts'],
  eslint: {
    // The repo already lints via `npm run lint` with its own config. Next bundles
    // a stricter one that fails the build on pre-existing `any` usages across
    // M1/M2 service code. Adopting it here would mean rewriting working code for
    // no migration benefit, and would hide a real regression behind noise.
    // Lint remains a separate gate; revisit when M5 rewrites those files anyway.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
