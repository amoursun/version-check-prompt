# Vitest 简介与使用指南

Vitest 是一个由 Vite 驱动的现代化测试框架，专注于为前端项目提供高效、灵活的单元测试和组件测试解决方案。以下从核心特性、使用场景、配置实践及最新动态等角度展开说明：

---

### 一、核心特性与优势
1. **原生 Vite 集成**  
   Vitest 直接复用 Vite 的配置（如插件、解析器），无需重复设置构建流程，显著减少配置冗余。例如，通过 `vite.config.ts` 中的 `test` 字段即可扩展测试配置。

2. **极速测试体验**  
   利用 Vite 的即时编译（ESBuild）和并发执行策略，Vitest 的测试速度比传统框架（如 Jest）快一个数量级，尤其在大型项目中优势明显。

3. **兼容 Jest 生态**  
   支持 Jest 的 API（如 `describe`、`test`、`expect`），允许无缝迁移现有 Jest 测试用例，同时提供更丰富的匹配器和快照功能。

4. **多环境支持**  
   可配置测试运行环境（如 `happy-dom` 或 `jsdom`），支持浏览器模式（需配合 Playwright 或 WebdriverIO）和 Node.js 环境，适应组件测试与端到端测试需求。

---

### 二、快速上手与配置实践
1. **安装与初始化**  
   通过包管理器安装并添加到开发依赖：
   ```bash
   npm install -D vitest
   ```
   在 `package.json` 中添加测试脚本：
   ```json
   {
     "scripts": {
       "test": "vitest",
       "coverage": "vitest run --coverage"
     }
   }
   ```

2. **配置文件示例**  
   在 `vite.config.ts` 或独立的 `vitest.config.ts` 中定义测试规则：
   ```typescript
   /// <reference types="vitest" />
   import { defineConfig } from 'vite';

   export default defineConfig({
     test: {
       environment: 'jsdom',
       include: ['**/*.spec.ts'],
       coverage: {
         reporter: ['text', 'html']
       }
     }
   });
   ```

3. **编写测试用例**  
   示例测试组件（以 Vue 为例）：
   ```typescript
   import { mount } from '@vue/test-utils';
   import Notification from './Notification.vue';

   test('显示成功通知', () => {
     const wrapper = mount(Notification, {
       props: { type: 'success', message: '操作成功' }
     });
     expect(wrapper.find('.notification--success').exists()).toBe(true);
   });
   ```

---

### 三、高级功能与最新动态（Vitest 3.0）
1. **内联工作区（Inline Workspace）**  
   无需单独配置文件，直接在 `vitest.config.ts` 中定义多项目测试环境，提升单仓库（Monorepo）管理效率：
   ```typescript
   export default defineConfig({
     test: {
       workspace: ['packages/*', 'tests/*/vitest.config.ts']
     }
   });
   ```

2. **多浏览器并行测试**  
   支持通过 `browser.instances` 配置不同浏览器实例（如 Chromium 和 Firefox），优化跨平台兼容性测试。

3. **按行号过滤测试**  
   新增命令行过滤功能，快速定位特定位置的测试用例：
   ```bash
   vitest src/component.spec.ts:10
   ```

4. **覆盖率与调试增强**  
   集成 `@vitest/coverage-v8` 插件，支持更精准的代码覆盖率分析；VS Code 插件提供实时调试和测试结果可视化。

---

### 四、适用场景与工具对比
- **适用场景**：  
  - Vite 项目首选测试框架，尤其适合 Vue/React 组件库、工具库等。  
  - 需要快速执行单元测试或集成测试的现代前端项目。

- **与 Jest 对比**：  
  | 特性                | Vitest               | Jest                 |
  |---------------------|----------------------|----------------------|
  | 构建工具            | Vite（ESM 优先）     | Babel（需额外配置）  |
  | 速度                | 更快（并发 + 缓存） | 较慢                 |
  | 配置复杂度          | 低（复用 Vite）      | 高                   |
  | 浏览器测试          | 原生支持             | 需第三方库           |

---

### 五、资源与扩展
- **官方文档**：[cn.vitest.dev](https://cn.vitest.dev/)  
- **VS Code 插件**：提供测试运行、调试和覆盖率展示功能。  
- **社区生态**：支持与 Testing Library、Cypress 等工具集成，扩展测试场景。

如需深入特定功能（如快照测试、Mock 数据），可参考官方示例或结合项目需求进一步探索。

# `vitest.setup.ts` 配置与使用指南
关于 **`vitest.setup.ts`** 的配置与使用，以下是结合 Vitest 测试框架的实践总结与关键步骤：

---

### 一、`setup.ts` 的核心作用
`vitest.setup.ts`（或 `setupTests.ts`）是 Vitest 的全局初始化文件，用于在**每个测试文件执行前**加载公共配置或依赖，例如：
1. **扩展断言库**（如 `@testing-library/jest-dom` 的 DOM 断言方法）。
2. **配置模拟环境**（如 `jsdom` 用于浏览器环境模拟）。
3. **初始化全局 Mock 服务**（如 MSW 的网络请求拦截）。

---

### 二、配置 `setup.ts` 的步骤
#### 1. **创建文件并定义初始化逻辑**
在项目根目录的 `src` 或 `test` 目录下创建文件（如 `src/setupTests.ts`），内容示例如下：
```typescript
// 引入 Jest DOM 的断言扩展
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// 扩展 Vitest 的 expect 方法
expect.extend(matchers);

// 其他全局初始化逻辑（如配置全局变量、加载 Polyfill）
if (typeof window !== 'undefined') {
  // 浏览器环境下的初始化代码
}
```

#### 2. **在 Vitest 配置中关联文件**
修改 `vite.config.ts` 或 `vitest.config.ts`，通过 `test.setupFiles` 指定路径：
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    setupFiles: [
      path.resolve(__dirname, 'src/setupTests.ts') // 文件路径需根据项目调整
    ],
    environment: 'jsdom', // 模拟浏览器环境
    globals: true         // 全局注入测试 API（如 describe、it）
  }
});
```


---

### 三、典型场景与示例
#### 场景 1：集成 MSW（Mock Service Worker）
在 `setup.ts` 中启动 Mock 服务，拦截网络请求：
```typescript
// src/setupTests.ts
import { setupServer } from 'msw/node';
import { handlers } from './test/mocks/handlers';

const server = setupServer(...handlers);

// 所有测试前启动 Mock 服务
beforeAll(() => server.listen());
// 每个测试后重置 Mock 处理器
afterEach(() => server.resetHandlers());
// 所有测试后关闭服务
afterAll(() => server.close());
```
在 `vitest.config.ts` 中确保 `setupFiles` 引入该文件。

#### 场景 2：配置 React 测试环境
结合 `@testing-library/react`，在 `setup.ts` 中加载全局样式或组件库：
```typescript
// 引入全局 CSS 或 UI 库样式
import '@testing-library/jest-dom/vitest';
import './styles/global.css';
```

---

### 四、常见问题与解决
#### 问题 1：TypeScript 类型报错
若出现断言类型错误（如 `toHaveTextContent` 未定义），需在 `tsconfig.json` 中添加类型声明：
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```


#### 问题 2：环境变量未生效
确保 `vitest.config.ts` 中 `environment` 设置为 `jsdom`，并在 `setup.ts` 中正确处理浏览器 API 的模拟。

---

### 五、最佳实践
1. **模块化拆分**：将不同功能的初始化逻辑拆分到多个 `setup` 文件（如 `setupDom.ts`、`setupMocks.ts`），通过数组加载。
2. **与 Vite 配置复用**：通过 `mergeConfig` 复用 Vite 的基础配置，避免重复。
3. **版本兼容性**：Vitest 3.0+ 需使用 `/// <reference types="vitest/config" />` 替代旧版类型引用。

---

通过合理配置 `setup.ts`，可显著提升测试代码的复用性与环境一致性。具体实现需结合项目框架（如 React、Vue）调整细节，参考官方文档 。