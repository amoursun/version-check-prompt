// 引入文件系统模块中的读取和写入功能
const { readFileSync, writeFileSync, accessSync, mkdirSync, existsSync } = require('node:fs');
// 解析路径模块，用于处理文件路径
const { resolve } = require('node:path');
// 引入 dayjs 库来处理日期和时间
const dayjs = require('dayjs');

const basePathFold = resolve('dest/prod/json');
function createFolder(folder) {
    try {
        accessSync(folder);
    }
    catch (err) {
        // 如果文件夹不存在，则创建文件夹, 使用 recursive: true 选项来递归创建目录
        mkdirSync(folder, { recursive: true });
    }
}
function createVersionFile(filePath) {
    // 创建空文件（如果不存在）
    if (!existsSync(filePath)) {
        writeFileSync(filePath, '{"data":{}}', 'utf-8'); // 初始化空数组或其他默认内容
    }
}
createFolder(basePathFold);

// 版本文件路径
const versionFilePath = resolve(basePathFold,'version.json');
createVersionFile(versionFilePath);


// 获取当前时间的版本号和格式化时间
const getVersionTime = () => {
    const date = dayjs().format('YYYY.MM.DD.HH.mm.ss');
    const dateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
    return {version: date, time: dateTime};
};

const readVersion = () => {
    // 读取版本文件中的数据
    const versionValue = readFileSync(versionFilePath, 'utf-8');

    return {versionValue};
};

const writeVersion = (content) => {
    // 将更新后的版本数据写入版本文件
    writeFileSync(versionFilePath,
        JSON.stringify(content, null, 2),
        'utf-8'
    );

    // 打印更新后的时间和版本号
    console.log('版本号已更新:', content);
};

const getVersionParse = () => {
    const { versionValue } = readVersion();

    // 将版本文件数据解析为对象
    const versionParse = JSON.parse(versionValue);

    return {versionParse};
};

const updateVersion = () => {
    // 获取当前时间的版本号和格式化时间
    const { version, time } = getVersionTime();
    // 获取更新日志和版本数据
    const { versionParse } = getVersionParse();
    // 更新版本数据中的版本号和时间字段
    versionParse.data.version = version;
    versionParse.data.time = time;

    // 写入更新后的数据到文件中
    writeVersion(versionParse);
};

// 执行更新操作
updateVersion();
