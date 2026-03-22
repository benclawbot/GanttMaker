import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      '@context': '/src/context',
      '@components': '/src/components',
      '@hooks': '/src/hooks',
      '@modules': '/src/modules',
      '@services': '/src/services',
      '@utils': '/src/utils',
      '@types': '/src/types',
      '@styles': '/src/styles',
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})