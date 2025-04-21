// 引入 Jest DOM 的断言扩展
import * as matchers from '@testing-library/jest-dom/matchers';
import { afterAll, beforeAll, expect, vi } from 'vitest';

// 扩展 Vitest 的 expect 方法
expect.extend(matchers);

// 其他全局初始化逻辑（如配置全局变量、加载 Polyfill）
if (typeof window !== 'undefined') {
  // 浏览器环境下的初始化代码
  window.URL.createObjectURL = vi.fn();
}

beforeAll(() => {
  // 测试套件开始前执行（如启动 mock 服务）
});

afterAll(() => {
  // 测试套件结束后执行（如关闭数据库连接）
});