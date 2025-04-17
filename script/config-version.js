// 引入文件系统模块中的读取和写入功能
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('node:fs');
// 解析路径模块，用于处理文件路径
const path = require('node:path');

const basePathFold = path.join(__dirname, 'dest/prod/json');
const versionFilePath = path.join(basePathFold, 'version.json');

// 确保目录存在
if (!existsSync(basePathFold)) {
    mkdirSync(basePathFold, { recursive: true });
}

function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date).replace(/\//g, '-');
}
// 初始化版本文件
if (!existsSync(versionFilePath)) {
    writeFileSync(versionFilePath, JSON.stringify({
        version: '0.0.1',
        timestamp: Date.now(),
        formattedTime: new Date().toISOString()
    }, 'utf-8', 4));
}

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
    const current = JSON.parse(readFileSync(versionFilePath, 'utf-8'));
    const newInfo = getCurrentVersionInfo();
    
    const updated = {
        ...current,
        ...newInfo,
    };
    
    writeFileSync(versionFilePath, JSON.stringify(updated, null, 2));
    console.log('版本已更新:', updated);
}

// 执行更新操作
updateVersion();
