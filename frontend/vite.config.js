import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@hirelense': path.resolve(__dirname, '../modules/Hirelens/hirelense/frontend/src')
    }
  },
  server: {
    port: 5173,
    host: true,
    fs: {
      // Allow serving files from one level up to support root modules directory
      allow: ['..']
    }
  }
})
