// 测试AI服务日志功能的示例
// 可以在开发环境中使用此代码来测试日志记录

import { Logger } from '../src/logger';

// 模拟测试
async function testLogging() {
    const logger = Logger.getInstance();
    
    console.log('日志功能状态:', logger.isLoggingEnabled());
    
    // 手动启用日志
    logger.enableDevLogging();
    
    // 模拟AI请求日志
    const mockPrompt = `请将以下中文文本翻译成English：

1. 原文：用户登录
   业务场景：用户身份验证模块
   UI场景：登录页面按钮文本`;
    
    logger.logAIRequest(mockPrompt, 'TEST_TRANSLATION_REQUEST');
    
    // 模拟AI响应日志
    const mockResponse = `1. User Login`;
    
    logger.logAIResponse(mockResponse, 'TEST_TRANSLATION_RESPONSE');
    
    console.log('测试日志已写入 contexto/log.txt');
}

// 在开发环境中可以取消注释运行测试
// testLogging();
