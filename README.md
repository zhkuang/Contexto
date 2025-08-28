# Contexto - 智能国际化翻译助手

一个专业的 VS Code 扩展，帮助开发者轻松实现项目国际化。通过 AI 智能翻译和上下文分析，提供准确、符合场景的本土化翻译。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.74.0+-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ 核心特性

- 🤖 **AI 智能翻译** - 基于上下文的精准翻译，支持业务场景和 UI 场景
- 🌍 **多平台支持** - 支持 Web、移动端、桌面端和后端的各种国际化格式
- 📊 **可视化管理** - 直观的翻译状态面板，实时跟踪翻译进度
- 🔄 **自动同步** - 智能检测源文件变化，自动更新翻译状态
- 📤 **灵活导出** - 多种导出策略，支持自定义路径和格式
- 🧹 **智能清理** - 一键清理无用的翻译键值，保持项目整洁

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

## 🚀 快速开始

### 安装
1. 在 VS Code 扩展市场搜索 "Contexto"
2. 点击安装并重启 VS Code

### 使用
1. 打开包含国际化文件的项目
2. 在侧边栏点击 Contexto 图标 (🌐)
3. 点击 "初始化项目" 创建配置文件
4. 配置 AI 服务和目标语言
5. 开始翻译您的项目

## ⚙️ 配置说明

在项目根目录创建 `contexto/config.json`：

```json
{
    "sourceLangDict": "./locales/zh-CN.json",
    "targetLangs": ["en", "zh-TW", "ja", "ko"],
    "aiService": {
        "type": "openai",
        "apiKey": "your-api-key",
        "model": "gpt-4"
    }
}
```

### 详细配置选项

```json
{
    "sourceLangDict": "./locales/zh-CN.json",     // 源语言文件路径
    "targetLangs": [                              // 目标语言配置
        "en",                                     // 简单语言代码
        {                                         // 自定义输出路径
            "lang": "zh-TW", 
            "outputPath": "./i18n/zh-TW.json"
        }
    ],
    "ignore": ["./node_modules", "./dist"],       // 忽略的目录
    "contextLines": 5,                            // 上下文行数
    "aiService": {                                // AI 服务配置
        "type": "openai",
        "apiKey": "your-api-key",
        "baseURL": "https://api.openai.com/v1",
        "model": "gpt-4"
    }
}
```

## 📋 支持的文件格式

| 平台 | 格式 | 扩展名 | 示例 |
|------|------|--------|------|
| Web 前端 | JSON | `.json` | Vue i18n, React i18next |
| Android | XML | `.xml` | strings.xml |
| iOS | Strings | `.strings` | Localizable.strings |
| Flutter | ARB | `.arb` | app_en.arb |

## 🌍 语言支持

支持 100+ 种语言，包括：
- **亚洲语言**: 中文（简/繁）、日语、韩语、泰语、越南语等
- **欧洲语言**: 英语、法语、德语、西班牙语、意大利语等  
- **其他语言**: 阿拉伯语、俄语、葡萄牙语、荷兰语等

详细语言列表请查看 [LANGUAGE_SUPPORT.md](./LANGUAGE_SUPPORT.md)

## 📚 文档

- [使用指南](./USAGE_GUIDE.md) - 详细使用说明
- [配置指南](./CONFIG_GUIDE.md) - 完整配置参考
- [导出功能](./EXPORT_GUIDE.md) - 导出功能详解
- [语言支持](./LANGUAGE_SUPPORT.md) - 支持的语言列表

## 💻 开发

```bash
# 克隆项目
git clone https://github.com/zhkuang/Contexto.git
cd Contexto

# 安装依赖
npm install

# 编译
npm run compile

# 开发模式（监听文件变化）
npm run watch

# 打包扩展
npm run package
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ for developers worldwide**
