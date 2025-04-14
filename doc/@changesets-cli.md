`@changesets/cli` 是一个专为 **Monorepo 项目**设计的版本管理和发布工具，特别适用于需要同时维护多个独立包版本的开源项目（如 pnpm、MobX 等）。以下是其核心功能和使用指南：

---

### **一、核心功能**
1. **版本管理自动化**  
   - **生成变更记录**：通过交互式 CLI 创建 `.md` 格式的变更描述文件（changeset），记录代码改动对哪些包产生影响。  
   - **智能版本升级**：根据语义化版本（Semver）规则自动提升包版本号（major/minor/patch），并更新依赖该包的子包版本。  
   - **生成 CHANGELOG**：将多个 changeset 文件合并为统一的变更日志，支持 Markdown 格式。

2. **发布流程集成**  
   - **多包发布**：支持批量发布所有版本更新的包到 npm 仓库。  
   - **CI/CD 集成**：与 GitHub Actions 深度整合，实现自动化版本升级和发布。

3. **Monorepo 优化**  
   - **依赖图分析**：通过 `@manypkg/get-packages` 分析 Monorepo 内包的依赖关系，避免手动处理复杂版本联动。  
   - **配置灵活**：支持自定义忽略文件、版本更新策略（如固定版本组 `fixed`）和访问权限（public/restricted）。

---

### **二、使用步骤**
#### **1. 初始化配置**
```bash
pnpm add -Dw @changesets/cli  # 安装为开发依赖
pnpm changeset init           # 生成 .changeset/config.json
```
生成的默认配置文件包含基础规则（如 `baseBranch: "main"`）和日志生成器路径。

#### **2. 添加变更记录**
```bash
pnpm changeset  # 交互式选择受影响的包及版本类型
```
- **选择包**：通过 CLI 勾选需要更新的包（支持多选）。  
- **填写描述**：输入变更摘要，自动生成 `.md` 文件（如 `.changeset/lazy-keys-roll.md`）。

#### **3. 版本升级与发布**
```bash
pnpm changeset version  # 升级版本号并生成 CHANGELOG
pnpm install            # 更新 lockfile 和依赖
pnpm publish -r         # 发布所有更新包到 npm
```
- **版本合并**：多个 changeset 文件会合并处理，避免重复升级。  
- **权限配置**：若包为私有作用域（scoped），需在 `config.json` 设置 `"access": "public"`。

#### **4. 自动化流程（GitHub Actions）**
```yaml
# .github/workflows/changesets.yml
- uses: changesets/action@v1
  with:
    publish: pnpm ci:publish  # 触发发布脚本
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}  # npm 认证令牌
```
需在仓库设置中授予 Actions **读写权限**，并配置 `NPM_TOKEN` 和 `GITHUB_TOKEN`。

---

### **三、最佳实践**
1. **版本策略优化**  
   - 使用 `fixed` 字段锁定关联包的版本组（如组件库及其插件）。  
   - 通过 `ignore` 字段排除测试包或文档目录。

2. **开发协作规范**  
   - **开发者**：仅需关注代码改动和生成 changeset 文件。  
   - **维护者**：负责合并 changeset 并执行发布流程。

3. **调试与日志**  
   - 添加 `--verbose` 参数查看详细日志（如 `pnpm changeset version --verbose`）。  
   - 检查 `node_modules/.cache/changesets` 缓存文件排查问题。

---

### **四、与其他工具对比**
| **工具**       | **优势**                                | **局限**                          |
|----------------|----------------------------------------|----------------------------------|
| **Lerna**      | 成熟生态，支持复杂依赖链               | 停止维护，配置复杂          |
| **Changesets** | 轻量级、自动化程度高、与 pnpm 深度集成  | 对非 JS 生态支持较弱        |
| **Rush**       | 企业级功能（如增量构建）                | 学习成本高，适合超大型项目  |

---

通过 `@changesets/cli`，开发者可以高效管理 Monorepo 中多包的版本迭代，尤其适合需要频繁发布和维护的开源项目。其与 pnpm 的深度整合和自动化能力显著降低了人工操作成本。