# AI 服务测试修复说明

## 修复的问题

### 1. 重复错误提示
**原因**：代码中既发送了webview消息显示错误，又调用了`vscode.window.showErrorMessage`弹出系统提示
**修复**：移除系统错误提示，只在配置页面内显示错误信息

### 2. 翻译结果检查错误
**原因**：AI服务返回的结果key格式是 `${key}_${targetLang}`（如 `test_en`），而不是简单的 `test`
**修复**：使用正确的key格式进行结果检查

### 3. 错误信息不够详细
**原因**：当测试失败时，只显示"翻译结果为空"，没有提供调试信息
**修复**：添加详细的日志记录和错误信息

## 修复后的逻辑

```typescript
// 执行翻译测试
const testTasks = [{
    key: 'test',
    source: '你好',
    targetLang: 'en'
}];

const result = await aiService.translateText(testTasks);

// 使用正确的key格式检查结果
const expectedKey = 'test_en';  // ${key}_${targetLang}
const testResult = result[expectedKey];

if (result && testResult && testResult.trim() && !testResult.startsWith('[翻译失败')) {
    // 测试成功
    webview.postMessage({
        type: 'testResult',
        success: true,
        result: testResult
    });
} else {
    // 测试失败，提供详细错误信息
    const availableKeys = Object.keys(result || {});
    const errorMsg = `翻译测试失败。期望的键: ${expectedKey}，返回的结果: ${JSON.stringify(result)}，可用的键: [${availableKeys.join(', ')}]`;
    throw new Error(errorMsg);
}
```

## 调试信息

现在测试过程会在控制台输出以下调试信息：
- AI服务配置信息
- 完整的返回结果JSON
- 期望的key和实际可用的keys
- 详细的错误信息

## 测试方法

1. 打开VS Code开发者控制台（`Help` > `Toggle Developer Tools`）
2. 在配置页面中填写AI服务配置
3. 点击"测试连接"按钮
4. 查看控制台输出的详细日志信息

## 常见问题排查

### 如果仍然提示"翻译测试失败"
1. 检查控制台输出的完整错误信息
2. 确认API配置是否正确（API Key、Base URL、Model）
3. 检查网络连接是否正常
4. 查看返回的结果格式是否符合预期

### 日志示例

**成功的情况**：
```
开始AI服务测试，配置: {type: 'openai', apiKey: 'sk-...', base: 'https://...', model: 'gpt-4'}
AI服务测试返回结果: {"test_en": "Hello"}
AI 服务测试成功，翻译结果: Hello
```

**失败的情况**：
```
开始AI服务测试，配置: {type: 'openai', apiKey: 'sk-...', base: 'https://...', model: 'gpt-4'}
AI服务测试返回结果: {"test_en": "[翻译失败: Error: Request failed]"}
翻译测试失败。期望的键: test_en，返回的结果: {"test_en": "[翻译失败: Error: Request failed]"}，可用的键: [test_en]
```

这样就可以更容易定位具体的问题原因。
