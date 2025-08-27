# Contexto 配置指南

## 配置文件路径说明

### 重要提醒
`sourceLangDict` 配置项**必须使用相对路径**，路径是相对于**项目根目录**计算的。

### 正确的配置示例

```json
{
    "sourceLangDict": "./locales/zh-CN.json",
    "targetLangs": ["en", "ja", "ko"],
    "ignore": ["./contexto", "./node_modules", "./.git"],
    "contextLines": 5,
    "aiService": {
        "type": "openai",
        "apiKey": "your-api-key-here",
        "base": "https://api.openai.com/v1",
        "model": "gpt-4"
    }
}
```

### 路径配置规则

1. **相对路径**: 使用 `./` 开头，相对于项目根目录
2. **常见路径示例**:
   - `"./locales/zh-CN.json"` - locales目录下的中文文件
   - `"./src/i18n/zh.json"` - src/i18n目录下的文件
   - `"./public/locales/zh-CN.json"` - public/locales目录下的文件
   - `"./assets/i18n/zh-CN.json"` - assets/i18n目录下的文件

### 配置项说明

#### contextLines (可选)
- **类型**: 数字
- **默认值**: 5
- **说明**: AI分析文本上下文时提取的代码行数
- **示例**: `"contextLines": 5` 表示提取key所在行前后各5行代码
- **建议**: 
  - 较小值(3-5)：适合简单项目，提取速度快
  - 较大值(7-10)：适合复杂项目，上下文更丰富
  - 不建议超过10行，会影响AI分析效率

### 项目结构示例

```
项目根目录/
├── contexto/
│   ├── config.json
│   └── i18n.json
├── locales/
│   ├── zh-CN.json  ← 源字典文件
│   ├── en.json
│   └── ja.json
├── src/
└── package.json
```

对应配置: `"sourceLangDict": "./locales/zh-CN.json"`

## 配置后的自动流程

### 1. 保存配置文件后
- 插件会自动检测到config.json文件的保存
- 重新加载配置并初始化

### 2. 自动扫描流程
- 读取sourceLangDict路径
- 解析源字典文件
- 分析Key状态（新增、更新、待翻译、无用）
- 更新UI显示

### 3. 状态反馈
- 控制台会输出详细的扫描日志
- UI界面会实时更新Key统计
- 错误提示会显示在VSCode通知中

## 常见问题解决

### Q: 配置保存后没有反应？
**检查清单**:
1. 确认sourceLangDict路径是否正确
2. 确认源字典文件是否存在
3. 查看VSCode开发者控制台的日志输出
4. 确认文件格式是否支持（JSON、strings.xml等）

### Q: 提示"源字典文件不存在"？
**解决方案**:
1. 检查路径是否以`./`开头
2. 确认路径相对于项目根目录是否正确
3. 确认文件确实存在

### Q: 文件存在但解析失败？
**可能原因**:
1. JSON格式错误（语法问题）
2. 文件编码问题
3. 文件权限问题

## 调试技巧

### 1. 查看控制台日志
- 按F12打开开发者工具
- 查看Console标签页的输出
- 关注Contexto相关的日志信息

### 2. 验证配置
```bash
# 在项目根目录执行，验证文件是否存在
ls ./locales/zh-CN.json
```

### 3. 测试文件格式
```bash
# 验证JSON格式是否正确
cat ./locales/zh-CN.json | python -m json.tool
```

## 支持的文件格式

### JSON格式
```json
{
    "user": {
        "name": "用户名",
        "email": "邮箱"
    },
    "common": {
        "ok": "确定",
        "cancel": "取消"
    }
}
```

### Android strings.xml
```xml
<resources>
    <string name="app_name">应用名称</string>
    <string name="user_name">用户名</string>
</resources>
```

### iOS Localizable.strings
```
"app_name" = "应用名称";
"user_name" = "用户名";
```

### Flutter ARB
```json
{
    "appName": "应用名称",
    "@appName": {
        "description": "应用名称"
    },
    "userName": "用户名"
}
```

## 配置完成后的预期效果

1. **UI更新**: Contexto面板显示Key统计
2. **状态分类**: 新增、更新、待翻译、无用Key分别显示
3. **操作按钮**: 可以执行翻译和清理操作
4. **日志输出**: 控制台显示扫描结果

如果按照上述配置仍有问题，请检查VSCode开发者控制台的错误信息。
