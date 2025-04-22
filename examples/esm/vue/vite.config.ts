import { URL, fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';
import etag from 'etag';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    // {
    //   name: 'add-etag',
    //   configureServer(server) {
    //     server.middlewares.use((req, res, next) => {
    //       if (req.url === '/' || req.url === '/index.html') {
    //         const originalEnd = res.end;
    //         // 覆盖 res.end 方法以生成 ETag
    //         // @ts-ignore
    //         res.end = function (data) {
    //           // 生成 ETag（基于内容哈希）
    //           // const hash = etag(data);
    //           const value = Math.random().toString();
    //           const hash = etag(value);
    //           res.setHeader('ETag', hash);
    //           originalEnd.call(this, data);
    //         };
    //       }
    //       next();
    //     });
    //   }
    // }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: {
    format: 'es' // 默认输出 ES 模块
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
