# Contexto - 智能国际化翻译助手

Contexto是一个VSCode插件，旨在帮助开发者在软件国际化过程中，对工程中的文案进行符合业务场景和UI场景的本土化翻译。

## 主要功能

- 🌐 支持多种平台和框架的字典文件格式
- 🤖 基于AI的智能翻译和上下文分析
- 📊 直观的UI界面显示翻译状态
- 🔄 自动检测新增、更新和待翻译的文本
- 🗑️ 一键清理无用的翻译Key
- ⚡ 快速的文件搜索和关联分析

## 支持的格式

### Web前端
- Vue i18n (JSON格式)
- React i18next (JSON格式)
- Angular i18n
- Svelte i18n

### 移动端
- Android strings.xml
- iOS Localizable.strings
- Flutter ARB文件

### 桌面端
- Electron
- Qt
- 原生应用

### 后端
- PHP数组格式
- Python字典格式
- Java Properties
- Go i18n

## 快速开始

1. 在VSCode中打开您的项目
2. 在左侧活动栏找到Contexto图标（🌐）
3. 点击进入Contexto面板
4. 点击"初始化项目"按钮
5. 配置`contexto/config.json`文件
6. 开始使用AI翻译功能

## 配置说明

在项目根目录的`contexto/config.json`文件中配置：

```json
{
    "sourceLangDict": "./locales/zh-CN.json",
    "targetLangs": [
        "en",        // 英语
        "zh-TW",     // 繁体中文
        "ja",        // 日语
        "ko",        // 韩语
        "fr",        // 法语
        "de",        // 德语
        "es",        // 西班牙语
        "pt",        // 葡萄牙语
        "ru",        // 俄语
        "ar",        // 阿拉伯语
        "th",        // 泰语
        "vi"         // 越南语
    ],
    "ignore": ["./contexto", "./node_modules"],
    "contextLines": 5,
    "aiService": {
        "type": "openai",
        "apiKey": "your-api-key",
        "base": "https://api.openai.com/v1",
        "model": "gpt-4"
    }
}
```

## 🌍 支持的语言

Contexto 支持100多种语言翻译，包括：

- **中文变体**: 简体中文、繁体中文（台湾）、繁体中文（香港）
- **主要语言**: 英语、法语、德语、西班牙语、葡萄牙语、俄语、日语、韩语
- **亚洲语言**: 阿拉伯语、泰语、越南语、印尼语、马来语、印地语、孟加拉语等
- **欧洲语言**: 意大利语、荷兰语、瑞典语、挪威语、丹麦语、芬兰语、波兰语等
- **其他语言**: 土耳其语、希伯来语、波斯语、斯瓦希里语等

详细的语言代码列表请参考 [`LANGUAGE_SUPPORT.md`](./LANGUAGE_SUPPORT.md)。

## 📚 文档

- [使用指南](./USAGE_GUIDE.md) - 详细的使用说明
- [配置指南](./CONFIG_GUIDE.md) - 配置文件说明
- [多语言支持](./LANGUAGE_SUPPORT.md) - 完整的语言支持列表
- [功能设计](./DESIGN.md) - 插件设计文档

## 工作流程

1. **初始化**: 创建配置文件和翻译缓存
2. **扫描**: 自动扫描源语言字典文件
3. **分析**: 识别新增、更新和待翻译的Key
4. **翻译**: 使用AI进行上下文感知的翻译
5. **管理**: 清理无用的Key，保持翻译同步

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch
```

## 许可证

MIT License
