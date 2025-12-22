import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Для GitHub Pages используйте имя вашего репозитория
  // Если репозиторий называется "neuro-oil", base будет "/neuro-oil/"
  // Для локальной разработки base будет "/"
  base: process.env.GITHUB_PAGES 
    ? (process.env.GITHUB_REPOSITORY 
        ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` 
        : '/neuro-oil/')
    : '/',
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})








