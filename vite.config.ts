import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base URL specifically for cgrey's GitLab Pages deployment
  base: '/tier-list-of-problems/',
  build: {
    outDir: 'build',
  }
})
