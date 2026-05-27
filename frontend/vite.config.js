import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@monaco-editor/react') || id.includes('monaco-editor')) {
            return 'monaco';
          }
          if (id.includes('recharts')) {
            return 'charts';
          }
          if (id.includes('framer-motion')) {
            return 'motion';
          }
        }
      }
    }
  }
})
