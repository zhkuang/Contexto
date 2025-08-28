const fs = require('fs');
const path = require('path');

// 导入编译后的模块
const { ExportManager } = require('./out/exportManager');

async function testExport() {
    console.log('=== 测试导出功能 ===');

    // 创建测试工作区
    const testWorkspace = './test-workspace';
    if (!fs.existsSync(testWorkspace)) {
        fs.mkdirSync(testWorkspace, { recursive: true });
    }

    // 创建源文件
    const sourceData = {
        "common": {
            "save": "保存",
            "cancel": "取消"
        },
        "login": {
            "username": "用户名",
            "password": "密码"
        }
    };

    const sourceFile = path.join(testWorkspace, 'zh-CN.json');
    fs.writeFileSync(sourceFile, JSON.stringify(sourceData, null, 2));
    console.log('创建源文件:', sourceFile);

    // 模拟配置
    const testConfig = {
        sourceLangDict: 'zh-CN.json',
        targetLangs: [
            'en',
            { lang: 'zh-TW', outputPath: './locales/traditional.json' }
        ]
    };

    // 模拟缓存（使用平铺的key）
    const testCache = {
        'common.save': {
            source: '保存',
            sourceFile: 'zh-CN.json',
            translations: {
                'en': 'Save',
                'zh-TW': '儲存'
            }
        },
        'common.cancel': {
            source: '取消',
            sourceFile: 'zh-CN.json',
            translations: {
                'en': 'Cancel',
                'zh-TW': '取消'
            }
        },
        'login.username': {
            source: '用户名',
            sourceFile: 'zh-CN.json',
            translations: {
                'en': 'Username',
                'zh-TW': '使用者名稱'
            }
        },
        'login.password': {
            source: '密码',
            sourceFile: 'zh-CN.json',
            translations: {
                'en': 'Password',
                'zh-TW': '密碼'
            }
        }
    };

    console.log('配置:', JSON.stringify(testConfig, null, 2));
    console.log('缓存键:', Object.keys(testCache));

    // 测试导出
    const exportManager = new ExportManager(testWorkspace);
    
    try {
        const result = await exportManager.exportTranslations(testConfig, testCache);
        console.log('导出结果:', result);

        if (result.success) {
            console.log('导出成功！检查文件内容:');
            for (const file of result.exportedFiles) {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf-8');
                    console.log(`\n=== ${file} ===`);
                    console.log(content);
                } else {
                    console.log(`文件不存在: ${file}`);
                }
            }
        } else {
            console.log('导出失败:', result.errors);
        }
    } catch (error) {
        console.error('导出异常:', error);
    }
}

testExport().catch(console.error);
