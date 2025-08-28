const fs = require('fs');
const path = require('path');

console.log('测试导出功能...');

// 模拟配置
const testConfig = {
    sourceLangDict: "zh-CN.json",
    targetLangs: [
        "en",
        {
            "lang": "zh-TW",
            "outputPath": "./test-output/traditional.json"
        }
    ]
};

// 模拟缓存数据
const testCache = {
    "common.save": {
        source: "保存",
        sourceFile: "zh-CN.json",
        translations: {
            "en": "Save",
            "zh-TW": "儲存"
        }
    },
    "common.cancel": {
        source: "取消",
        sourceFile: "zh-CN.json",
        translations: {
            "en": "Cancel",
            "zh-TW": "取消"
        }
    },
    "login.username": {
        source: "用户名",
        sourceFile: "zh-CN.json",
        translations: {
            "en": "Username",
            "zh-TW": "使用者名稱"
        }
    }
};

// 创建测试源文件
const sourceData = {
    "common": {
        "save": "保存",
        "cancel": "取消"
    },
    "login": {
        "username": "用户名"
    }
};

// 确保测试目录存在
if (!fs.existsSync('./test-output')) {
    fs.mkdirSync('./test-output', { recursive: true });
}

// 写入测试源文件
fs.writeFileSync('zh-CN.json', JSON.stringify(sourceData, null, 2));

console.log('测试配置和数据已创建');
console.log('配置:', JSON.stringify(testConfig, null, 2));
console.log('缓存键数量:', Object.keys(testCache).length);
console.log('源文件键数量:', Object.keys(sourceData.common).length + Object.keys(sourceData.login).length);

// 导出测试数据到文件
fs.writeFileSync('./test-config.json', JSON.stringify(testConfig, null, 2));
fs.writeFileSync('./test-cache.json', JSON.stringify(testCache, null, 2));

console.log('测试文件已生成:');
console.log('- zh-CN.json (源文件)');
console.log('- test-config.json (配置文件)');
console.log('- test-cache.json (缓存文件)');
console.log('');
console.log('现在可以测试导出功能了！');
