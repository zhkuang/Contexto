const fs = require('fs');
const path = require('path');

// 导入编译后的模块
const { ExportManager } = require('./out/exportManager');

async function testExportSkipStrategy() {
    console.log('=== 测试Skip策略的导出功能 ===');

    // 创建测试工作区
    const testWorkspace = './test-workspace-skip';
    if (!fs.existsSync(testWorkspace)) {
        fs.mkdirSync(testWorkspace, { recursive: true });
    }

    // 创建源文件（包含更多键）
    const sourceData = {
        "common": {
            "ok": "确定",
            "cancel": "取消", 
            "save": "保存",
            "delete": "删除",
            "edit": "编辑",
            "add": "添加",
            "search": "搜索"
        },
        "user": {
            "login": "登录",
            "logout": "退出登录",
            "username": "用户名",
            "password": "密码",
            "email": "邮箱"
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
            'zh-TW'
        ]
    };

    // 模拟缓存（只有少数键有翻译）
    const testCache = {
        'common.cancel': {
            source: '取消',
            sourceFile: 'zh-CN.json',
            translations: {
                'en': 'Cancel',
                'zh-TW': '取消'
            }
        },
        'user.login': {
            source: '登录',
            sourceFile: 'zh-CN.json', 
            translations: {
                'en': 'Login',
                'zh-TW': '登入'
            }
        },
        'user.username': {
            source: '用户名',
            sourceFile: 'zh-CN.json',
            translations: {
                'en': 'Username',
                'zh-TW': '使用者名稱'
            }
        }
        // 大部分键都没有翻译
    };

    console.log('配置:', JSON.stringify(testConfig, null, 2));
    console.log('缓存键数量:', Object.keys(testCache).length);
    console.log('源文件键数量:', Object.keys(sourceData.common).length + Object.keys(sourceData.user).length);

    // 测试不同的fallback策略
    const strategies = ['skip', 'source', 'placeholder', 'key'];
    
    for (const strategy of strategies) {
        console.log(`\n=== 测试策略: ${strategy} ===`);
        
        const exportManager = new ExportManager(testWorkspace);
        const options = { fallbackStrategy: strategy };
        
        try {
            const result = await exportManager.exportTranslations(testConfig, testCache, options);
            console.log('导出结果:', result);

            if (result.success && result.exportedFiles.length > 0) {
                // 只检查第一个文件（英文）
                const firstFile = result.exportedFiles[0];
                if (fs.existsSync(firstFile)) {
                    const content = fs.readFileSync(firstFile, 'utf-8');
                    console.log(`\n=== ${strategy} 策略 - ${firstFile} ===`);
                    console.log(content);
                    
                    // 解析并验证内容
                    try {
                        const data = JSON.parse(content);
                        console.log(`\n${strategy} 策略验证结果:`);
                        console.log('- common对象键数量:', Object.keys(data.common || {}).length);
                        console.log('- user对象键数量:', Object.keys(data.user || {}).length);
                        console.log('- common.cancel:', data.common?.cancel);
                        console.log('- common.ok:', data.common?.ok);
                    } catch (e) {
                        console.log('JSON解析失败:', e.message);
                    }
                }
            } else {
                console.log('导出失败或无文件');
            }
        } catch (error) {
            console.error(`${strategy} 策略测试异常:`, error);
        }
    }
}

testExportSkipStrategy().catch(console.error);
