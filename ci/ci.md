```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
    tags:
      - 'v*'

jobs:
  build-and-publish:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        registry-url: 'https://registry.npmjs.org'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Build
      run: npm run build

    - name: Publish to npm
      if: startsWith(github.ref, 'refs/tags/v')
      run: |
        chmod +x ./publish.sh
        ./publish.sh
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## publish.sh - 发布脚本，包含以下功能：
- 检查未提交的更改
- 检查当前分支
- 安装依赖
- 运行测试
- 构建项目
- 发布到 npm
- 创建和推送 git tag

## .github/workflows/ci.yml - GitHub Actions CI 配置，包含以下功能：
- 在推送到 main 分支或创建新的版本 tag 时触发
- 设置 Node.js 环境
- 安装依赖
- 运行测试
- 构建项目
- 当检测到版本 tag 时自动发布到 npm

## 要使用这个配置，需要：
### 1. 确保 publish.sh 有执行权限：
```bash
chmod +x publish.sh
```
### 2. 在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加 NPM_TOKEN secret：
- 从 npm 获取访问令牌 (https://www.npmjs.com/settings/[username]/tokens)
- 将令牌添加到 GitHub Secrets 中，名称为 NPM_TOKEN
### 3. 在 package.json 中确保有以下脚本：
```json
{
  "scripts": {
    "test": "your-test-command",
    "build": "your-build-command"
  }
}
```
### 发布新版本时的工作流程：
- 1. 更新 package.json 中的版本号
- 2. 提交更改并推送到 main 分支
- 3. 创建新的版本 tag：
```bash
git tag v1.0.0  # 替换为你的版本号
git push origin v1.0.0
```
### GitHub Actions 会自动检测到新的 tag 并运行发布流程。
这个配置提供了以下优势：
- 自动化发布流程
- 确保代码质量（通过测试）
- 版本控制集成
- 安全的 npm 发布（使用 token）
- 清晰的发布日志
需要注意的是，这个配置假设你的主分支是 main。如果你使用其他分支名（比如 master），需要相应地修改配置文件
