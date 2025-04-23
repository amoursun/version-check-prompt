# version-check-prompt

> 一个用于检测网页版本更新并提示用户刷新的轻量级库。

## 功能特点

- 针对前端 web 单页应用（SPA）而设计
- 纯前端技术实现，使用简单无需后端支持
- 支持多种版本检测模式：ETag、Chunk、JSON
- 支持 Web Worker 和 setInterval 两种轮询方式
  - 默认使用 Web Worker, 可以设置Web Worker 和 setInterval 的切换策略
  - Worker不支持降级到 setInterval
- 支持页面可见性检测，自动暂停/恢复轮询
- 支持浏览器活跃状态检测
- 支持空闲任务队列，在浏览器空闲时执行版本检查
- 支持自定义轮询时间、检测类型等配置
- 支持 TypeScript

## 安装

```bash
npm install @amoursun/version-check-prompt;

<script src="https://unpkg.com/@amoursun/version-check-prompt@1.0.3/dist/umd/index.min.js"></script>
<script src="https://unpkg.com/@amoursun/version-check-prompt@1.0.3/dist/umd/index.js"></script>

```

## 使用方法

```typescript
import { createVersionCheckPrompt, IVersionModeEnum } from '@amoursun/version-check-prompt';

const versionCheck = createVersionCheckPrompt({
  mode: IVersionModeEnum.ETAG,
  htmlUrl: 'https://example.com', // 默认使用当前页面 URL
  onUpdate: (self) => {
    if (confirm('发现新版本，是否更新？')) {
      self.refresh();
    }
  },
  onError: (error) => {
    console.error('版本检查出错：', error);
  },
  activityOption: {
    usable: true,
    duration: 4 * 60 * 60 * 1000, // 4小时
    onInactivityPrompt: (self) => {
      if (confirm('您已长时间未操作，是否刷新页面？')) {
        self.refresh();
      }
    },
  },
});
```
### 引入
```
import VersionCheckPrompt from '@amoursun/version-check-prompt';
const VersionCheckPrompt = require('@amoursun/version-check-prompt');
<script src="https://unpkg.com/@amoursun/version-check-prompt@1.0.3/dist/umd/index.min.js"></script>
<script src="https://unpkg.com/@amoursun/version-check-prompt@1.0.3/dist/umd/index.js"></script>
```

## 配置选项

### 主要配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| usable | boolean | true | 是否启用版本检查，可用于开发环境禁用 |
| usePollingType | IPollingTypeEnum | 'worker' | 使用检查模式 web worker 还是直接setInterval |
| mode | IVersionModeEnum | 'etag' | 版本检测模式：etag/chunk/json |
| htmlUrl | string | location.href | HTML 文件 URL |
| jsonUrl | string | - | JSON 文件 URL（JSON 模式需要） |
| pollingTime | number | 5 * 60 * 1000 | 轮询间隔时间（毫秒） |
| forbiddenPolling | boolean | false | 是否禁用轮询 |
| visibilityUsable | boolean | false | 是否启用页面可见性检测 |
| chunkCheckTypes | IChunkCheckTypesEnum[] | ['script_src'] | Chunk 模式下检测的文件类型 |

### 活跃状态配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| usable | boolean | false | 是否启用活跃状态检测 |
| duration | number | 4 * 60 * 60 * 1000 | 检测时间间隔（毫秒） |
| eventNames | string[] | ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'] | 监听的事件名 |
| onInactivityPrompt | function | - | 超时回调函数 |

## API

### 主实例方法

| 方法 | 说明 |
|------|------|
| refresh() | 刷新当前页面 |
| reset() | 重置检测 |
| check() | 手动触发检测 |
| stop() | 停止检测并忽略更新提示 |
| dispose() | 销毁实例 |

### 活跃状态实例方法

| 方法 | 说明 |
|------|------|
| refresh() | 刷新当前页面 |
| reset() | 重置检测 |
| stop() | 停止检测并忽略更新提示 |
| dispose() | 销毁实例 |

## 版本检测模式

### ETag 模式

通过比较 HTML 文件的 ETag 头来检测版本更新。
- 使用`HTTP ETag`作为版本标识符来判断应用是否有更新
- HTTP ETag`说明：每次请求`index.html`文件时，HTTP 响应头上会有一个 [ETag](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/ETag) 字段，
- 格式类似`ETag: W/"0815"`该字段的值是服务器资源的唯一标识符，通过比较前后两次请求的 Etag 字段值，可以判断资源是否发生变化，以这个为依据判断是否有更新。  
- 缺点是`HTTP ETag`是由服务器生成的，前端不可控。
  
1. 使用`Web Worker`API 在浏览器后台**轮询**请求`index.html`文件，不会影响主线程运行。(或者 `setInterval`直接轮询)
2. 请求`index.html`文件，对比本地和请求响应头的 ETag 的字段值。
3. 如果 ETag 字段值不一致，说明有更新，则弹出更新提示，并引导用户手动**刷新页面**（例如弹窗提示），完成应用更新。
4. 当页面不可见时（例如切换标签页或最小化窗口），停止实时检测任务；再次可见时（例如切换回标签页或还原窗口），恢复实时检测任务。


### Chunk 模式

通过检测指定的资源文件（如 JS、CSS）的更新来检测版本更新。
- 使用`chunkHash`作为版本标识符来判断应用是否有更新。  
- `chunk`说明：因为前端 spa 项目都是打包后再部署，这里以 vite 为例，打包产物 index.html 文件内容中会存在一个 script 标签，格式类似`<script type="module" crossorigin src="/assets/index.065a65a6.js"></script>`，`/assets/index.065a65a6.js`等是否有差异新增变化, 判断以这个为依据判断是否有更新。

1. 使用`Web Worker`API 在浏览器后台**轮询**请求`index.html`文件，不会影响主线程运行。
2. 请求`index.html`文件，对比当前文件和最新文件中的`chunk`的值。
3. 如果`chunk`值不一致，说明有更新，则弹出更新提示，并引导用户手动**刷新页面**（例如弹窗提示），完成应用更新。
4. 其他逻辑和方式一保持一致。

### JSON 模式

通过比较 JSON 文件内容来检测版本更新。
- 使用 `version.json` 文件管理版本内容，由开发者手动控制应用版本更新。
- 缺点是需要开发者手动维护 `version.json` 文件

1. 使用`Web Worker`API 在浏览器后台**轮询**请求`version.json`文件，不会影响主线程运行。
2. 请求`version.json`文件，对比当前文件和最新文件中的 version 字段值。
3. 版本号比较如果变化版本则弹出更新提示，并引导用户手动**刷新页面**（例如弹窗提示），完成应用更新。
4. 其他逻辑和方式一保持一致。
   
custom-version.js
```js
// 引入文件系统模块中的读取和写入功能
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs');
// 解析路径模块，用于处理文件路径
const path = require('node:path');

function getRootDir() {
    // 优先从环境变量读取
    if (process.env.PROJECT_ROOT) {
        return path.resolve(process.env.PROJECT_ROOT);
    }
    // 动态查找 package.json
    let currentDir = __dirname;
    while (currentDir !== path.parse(currentDir).root) {
        if (fs.existsSync(path.join(currentDir, 'package.json'))) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    throw new Error('未找到项目根目录（需存在 package.json）');
}
const rootDir = getRootDir();

// [
//     '/Users/xxx/.nvm/versions/node/v18.16.0/bin/node',
//     '/Users/xxx/Desktop/github/version-check-prompt/script/config-version.cjs',
//     // zx 执行命令 时，会传入以下参数 script/config-version.js, node 执行命令则没有
//     '-o',
//     '你要输出的目录',
// ]
const args = process.argv.slice(2); // 去掉前两个默认参数(node路径和脚本路径)
let outputDir = ''; // 默认值

// 解析 -o 参数, node / zx 等输出结果不同, node -o(2), zx -o(3)
// node script/config-version.cjs -o 输出目录 => -o(2) 输出目录(3)
// zx script/config-version.cjs -o 输出目录 => -o(3) 输出目录(4)
const oIndex = args.indexOf('-o');
if (oIndex !== -1 && args[oIndex + 1]) {
    outputDir = args[oIndex + 1];
}
if (outputDir.includes('..')) {
    throw new Error('输出目录路径不能包含上级目录引用（如 ".."）');
}
else if (!outputDir.trim()) {
    throw new Error('输出目录路径不能为空');
}
console.log('输出目录:', outputDir);

const basePathFold = path.join(rootDir, outputDir);
const versionFilePath = path.join(basePathFold, 'version.json');

// 确保目录存在
if (!existsSync(basePathFold)) {
    mkdirSync(basePathFold, { recursive: true });
}

function formatTime(date) {
    /**
     * hour12: false: 强制使用24小时制, 避免输出 PM/AM
     * replace(/\//g, '-'): 默认中文环境下日期分隔符是 /, 替换为 -
     * replace(/,/g, ''): 移除日期和时间之间的逗号（如 2025/04/17, 19:48:03 → 2025-04-17 19:48:03）
     * en-US: 04-17-2025 19:51:34
     * zh-CN: 2025-04-17 19:51:34
     */
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })
    .format(date)
    .replace(/\//g, '-')
    .replace(/,/g, '');
}
// // 初始化版本文件
// if (!existsSync(versionFilePath)) {
//     writeFileSync(versionFilePath, JSON.stringify({
//     }, 'utf-8', 4));
// }

// 获取当前时间戳和格式化时间
function getCurrentVersionInfo() {
    const now = new Date();
    return {
        version: now.toISOString().replace(/[-:T.]/g, '').slice(0, 14), // YYYYMMDDHHmmss
        timestamp: now.getTime(),
        formattedTime: formatTime(now)
    };
}

// 更新版本
function updateVersion() {
    const newInfo = getCurrentVersionInfo();
    
    
    writeFileSync(
        versionFilePath,
        JSON.stringify(newInfo, 'utf-8', 4)
    );
    console.log('版本已更新:', newInfo);
}

function main() {
    // 执行更新操作
    updateVersion();
}

main();

```
```json
"scripts": {
    "build:test:version": "zx scripts/custom-version.js -o dest/json",
    "build:test:version2": "node scripts/custom-version.js -o dest/json",
},
```

## 浏览器兼容性

适用于支持原生 ES Modules 的浏览器

```yaml title=".browserslistrc"
chrome >= 87
edge >= 88
firefox >= 78
safari >= 14
```

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build
```

## 发布
```bash
npm publish --access public --registry https://registry.npmjs.org
npm pack --dry-run # 检查打包文件结构

```

## 许可证

MIT


## 测试命令
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
