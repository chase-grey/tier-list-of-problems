import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use environment variable for base URL, with fallback for production
  base: process.env.VITE_BASE_URL || (process.env.NODE_ENV === 'production' ? '/tier-list-of-problems/' : '/'),
  resolve: {
    alias: {
      '/src': '/src', // Map absolute paths to relative paths
    },
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './index.html',
        test: './test.html'
      }
    }
  }
})
