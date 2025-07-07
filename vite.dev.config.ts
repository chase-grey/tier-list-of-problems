import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Development-specific configuration
export default defineConfig({
  plugins: [react()],
  // Force root path for development
  base: '/',
  build: {
    outDir: 'build',
  },
  // Use the development HTML file
  server: {
    open: true, // Automatically open browser
    fs: {
      // Allow serving files from one level up the project root - helps with path issues
      allow: ['..'],
    },
  },
  // Override the default HTML file
  resolve: {
    alias: {
      '/@fs/': '/',
    },
  },
  // Specify custom entry point
  optimizeDeps: {
    entries: ['./src/main.tsx'],
  },
})
