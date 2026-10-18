import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
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
