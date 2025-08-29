# Contexto 扩展安装指南

## 安装方法

### 方法一：通过 VS Code 安装（推荐）

1. 打开 Visual Studio Code
2. 按下快捷键：
   - Windows/Linux: `Ctrl + Shift + P`
   - macOS: `Cmd + Shift + P`
3. 在命令面板中输入：`Extensions: Install from VSIX`
4. 选择并执行该命令
5. 在文件浏览器中选择 `contexto-1.0.0.vsix` 文件
6. 点击安装

### 方法二：通过命令行安装

1. 打开终端/命令行
2. 切换到 VSIX 文件所在目录
3. 执行命令：
   ```bash
   code --install-extension contexto-1.0.0.vsix
   ```

## 注意事项

- ⚠️ **不要双击 VSIX 文件**：双击安装可能会遇到签名验证问题
- ✅ **使用 VS Code 内置的扩展安装功能**：这是最可靠的安装方式
- 🔄 **安装完成后重启 VS Code**：确保扩展正常工作

## 验证安装

1. 安装完成后，在 VS Code 左侧活动栏中应该能看到 Contexto 图标（地球图标）
2. 点击图标，查看是否显示 Contexto 面板
3. 如果没有看到，请重启 VS Code

## 故障排除

如果安装过程中遇到问题：

1. 确保 VS Code 版本 >= 1.74.0
2. 尝试重启 VS Code
3. 检查是否有其他版本的 Contexto 扩展已安装
4. 如果问题持续，请联系开发者

## 卸载

如需卸载扩展：

1. 打开 VS Code 扩展面板（`Ctrl+Shift+X` 或 `Cmd+Shift+X`）
2. 搜索 "Contexto"
3. 点击齿轮图标，选择"卸载"
