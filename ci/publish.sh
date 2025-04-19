#!/bin/bash
set -e # 遇到错误立即退出

# 参数校验
if [ -z "$NPM_TOKEN" ]; then
    echo "❌ 错误：未检测到 NPM_TOKEN 环境变量"
    exit 1
fi

# 配置 npm 认证
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc

# 安装依赖并构建
echo "⚙️ 安装依赖..."
npm ci --silent

echo "🏗️ 构建项目..."
npm run build # 调用 rslib 的构建命令

# 自动升级版本号（可选：根据 git commit 信息决定升级策略）
VERSION_BUMP="patch" # 默认升级修订号
if git log -1 --pretty=%B | grep -q "feat:"; then
    VERSION_BUMP="minor" # 特性提交升级次版本号
elif git log -1 --pretty=%B | grep -q "BREAKING CHANGE:"; then
    VERSION_BUMP="major" # 破坏性变更升级主版本号
fi

echo "🔖 升级版本号 ($VERSION_BUMP)..."
NEW_VERSION=$(npm version $VERSION_BUMP --no-git-tag-version)
echo "新版本号: $NEW_VERSION"

# 发布到 npm
echo "🚀 发布到 npm..."
npm publish --access public

# 打 Git 标签并推送（可选）
git tag $NEW_VERSION
git push origin $NEW_VERSION

echo "✅ 发布成功！版本号: $NEW_VERSION"