import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      '/orders': 'http://127.0.0.1:3001',
      '/orders-by-name': 'http://127.0.0.1:3001',
      '/admin/login': 'http://127.0.0.1:3001',
      '/admin/coupons': 'http://127.0.0.1:3001',
      '/admin/menu': 'http://127.0.0.1:3001',
      '/admin/reports': 'http://127.0.0.1:3001',
      '/admin/happy-hour': 'http://127.0.0.1:3001',
      '/happy-hour': 'http://127.0.0.1:3001',
      '/coupons': 'http://127.0.0.1:3001',
    },
  },
})
