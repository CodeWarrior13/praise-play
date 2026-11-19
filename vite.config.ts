import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serves seasonal/christmas.json as /christmas.json. The game only fetches it
 * when Christmas mode is switched on (see src/lib/seasonal.ts).
 */
function christmas(): Plugin {
  const file = new URL('./seasonal/christmas.json', import.meta.url)
  return {
    name: 'praise-play-christmas',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/christmas.json')) return next()
        res.setHeader('content-type', 'application/json')
        res.end(readFileSync(file))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'christmas.json', source: readFileSync(file) })
    },
  }
}

export default defineConfig({
  // Relative paths so the built site works at any URL, including GitHub Pages'
  // https://<user>.github.io/praise-play/ subfolder.
  base: './',
  plugins: [react(), christmas()],
})
