import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Configure Vitest (https://vitest.dev/config/)
  test: {
    // runner: 'Vitest', // 指定测试框架
    // include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      enabled: true,
      reporter: ['text', 'html', 'json'], // 输出文本和 HTML 报告
      exclude: [], // 排除第三方代码
    },
    setupFiles: [
      path.resolve(__dirname, 'vitest.setup.ts') // 文件路径需根据项目调整
    ],
    environment: 'jsdom', // 模拟浏览器环境  或 'happy-dom'
    globals: true         // 全局注入测试 API（如 describe、it）
  }
});
