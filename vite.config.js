import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ═══════════════════════════════════════════════════════════════
// PHYSIOMASTER — Vite Config with Code Splitting
// Bundle strategy:
//   Initial load:  ~300KB (core + subjective + main app)
//   Lazy chunks:   DDx, Posture, FMS, Cyriax, NKT loaded on demand
// ═══════════════════════════════════════════════════════════════

export default defineConfig({
  plugins: [react()],

  build: {
    // Increase chunk warning threshold
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // ── Manual chunk splitting ────────────────────────────
        // Each key becomes a separate JS file loaded only when needed
        manualChunks: (id) => {

          // React core — always loaded first
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/')) {
            return 'react-core'
          }

          // Lucide icons — separate chunk
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }

          // All other node_modules — vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor'
          }

          // App.jsx is one file so we use the tab-based
          // lazy loading approach (see below)
          // This catches any future split files
          if (id.includes('/src/')) {
            return 'app'
          }
        },

        // Chunk file naming with content hash for cache busting
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // Source maps for production debugging (optional — remove for smaller build)
    sourcemap: false,

    // Target modern browsers — smaller output
    target: 'es2020',

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.logs in production
        drop_console: true,
        drop_debugger: true,
        // Aggressive compression
        passes: 2,
      },
      mangle: {
        // Mangle property names for smaller bundle
        properties: false, // Keep false — mangling props breaks React
      },
      format: {
        // Remove comments
        comments: false,
      },
    },
  },

  // ── Development server ──────────────────────────────────────
  server: {
    port: 5173,
    host: true, // expose on network — useful for testing on phone
  },

  // ── Preview server (vite preview) ──────────────────────────
  preview: {
    port: 4173,
    host: true,
  },

  // ── Performance optimisations ───────────────────────────────
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
