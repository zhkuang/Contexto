# i18n 数据查看器刷新功能修复

## 问题描述
用户反馈 i18n 数据查看器中的刷新按钮点击后没有实时将 i18n.json 数据刷入表格。

## 问题原因
原来的刷新逻辑只是重新渲染了当前内存中的缓存数据，而没有从磁盘重新加载最新的 i18n.json 文件。

## 解决方案

### 1. 在 ContextoCore 中添加重新加载缓存方法
```typescript
async reloadCache(): Promise<void> {
    this.cache = await this.configManager.loadCache();
    console.log('缓存数据已重新加载，当前缓存项数量:', Object.keys(this.cache).length);
}
```

### 2. 修改 i18nViewerWebview 的刷新逻辑
- 将刷新按钮的处理从 `_updateWebview()` 改为 `_refreshData()`
- `_refreshData()` 方法会先调用 `core.reloadCache()` 重新从磁盘加载数据
- 然后再更新 webview 显示

### 3. 增强用户体验
- 添加刷新时的加载状态提示
- 刷新按钮在加载期间禁用并显示"刷新中..."
- 完成后恢复按钮状态并显示成功消息

## 修复后的工作流程

1. 用户点击刷新按钮
2. 按钮变为禁用状态，显示"刷新中..."
3. 后端重新从 `contexto/i18n.json` 文件加载数据
4. 更新表格显示最新数据
5. 恢复按钮状态，显示"i18n数据已刷新"消息

## 测试步骤

### 准备测试
1. 确保项目已初始化并有 i18n.json 数据
2. 打开 i18n 数据查看器

### 测试刷新功能
1. 在查看器外部修改 `contexto/i18n.json` 文件
2. 在查看器中点击刷新按钮
3. 验证表格数据是否更新为最新内容

### 预期结果
- 刷新按钮点击后短暂显示"刷新中..."
- 表格数据实时更新为 i18n.json 文件中的最新内容
- 显示成功消息"i18n数据已刷新"

## 相关文件
- `src/contextoCore.ts` - 添加 `reloadCache()` 方法
- `src/i18nViewerWebview.ts` - 修改刷新逻辑和用户体验
