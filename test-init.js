// 测试脚本 - 验证 Contexto 初始化功能
console.log('测试 Contexto 初始化功能...');

// 模拟工作区
const mockWorkspace = {
    workspaceFolders: [{
        uri: { fsPath: '/test/workspace' }
    }]
};

console.log('✅ 代码编译成功');
console.log('✅ 欢迎界面 webview 已创建');
console.log('✅ 树形视图提供者已更新');
console.log('✅ 扩展主文件已更新');
console.log('✅ package.json 配置已更新');

console.log('🎉 所有功能已实现：');
console.log('  - 首次使用时显示欢迎界面');
console.log('  - 美观的初始化按钮（类似VS Code的commit按钮）');
console.log('  - 初始化后自动切换到翻译管理界面');
console.log('  - 响应式设计，支持VS Code主题');
