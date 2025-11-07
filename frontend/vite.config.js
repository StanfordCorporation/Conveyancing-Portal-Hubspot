import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Unified Vite Config for Conveyancing Portal
 *
 * Serves both Client and Agent Portals from a single Vite instance
 *
 * Routes:
 * - http://localhost:3000/disclosure (Disclosure Form)
 * - http://localhost:3000/client/login (Client Portal Login)
 * - http://localhost:3000/client/dashboard (Client Dashboard)
 * - http://localhost:3000/agent/login (Agent Portal Login)
 */
export default defineConfig({
  plugins: [react()],
  root: process.cwd(),
  publicDir: 'public',
  server: {
    port: 3000,
    open: false,
    strictPort: false,
  },
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, './client-portal/src'),
      '@agent': path.resolve(__dirname, './agent-portal/src'),
    }
  },
  build: {
    outDir: 'dist',
    // Remove manualChunks - let Vite handle chunking automatically
    // This prevents React duplication issues
  },
})
