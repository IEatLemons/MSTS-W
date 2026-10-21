import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFile } from 'node:fs/promises'
import { resolve,sep,extname } from 'node:path'

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    {
      name:'sealed-version-files',
      configureServer(server){
        const root=resolve(new URL('../releases/',import.meta.url).pathname)
        server.middlewares.use('/releases',async(req,res,next)=>{
          try{
            const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
            const file=resolve(root,'.'+relative)
            if(!file.startsWith(root+sep))return next()
            const bytes=await readFile(file)
            res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.png':'image/png','.zip':'application/zip','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})[extname(file)]||'application/octet-stream')
            res.end(bytes)
          }catch{next()}
        })
      },
    },
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
    chunkSizeWarningLimit: 1400,
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
