import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Maps '@' to the 'src' directory for cleaner imports
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api requests to the FastAPI backend during local development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Critical for Server-Sent Events (SSE) / Streaming responses
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Accept', 'text/event-stream');
          });
        },
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disabled for production to minimize bundle size
    rollupOptions: {
      output: {
        // Manual chunking to optimize browser caching
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react'],
          query: ['@tanstack/react-query', 'axios'],
        },
      },
    },
  },
});