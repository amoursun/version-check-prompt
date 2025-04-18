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

// 执行更新操作
updateVersion();
