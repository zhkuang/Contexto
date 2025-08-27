# Contexto 使用指南

## 安装和启动

### 开发环境运行
1. 在VSCode中打开Contexto项目目录
2. 按F5或选择"运行和调试" -> "运行扩展"
3. 这将打开一个新的VSCode扩展开发主机窗口

### 在扩展开发主机中使用
1. 在新窗口中打开一个包含多语言文件的项目
2. 在左侧活动栏中找到Contexto图标（🌐）
3. 点击进入Contexto面板
4. 开始使用Contexto功能

## 快速开始

### 1. 准备项目
确保你的项目中有多语言字典文件，例如：
- `locales/zh-CN.json` (中文源文件)
- `locales/en.json` (英文翻译文件，可选)

### 2. 初始化Contexto
1. 在Contexto面板中点击"初始化项目"
2. 系统会创建`contexto`目录和配置文件
3. 打开`contexto/config.json`进行配置

### 3. 配置AI服务
```json
{
    "sourceLangDict": "./locales/zh-CN.json",
    "targetLangs": ["en", "ja", "ko"],
    "ignore": ["./contexto", "./node_modules"],
    "contextLines": 5,
    "aiService": {
        "type": "openai",
        "apiKey": "sk-your-openai-api-key",
        "base": "https://api.openai.com/v1",
        "model": "gpt-4"
    }
}
```

### 4. 开始翻译
1. 保存配置文件后，点击Contexto面板中的"刷新"
2. 查看识别出的待翻译Key
3. 点击"一键翻译"开始AI翻译

## 配置说明

### sourceLangDict
源语言字典文件路径，相对于项目根目录。

### targetLangs
目标语言列表，支持的语言代码：
- `en` - English
- `ja` - Japanese
- `ko` - Korean
- `fr` - French
- `de` - German
- `es` - Spanish
- `pt` - Portuguese
- `ru` - Russian
- `ar` - Arabic
- `th` - Thai
- `vi` - Vietnamese

### ignore
忽略扫描的目录和文件列表，支持glob模式。

### contextLines
上下文代码行数配置（可选）：
- **默认值**: 5
- **作用**: AI分析文本时提取key所在位置前后的代码行数
- **建议值**: 3-10行
- **示例**: `"contextLines": 7` 会提取key前后各7行代码

### aiService
AI服务配置：
- `type`: 目前支持"openai"
- `apiKey`: OpenAI API密钥
- `base`: API基础URL
- `model`: 使用的模型名称

## 功能详解

### Key状态管理
Contexto会自动分析项目中的翻译Key状态：

- **新增Key** 🆕: 源字典中新出现的Key
- **更新Key** 📝: 源文本发生变化的Key
- **待翻译Key** ⏳: i18n缓存中有数据但目标语言翻译不完整或缺失的Key
- **未使用Key** 🗑️: 源字典中声明但在项目文件中未找到引用的Key，或已从源字典中删除但缓存中仍存在的Key

### AI智能翻译
- **上下文分析**: AI会分析Key在代码中的使用场景
- **业务场景识别**: 理解文本在业务逻辑中的作用
- **UI场景识别**: 识别文本在用户界面中的展示方式
- **本土化翻译**: 根据场景提供符合目标语言习惯的翻译

### 批量操作
- **一键翻译**: 批量翻译所有待处理的Key
- **清理无用Key**: 删除已经不再使用的翻译
- **增量更新**: 只处理变化的内容，提高效率

## 支持的文件格式

### Web前端
```javascript
// Vue i18n
{
    "user": {
        "name": "用户名",
        "email": "邮箱"
    }
}

// React i18next
t('user.name')
i18n.t('user.email')
```

### 移动端
```xml
<!-- Android strings.xml -->
<string name="user_name">用户名</string>

<!-- iOS Localizable.strings -->
"user_name" = "用户名";
```

### Flutter
```json
// ARB文件
{
    "userName": "用户名",
    "@userName": {
        "description": "User name label"
    }
}
```

## 常见问题

### Q: 如何获取OpenAI API密钥？
A: 访问 https://platform.openai.com/api-keys 注册并创建API密钥。

### Q: 支持其他AI服务吗？
A: 目前主要支持OpenAI，未来可以扩展支持其他兼容的AI服务。

### Q: 翻译质量不满意怎么办？
A: 可以手动编辑`contexto/i18n.json`文件中的翻译内容，或者调整AI服务的提示词模板。

### Q: 如何添加新的字典格式支持？
A: 可以在`src/parsers/dictParsers.ts`中添加新的解析器实现。

### Q: 翻译缓存文件可以提交到版本控制吗？
A: 建议将`contexto/i18n.json`提交到版本控制，但不建议提交包含API密钥的`config.json`。

## 最佳实践

1. **统一管理**: 将所有语言文件放在统一目录下
2. **规范命名**: 使用清晰的Key命名规范
3. **定期同步**: 及时更新翻译缓存
4. **代码审查**: 定期检查翻译质量和一致性
5. **备份重要**: 定期备份翻译文件

## 故障排除

### 编译错误
```bash
npm install
npm run compile
```

### 扩展无法加载
1. 检查VSCode版本是否符合要求
2. 确认项目已正确编译
3. 重启VSCode

### AI翻译失败
1. 检查API密钥是否正确
2. 确认网络连接正常
3. 检查API配额是否足够

## 开发和贡献

欢迎贡献代码和反馈问题！

### 开发环境设置
```bash
git clone <repository>
cd contexto
npm install
npm run compile
```

### 测试
按F5在VSCode中启动扩展开发主机进行测试。

---

如有任何问题或建议，请提交Issue或Pull Request。
