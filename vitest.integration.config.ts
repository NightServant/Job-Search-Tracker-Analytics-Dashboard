import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'

// Integration tests talk to the real Supabase project as an authenticated user,
// so they run in node (no jsdom), serially (shared rows), and only on demand.
export default defineConfig(({ mode }) => {
  // '' prefix loads every key, not just VITE_*, so the test credentials in .env
  // reach process.env. They are never bundled — this config is test-only.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.integration.test.ts'],
      fileParallelism: false,
      testTimeout: 20000,
      env,
    },
  }
})
