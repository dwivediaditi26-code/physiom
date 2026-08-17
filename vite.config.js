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
          // Real incident (PhysioFeed integration, this session): splitting
          // react/react-dom into their own 'react-core' chunk, separate from
          // a 'vendor' chunk holding all other node_modules, worked fine
          // until react-router-dom was added -- it needs React internals at
          // module-evaluation time in a way that made Rollup's own chunk
          // graph genuinely circular (vendor -> react-core -> vendor, real
          // build warning: "Circular chunk"). Circular ES module chunks can
          // load fine in dev but fail hard in production -- a live binding
          // gets read before the other chunk has finished initializing,
          // producing a silent, uncaught error with no visible message: a
          // fully blank white page in the built app, nothing broken in
          // tests or `vite build` succeeding (both run differently from a
          // real browser loading real <script type="module"> chunks in
          // this exact order). All node_modules now share one chunk so the
          // circularity can't exist by construction -- confirmed no
          // "Circular chunk" warning on rebuild after this change.
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
          // Small, pure cross-file data/constants -- own tiny chunk so importing
          // even one small constant from here never drags in a heavy UI chunk.
          if (id.includes('sharedClinicalData')) return 'chunk-shareddata';
          // NOTE: SubjectiveObjective.jsx, ClinicalModules.jsx, OutcomeMeasuresPro.jsx,
          // PhysioNeuro.jsx, BodyChartPro.jsx, HybridKendall.jsx, vitposeEngine,
          // contourEngine, sagittalFindings used to each get a fixed, named chunk here.
          // Real, measured discovery: when a manualChunks callback assigns a *name*
          // to a module that's ONLY ever reached via React.lazy()/dynamic import()
          // from multiple different call sites, Rollup hoists that named chunk into
          // a *static* import of the entry bundle -- completely defeating every
          // lazy() wrapper pointing at it, regardless of how many "chunk-clinical is
          // 530KB in its own file" numbers looked reassuring. Confirmed by diffing
          // the actual entry bundle's own top-of-file `import` statements before and
          // after removing one manual pin: chunk-subjective vanished from the entry's
          // static imports and from the initial modulepreload list entirely once
          // Rollup was left to name/place it itself. Removing these fixed names and
          // letting Rollup's own chunking algorithm decide is the actual fix; it
          // still produces per-file-ish chunks in practice (since these files are
          // each only reachable from their own lazy_*.jsx wrapper), it just won't
          // force them eager anymore. Files that DO have genuine remaining eager
          // static importers (checked separately) will still legitimately end up
          // wherever Rollup's default heuristic puts eager code -- that's correct,
          // not a bug, and is addressed by removing those real static imports
          // instead of fighting the chunk-naming mechanism.
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
