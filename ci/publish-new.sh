#!/bin/bash

# 确保脚本在错误时退出
set -e

# 显示执行的命令
set -x

# 获取当前版本
CURRENT_VERSION=$(node -p "require('./package.json').version")

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "Error: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# 检查是否在正确的分支上
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Error: You must be on the main branch to publish."
    exit 1
fi

# 安装依赖
npm install

# 运行测试
npm test

# 构建项目
npm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "Error: Build failed. dist directory not found."
    exit 1
fi

# 发布到 npm
npm publish --access public

# 创建 git tag
git tag "v$CURRENT_VERSION"

# 推送 tag 到远程仓库
git push origin "v$CURRENT_VERSION"

echo "Successfully published version $CURRENT_VERSION to npm" 

# 注释解释：
# 检查未提交的更改
# 检查当前分支
# 安装依赖
# 运行测试
# 构建项目
# 发布到 npm
# 创建和推送 git tag