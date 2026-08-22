import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// Removed optional build-only plugins (compression / imagemin) for local build reliability.

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  process.env.COMMIT_SHA ??
  process.env.COMMIT_REF ??
  'dev'

const buildTime = new Date().toISOString()

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_SHA__: JSON.stringify(commitSha),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
