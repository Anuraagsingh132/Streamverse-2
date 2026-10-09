import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('motion')) {
              return 'vendor-motion';
            }
            if (id.includes('lenis')) {
              return 'vendor-lenis';
            }
            if (id.includes('hls.js')) {
              return 'vendor-player';
            }
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api/anime/logo': {
        target: 'https://cinemaos.tech',
        changeOrigin: true,
        secure: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://cinemaos.tech/anime'
        }
      },
      '^/api/pixeldrain-cdn': {
        target: 'https://pixeldrain.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/pixeldrain-cdn/, '/api/file').replace(/\?download$/, ''),
        headers: {
          'Referer': '',
          'Origin': '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      '^/api/pixeldrain': {
        target: 'https://pixeldrain.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/pixeldrain/, '/api/file').replace(/\?download$/, ''),
        headers: {
          'Referer': '',
          'Origin': '',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    }
  }
})
