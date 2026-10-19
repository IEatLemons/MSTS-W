import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFile } from 'node:fs/promises'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    {
      name: 'read-only-legacy-report',
      configureServer(server) {
        server.middlewares.use('/analysis-report.html', async (_request, response, next) => {
          try {
            response.setHeader('Content-Type', 'text/html; charset=utf-8')
            response.end(await readFile(new URL('../analysis-report.html', import.meta.url)))
          } catch (error) { next(error) }
        })
      },
    },
    {
      name: 'classic-script-for-file-open',
      apply: 'build',
      transformIndexHtml(html) {
        return html
          .replaceAll(' type="module"', '')
          .replaceAll(' crossorigin', '')
          .replaceAll(/<link rel="modulepreload"[^>]*>/g, '')
      },
    },
  ],
  build: {
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  server: { port: 5173, strictPort: true },
})
