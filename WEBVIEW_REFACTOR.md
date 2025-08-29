# Webview 重构

将配置面板的HTML从内联字符串重构为独立文件。

## 文件结构

```
src/
  webview/
    configWebview.html  # HTML模板文件
    configWebview.js    # JavaScript逻辑文件
  configWebview.ts      # 主要的TypeScript类
```

## 改进的好处

1. **更好的代码组织** - HTML、CSS、JS分离，各司其职
2. **语法高亮和智能提示** - 在HTML文件中编辑更方便
3. **更容易维护** - 避免在字符串中处理复杂的HTML
4. **减少转义问题** - 不需要处理模板字符串中的转义字符
5. **开发体验提升** - IDE可以提供完整的HTML/CSS/JS支持

## 主要变更

- 将原本的大HTML字符串拆分为独立的 `configWebview.html` 文件
- JavaScript代码独立到 `configWebview.js` 文件
- 通过 `{{SCRIPT_URI}}` 占位符动态注入脚本URL
- 更新 `localResourceRoots` 配置以支持webview目录的资源访问

## 使用方式

配置文件会自动从 `src/webview/configWebview.html` 读取，JavaScript文件通过VSCode的webview URI系统安全加载。
