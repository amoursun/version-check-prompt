## Rslib
- 官方链接: https://lib.rsbuild.dev/zh/guide/solution/nodejs
- https://lib.rsbuild.dev/zh/guide/basic/typescript
- https://lib.rsbuild.dev/zh/config/lib/format

avaScript/TypeScript 库开发工具 Rslib，由 web-infra-dev 团队开发，基于 Rsbuild 的库开发工具链，专注于简化 JavaScript/TypeScript 库的构建与发布流程。

核心功能：
- 多语言编译支持 支持 TypeScript、JSX、Sass 等语言，内置 CSS Modules 和 Wasm 编译，适合现代前端库开发。
- 灵活构建模式
  - Bundle 模式：生成压缩的单一文件，适用于浏览器环境。
  - Bundleless 模式：保留原始文件结构，适用于 Node.js 或 ESM 模块系统。
- 多格式输出 支持 ESM、CJS、UMD 输出，兼容不同模块化标准，并通过 isolatedDeclarations 生成独立的类型声明文件。
- 高级扩展 集成 Module Federation（微前端支持）、PostCSS 处理、Lightning CSS 压缩等特性。
  
适用场景：
- 开发跨平台的前端工具库或组件库。
- 需要快速搭建包含文档、测试、发布的标准化工作流。