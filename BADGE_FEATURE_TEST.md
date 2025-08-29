# 活动栏徽章功能测试指南

## 功能描述
在Contexto插件的活动栏图标上显示徽章数字，表示当前需要处理的翻译项总数，包括：
- 新增的key
- 待翻译的key  
- 已更新的key

## 实现细节

### 1. 徽章更新函数
```typescript
async function updateActivityBarBadge(analysis: any | null) {
    if (!treeView) {
        return;
    }
    
    if (!analysis) {
        // 清除徽章
        treeView.badge = undefined;
        return;
    }
    
    // 计算需要处理的key总数（新增 + 待翻译 + 更新）
    const totalCount = (analysis.newKeys?.length || 0) + 
                      (analysis.pendingKeys?.length || 0) + 
                      (analysis.updatedKeys?.length || 0);
    
    // 设置徽章数字
    if (totalCount > 0) {
        treeView.badge = {
            value: totalCount,
            tooltip: `待处理的翻译项: 新增 ${analysis.newKeys?.length || 0}, 待翻译 ${analysis.pendingKeys?.length || 0}, 已更新 ${analysis.updatedKeys?.length || 0}`
        };
    } else {
        treeView.badge = undefined;
    }
}
```

### 2. 调用时机
徽章会在以下情况下更新：

1. **项目初始化时** - `initializeWorkspace()`
   - 未初始化项目：清除徽章
   - 配置错误：清除徽章  
   - 项目正常：显示待处理数量

2. **执行刷新命令时** - `contexto.refresh` 和 `contexto.refreshStats`
   - 重新分析后更新徽章

3. **删除无用key后** - `contexto.deleteKeys`
   - 删除操作完成后更新徽章

4. **执行翻译后** - `contexto.translateKeys`
   - 翻译完成后更新徽章

### 3. 徽章显示逻辑
- **数量 > 0**: 显示数字徽章，鼠标悬停显示详细信息
- **数量 = 0**: 隐藏徽章
- **项目未初始化或配置错误**: 隐藏徽章

## 测试步骤

### 步骤1: 项目未初始化状态
1. 打开一个没有Contexto配置的项目
2. 查看活动栏Contexto图标，应该没有徽章

### 步骤2: 项目初始化
1. 执行 `contexto.initProject` 命令
2. 配置完成后，查看徽章是否显示待处理的key数量

### 步骤3: 执行操作验证更新
1. 执行翻译命令，观察徽章数字是否减少
2. 执行刷新命令，观察徽章是否正确更新
3. 添加新的国际化key到代码中，刷新后观察徽章是否增加

### 步骤4: 鼠标悬停测试
1. 将鼠标悬停在有徽章的Contexto图标上
2. 应该显示详细的tooltip，包含各类型key的具体数量

## 预期结果
- 徽章数字 = 新增key数量 + 待翻译key数量 + 已更新key数量
- 徽章实时反映当前项目的翻译状态
- 提供清晰的视觉反馈，方便开发者快速了解翻译工作进度
