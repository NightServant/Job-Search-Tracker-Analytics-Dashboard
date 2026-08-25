import { defineConfig } from 'vitest/config'
import path from 'path'

// Integration tests talk to the real Supabase project as an authenticated user,
// so they run in node (no jsdom), serially (shared rows), and only on demand.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    env: { ...process.env } as Record<string, string>,
  },
})
