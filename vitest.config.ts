import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Configure Vitest (https://vitest.dev/config/)
  test: {
    setupFiles: [
      path.resolve(__dirname, 'vitest.setup.ts') // 文件路径需根据项目调整
    ],
    environment: 'jsdom', // 模拟浏览器环境
    globals: true         // 全局注入测试 API（如 describe、it）
  }
});
