// 引入 Jest DOM 的断言扩展
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// 扩展 Vitest 的 expect 方法
expect.extend(matchers);

// 其他全局初始化逻辑（如配置全局变量、加载 Polyfill）
if (typeof window !== 'undefined') {
  // 浏览器环境下的初始化代码
}