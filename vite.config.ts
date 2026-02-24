/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/ebook-reader/' : '/',
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
      modernTargets: ['chrome>=87', 'firefox>=78', 'safari>=14', 'edge>=88'],
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
