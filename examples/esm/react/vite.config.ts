import { URL, fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import etag from 'etag';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'add-etag',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // if (req.url?.endsWith('.html')) {
          //   res.setHeader('Cache-Control', 'no-cache');
          //   res.setHeader('ETag', etag(Date.now().toString()));
          // }
          if (req.url === '/' || req.url === '/index.html') {
            const originalEnd = res.end;
            // 覆盖 res.end 方法以生成 ETag
            // @ts-ignore
            res.end = function (data) {
              // 生成 ETag（基于内容哈希）
              const hash = etag(data);
              res.setHeader('ETag', hash);
              originalEnd.call(this, data);
            };
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2015',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
