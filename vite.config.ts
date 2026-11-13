import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative paths so the built site works at any URL, including GitHub Pages'
  // https://<user>.github.io/praise-play/ subfolder.
  base: './',
  plugins: [react()],
})
