const fs = require('fs');
const path = require('path');

// 导入编译后的模块
const { ExportManager } = require('./out/exportManager');

async function testExportFixed() {
    console.log('=== 测试修复后的导出功能 ===');

    // 创建测试工作区
    const testWorkspace = './test-workspace-fixed';
    if (!fs.existsSync(testWorkspace)) {
        fs.mkdirSync(testWorkspace, { recursive: true });
    }

    // 创建源文件（模拟实际的源文件结构）
    const sourceData = {
        "common": {
            "ok": "确定",
            "cancel": "取消", 
            "save": "保存",
            "delete": "删除",
            "edit": "编辑"
        },
        "user": {
            "login": "登录",
            "logout": "退出登录",
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

    // 模拟缓存（只有部分键有翻译，模拟真实情况）
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
        // 注意：common.ok, common.save, common.delete, common.edit, user.logout, user.password 在缓存中没有翻译
    };

    console.log('配置:', JSON.stringify(testConfig, null, 2));
    console.log('缓存键:', Object.keys(testCache));
    console.log('源文件键数量:', Object.keys(sourceData.common).length + Object.keys(sourceData.user).length);

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
                    
                    // 解析并验证内容
                    try {
                        const data = JSON.parse(content);
                        console.log('\n验证结果:');
                        console.log('- common.ok:', data.common?.ok);
                        console.log('- common.cancel:', data.common?.cancel);
                        console.log('- user.login:', data.user?.login);
                        console.log('- user.logout:', data.user?.logout);
                    } catch (e) {
                        console.log('JSON解析失败:', e.message);
                    }
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

testExportFixed().catch(console.error);
