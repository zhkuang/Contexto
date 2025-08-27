// 测试日志功能的简单脚本
const fs = require('fs');
const path = require('path');

// 模拟workspace
const mockWorkspaceFolder = {
    uri: {
        fsPath: process.cwd()
    }
};

// 模拟vscode.workspace
global.vscode = {
    workspace: {
        workspaceFolders: [mockWorkspaceFolder]
    }
};

// 动态导入Logger类
const { Logger } = require('./out/logger.js');

async function testLogger() {
    console.log('开始测试日志功能...');
    
    // 获取Logger实例
    const logger = Logger.getInstance();
    
    console.log('日志功能是否启用:', logger.isLoggingEnabled());
    
    // 手动启用日志功能
    console.log('手动启用日志功能...');
    logger.enableDevLogging();
    
    console.log('日志功能是否启用:', logger.isLoggingEnabled());
    
    // 测试日志记录
    console.log('测试日志记录...');
    logger.logAIRequest('这是一个测试请求', 'TEST_REQUEST');
    logger.logAIResponse('这是一个测试响应', 'TEST_RESPONSE');
    
    // 检查日志文件是否创建
    const logPath = path.join(process.cwd(), 'contexto', 'log.txt');
    console.log('检查日志文件:', logPath);
    
    if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, 'utf8');
        console.log('日志文件内容:');
        console.log(logContent);
    } else {
        console.log('日志文件不存在');
    }
}

testLogger().catch(console.error);
