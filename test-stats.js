// 测试统计功能的简单脚本
const fs = require('fs');
const path = require('path');

// 计算嵌套对象中的key数量
function countFlatKeys(obj, prefix = '') {
    let count = 0;
    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            count += countFlatKeys(obj[key], fullKey);
        } else {
            count++;
        }
    }
    return count;
}

// 读取源字典文件
const sourceDictPath = path.join(__dirname, 'examples/zh-CN.json');
const sourceDict = JSON.parse(fs.readFileSync(sourceDictPath, 'utf-8'));
console.log('源字典文件key总数:', countFlatKeys(sourceDict));

// 读取缓存文件
const cachePath = path.join(__dirname, 'examples/contexto/i18n.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
console.log('缓存中的key总数:', Object.keys(cache).length);

// 统计各语言翻译数量
const targetLanguages = ['en', 'ja', 'ko'];
const languageStats = {};
targetLanguages.forEach(lang => {
    languageStats[lang] = 0;
});

Object.values(cache).forEach(item => {
    if (item.translations) {
        Object.keys(item.translations).forEach(lang => {
            if (languageStats.hasOwnProperty(lang)) {
                languageStats[lang]++;
            }
        });
    }
});

console.log('各语言翻译统计:', languageStats);
