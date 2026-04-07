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
  build: {
    // Use simple predictable filenames without content hashes
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/chunk.js',
        assetFileNames: 'assets/app.[ext]',
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: 'all',
  },
})