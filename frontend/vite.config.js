import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-force-graph-2d'],
  },
  build: {
    rollupOptions: {
      // Treat AFRAME as an external global so Rollup never tries to resolve it.
      // This is a safety net in case any transitive import still references it.
      external: ['aframe'],
    },
  },
})
