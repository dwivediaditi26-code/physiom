import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
})
