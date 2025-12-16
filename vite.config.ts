import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/ui"),
    },
  },
  base: './',
  build: {
    outDir: 'dist-react',
    chunkSizeWarningLimit: 1000, // Increased for Electron apps (default is 500)
  },
  server: {
    port: 5123,
    strictPort: true,
  },
})
