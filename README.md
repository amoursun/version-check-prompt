# version-check-prompt

npm pack --dry-run  # 检查打包文件结构
npm publish --access public --registry=https://registry.npmjs.org


```sh
# 交互式测试模式
npm test

# 单次运行测试
npm run test:run

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npx vitest src/utils/util-polling.test.ts

# 运行匹配特定名称的测试
npx vitest -t "checkUpdated"

# 设置测试超时时间为 10 秒
npx vitest --testTimeout 10000

# 使用 JSON 报告格式
npx vitest --reporter json

# 想要测试 src/utils 和 src/polling 文件夹，并生成覆盖率报告
npx vitest run --coverage src/utils src/polling

# 监视模式
npx vitest --watch

# 生成覆盖率报告
npx vitest --coverage

# 测试所有 utils 文件夹下的文件
npx vitest "src/**/utils/**/*.test.ts"

# 测试所有以 .test.ts 结尾的文件
npx vitest "**/*.test.ts"

```
