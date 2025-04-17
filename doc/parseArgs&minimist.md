# 在 Node.js 脚本中获取命令行参数

在 Node.js 脚本中获取命令行参数（如 `-o xxx`）可以通过以下几种方式：

### 1. 使用 `process.argv`（原生方式）

这是最基础的方法，`process.argv` 返回一个包含所有命令行参数的数组：

```javascript
// build-bootstrap.js
const args = process.argv.slice(2); // 去掉前两个默认参数(node路径和脚本路径)
let outputDir = 'dist'; // 默认值

// 解析 -o 参数
const oIndex = args.indexOf('-o');
if (oIndex !== -1 && args[oIndex + 1]) {
  outputDir = args[oIndex + 1];
}

console.log('输出目录:', outputDir);
```

### 2. 使用 `minimist` 库（推荐）

这是一个专门用于解析命令行参数的流行库：

```javascript
// 首先安装：npm install minimist
const minimist = require('minimist');

const args = minimist(process.argv.slice(2), {
  alias: {
    o: 'output' // -o 也可以写作 --output
  },
  default: {
    output: 'dist' // 默认值
  }
});

console.log('输出目录:', args.output); // 或 args.o
```

### 3. 使用 `commander` 库（适合复杂CLI）

对于更复杂的命令行工具：

```javascript
// 首先安装：npm install commander
const { program } = require('commander');

program
  .option('-o, --output <dir>', '输出目录', 'dist')
  .parse(process.argv);

console.log('输出目录:', program.opts().output);
```

### 4. 使用 `yargs` 库

另一个功能丰富的选项：

```javascript
// 首先安装：npm install yargs
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('o', {
    alias: 'output',
    type: 'string',
    default: 'dist',
    description: '输出目录'
  })
  .argv;

console.log('输出目录:', argv.output); // 或 argv.o
```

### 5. **Node.js 原生参数解析（18.3+）**
与 `minimist` 类似的功能，但更轻量且无需安装第三方库
Node.js 内置的 `node:util` 模块提供了 `parseArgs` 方法，支持基础参数解析：
```javascript
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    output: {
      type: 'string',
      short: 'o', // 别名 -o
    },
    debug: {
      type: 'boolean',
      short: 'd', // 别名 -d
    }
  }
});

console.log(values.output); // 获取 -o 或 --output 的值
console.log(values.debug);  // 获取 -d 或 --debug 的布尔值
```
**特点**：
- 支持 `string`、`boolean` 类型参数。
- 可定义短选项（如 `-o`）和长选项（如 `--output`）。
- 轻量级，但功能较基础（如不支持默认值、嵌套子命令等）。

---

### 完整示例（使用 minimist）

```javascript
// build-bootstrap.js
const minimist = require('minimist');
const path = require('path');
const fs = require('fs');

// 解析参数
const args = minimist(process.argv.slice(2), {
  alias: { o: 'output' },
  default: { output: 'dist' }
});

const outputDir = path.resolve(args.output);

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`正在构建到目录: ${outputDir}`);
// 这里添加你的构建逻辑...
```

### 参数使用示例

```bash
node script/build-bootstrap.js -o custom-output
# 或
node script/build-bootstrap.js --output custom-output
```

### 注意事项

1. 路径处理总是使用 `path.resolve()` 或 `path.join()` 而不是直接拼接字符串
2. 考虑添加参数验证，确保目录可写
3. 对于生产环境，建议使用 `commander` 或 `yargs` 这类成熟的库
4. 可以通过 `--help` 参数添加帮助信息（使用 `commander` 或 `yargs` 时会自动生成）

选择哪种方式取决于你的需求复杂度。对于简单脚本，`process.argv` 或 `minimist` 就足够了；对于复杂CLI工具，`commander` 或 `yargs` 会更合适。


### 2. ** `node:util parseArgs`与 `minimist` 的对比**
| 特性                | Node.js 原生 (`parseArgs`) | `minimist` |
|---------------------|---------------------------|--------------------------|
| **安装需求**         | 无需安装                  | 需 `npm install minimist` |
| **类型支持**         | `string`、`boolean`       | `string`、`boolean`、`number`（自动转换） |
| **别名支持**         | 是（通过 `short` 配置）    | 是（通过 `opts.alias`）   |
| **默认值**           | 不支持                    | 支持（`opts.default`）    |
| **未知参数处理**     | 报错                      | 可配置（`opts.unknown`）  |
| **子命令支持**       | 不支持                    | 需手动实现               |

---

### 3. **如何选择？**
- **简单场景**：使用 Node.js 原生 `parseArgs`，避免依赖第三方库。
- **复杂需求**（如默认值、多类型参数）：选择 `minimist` 或更强大的库如 `commander`、`yargs`。

---

### 4. **原生替代方案的局限性**
Node.js 原生解析器目前不支持以下 `minimist` 特性：
- 自动类型转换（如 `--port 8080` 转为数字）。
- 参数分组（如 `-abc` 解析为 `{ a: true, b: true, c: true }`）。
- 默认值和未知参数处理。

---

### 总结
Node.js 18.3+ 的原生 `parseArgs` 适合轻量级参数解析，而 `minimist` 更适合需要灵活性和兼容旧版本 Node.js 的场景。若需更完整的 CLI 工具链，推荐 `commander` 或 `yargs`。


---