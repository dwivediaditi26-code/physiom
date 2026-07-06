import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// FIX: public/sw.js has always contained a literal, never-substituted
// "__CACHE_VERSION__" placeholder — meaning the built service worker file
// was byte-identical on every single deploy. Browsers detect service worker
// updates by diffing the new sw.js against the currently installed one; if
// they're identical, the browser assumes there's nothing new and keeps
// running the OLD service worker indefinitely, regardless of how much the
// actual app code changed. This is why a real, deployed, verified fix could
// still appear completely absent for a user with the app already open or
// installed to their home screen — not a deployment problem, a caching one.
// This plugin substitutes a real per-build value after Vite copies sw.js
// into dist/, so the file's contents (and therefore the cache name, and the
// browser's update detection) actually change on every deploy.
function swCacheBusterPlugin() {
  return {
    name: 'sw-cache-buster',
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      if (!fs.existsSync(swPath)) return
      const version = String(Date.now())
      const content = fs.readFileSync(swPath, 'utf8').replaceAll('__CACHE_VERSION__', version)
      fs.writeFileSync(swPath, content)
    },
  }
}

export default defineConfig({
  plugins: [react(), swCacheBusterPlugin()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — tiny, loads first
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          // All other node_modules → vendor
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
          // Heavy clinical source files → separate async chunks
          if (id.includes('SubjectiveObjective')) return 'chunk-subjective';
          if (id.includes('ClinicalModules'))    return 'chunk-clinical';
          if (id.includes('OutcomeMeasuresPro')) return 'chunk-outcomes';
          if (id.includes('PhysioNeuro'))        return 'chunk-neuro';
          if (id.includes('BodyChartPro'))       return 'chunk-bodychart';
          if (id.includes('HybridKendall'))      return 'chunk-kendall';
          if (id.includes('vitposeEngine'))      return 'chunk-vitpose';
          if (id.includes('contourEngine'))      return 'chunk-contour';
          if (id.includes('sagittalFindings'))   return 'chunk-sagittal';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    sourcemap: false,
    target: 'es2020',
    minify: 'esbuild',
  },
  server: {
    port: 5173,
    host: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setupTests.js'],
    globals: true,
    css: false,
    // e2e/ holds real-browser Playwright specs (different test runner,
    // different globals) -- Vitest must never try to collect these.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
})
