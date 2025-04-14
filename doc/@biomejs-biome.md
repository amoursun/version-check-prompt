`@biomejs/biome` 是一个一体化的前端工具链，旨在整合并取代如 ESLint、Prettier、Babel 等分散的工具，提供代码格式化、静态分析（Linting）、导入排序等功能。以下是其核心特性与使用指南：

---

### **一、核心功能与优势**
1. **一体化工具链**  
   - **代码格式化**：支持 JavaScript、TypeScript、JSX、JSON、Astro、Svelte 和 Vue（部分支持），兼容 Prettier 规则达 97%。
   - **静态分析（Linting）**：内置推荐规则集，涵盖代码风格、安全性和性能优化，支持自定义规则配置。
   - **性能优化**：相比传统工具（如 ESLint + Prettier），Biome 执行速度更快，内存占用更低，适合大型项目。

2. **跨平台与生态兼容**  
   - 支持 Node.js v14.18+，提供独立 CLI 二进制文件（无需 Node.js 环境）。
   - 集成 VSCode 插件，支持保存时自动格式化和 Linting。
   - 兼容 ESLint 配置迁移（通过 `biome migrate eslint` 命令）。

3. **灵活配置**  
   - 支持多配置文件（`biome.json` 或 `biome.jsonc`），可通过 `extends` 字段继承其他配置。
   - 可自定义忽略文件（`files.ignore`）、格式化风格（缩进、引号等）及 Linter 规则级别（`off`/`warn`/`error`）。

---

### **二、安装与配置**
1. **安装**  
   使用 npm、yarn 或 pnpm 安装（推荐精确版本锁定）：
   ```bash
   npm install --save-dev --save-exact @biomejs/biome
   ```

2. **初始化配置**  
   生成默认配置文件 `biome.json`：
   ```bash
   npx @biomejs/biome init
   ```
   示例配置：
   ```json
   {
     "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
     "linter": { "enabled": true, "rules": { "recommended": true } },
     "formatter": { "enabled": true, "indentStyle": "space" },
     "files": { "ignore": ["dist/**", "node_modules"] }
   }
   ```

3. **扩展配置**  
   - 通过 `extends` 合并多个配置文件，适用于多子项目单体库。
   - 支持从 npm 包继承配置（需在依赖包中导出 `biome.json`）。

---

### **三、典型使用场景**
1. **代码格式化**  
   ```bash
   npx @biomejs/biome format --write ./src
   ```

2. **Linting 与自动修复**  
   ```bash
   npx @biomejs/biome lint --apply ./src
   ```

3. **Vue/Svelte/Astro 项目**  
   - 部分支持 `.vue`、`.svelte` 和 `.astro` 文件的脚本部分（需注意格式化和 Linting 限制）。

4. **大型项目优化**  
   - 使用多个 `biome.json` 文件按子项目配置，避免全局规则冲突。
   - 通过 `files.maxSize` 限制处理文件大小（默认 1MB），提升性能。

---

### **四、注意事项**
1. **TypeScript 兼容性**  
   - 导入扩展名处理需注意配置 `useImportExtensions`，避免与 TypeScript 编译后路径冲突。
   - 推荐生成类型声明文件（`tsconfig.json` 中设置 `"declaration": true`）。

2. **迁移现有项目**  
   - 使用 `biome migrate eslint` 迁移 ESLint 配置，自动处理 `.eslintignore` 和规则映射。

3. **IDE 集成**  
   - 安装 VSCode 插件 `biome-vscode`，实现实时格式化和 Linting 反馈。

---

### **五、与其他工具对比**
| **工具**       | **定位**                  | **优势**                          | **局限**                          |
|----------------|---------------------------|-----------------------------------|-----------------------------------|
| **Biome**      | 一体化工具链              | 高性能、低配置、多格式支持        | 部分框架支持尚不完善（如 Vue）   |
| **Prettier**   | 代码格式化                | 多语言支持、零配置                | 规则不可定制、无 Linting 功能     |
| **ESLint**     | 静态代码分析              | 高度可定制、丰富插件生态          | 需配合 Prettier，性能较低         |

---

Biome 通过整合工具链和优化性能，成为现代前端开发的高效选择。对于新项目或希望简化工具链的团队，推荐优先尝试。