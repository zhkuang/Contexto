import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';
import { ContextoConfig, TargetLangConfig } from './types';

export class ConfigWebviewProvider {
    private _view?: vscode.WebviewView;
    private core?: ContextoCore;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public setCore(core: ContextoCore | null) {
        this.core = core || undefined;
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    public show() {
        if (!this.core) {
            vscode.window.showErrorMessage('项目未初始化，无法打开配置页面');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'contextoConfig',
            'Contexto 配置',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this._extensionUri]
            }
        );

        panel.webview.html = this._getHtmlForWebview(panel.webview);
        this._setupWebviewMessageListener(panel.webview);

        panel.onDidDispose(() => {
            // 清理资源
        });
    }

    private _setupWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'loadConfig':
                    await this._loadConfig(webview);
                    break;
                case 'saveConfig':
                    await this._saveConfig(webview, data.config);
                    break;
                case 'selectSourceDict':
                    await this._selectSourceDict(webview);
                    break;
                case 'selectOutputPath':
                    await this._selectOutputPath(webview, data.index);
                    break;
                case 'testAIService':
                    await this._testAIService(webview, data.aiConfig);
                    break;
                case 'addTargetLang':
                    this._addTargetLang(webview);
                    break;
                case 'removeTargetLang':
                    this._removeTargetLang(webview, data.index);
                    break;
            }
        });
    }

    private async _loadConfig(webview: vscode.Webview) {
        if (!this.core) {
            return;
        }

        try {
            // 通过 core 的 getConfig 方法获取配置
            const config = this.core.getConfig();
            if (config) {
                webview.postMessage({
                    type: 'configLoaded',
                    config: config
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`加载配置失败：${error}`);
        }
    }

    private async _saveConfig(webview: vscode.Webview, config: ContextoConfig) {
        if (!this.core) {
            return;
        }

        try {
            // 验证配置
            const validation = this._validateConfig(config);
            if (!validation.isValid) {
                webview.postMessage({
                    type: 'validationError',
                    errors: validation.errors
                });
                return;
            }

            // 通过直接操作配置文件来保存
            const fs = await import('fs');
            const configPath = this.core.getConfigPath();
            const configContent = JSON.stringify(config, null, 4);
            fs.writeFileSync(configPath, configContent, 'utf-8');
            
            webview.postMessage({
                type: 'configSaved'
            });

            vscode.window.showInformationMessage('配置保存成功！');
            
            // 重新初始化项目以应用新配置
            vscode.commands.executeCommand('contexto.refresh');

        } catch (error) {
            vscode.window.showErrorMessage(`保存配置失败：${error}`);
            webview.postMessage({
                type: 'saveError',
                error: String(error)
            });
        }
    }

    private async _selectSourceDict(webview: vscode.Webview) {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'JSON 文件': ['json']
            },
            title: '选择源语言字典文件'
        });

        if (files && files.length > 0) {
            const workspaceRoot = this.core?.getWorkspaceRoot();
            if (workspaceRoot) {
                const path = await import('path');
                const relativePath = path.relative(workspaceRoot, files[0].fsPath);
                webview.postMessage({
                    type: 'sourceDictSelected',
                    path: './' + relativePath.replace(/\\/g, '/')
                });
            }
        }
    }

    private async _selectOutputPath(webview: vscode.Webview, index: number) {
        // 先询问用户是要选择文件还是目录
        const choice = await vscode.window.showQuickPick([
            {
                label: '选择现有文件',
                description: '浏览并选择一个现有的 JSON 文件',
                detail: '将直接使用选择的文件路径作为输出路径'
            },
            {
                label: '选择目录',
                description: '选择一个目录，系统会自动生成文件名',
                detail: '文件名格式：[语言代码].json'
            }
        ], {
            placeHolder: '请选择路径类型'
        });

        if (!choice) {
            return; // 用户取消
        }

        if (choice.label === '选择现有文件') {
            // 选择现有文件
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON 文件': ['json']
                },
                title: '选择现有的目标语言文件',
                defaultUri: this.core ? vscode.Uri.file(this.core.getWorkspaceRoot()) : undefined
            });

            if (files && files.length > 0) {
                const workspaceRoot = this.core?.getWorkspaceRoot();
                if (workspaceRoot) {
                    const path = await import('path');
                    const relativePath = path.relative(workspaceRoot, files[0].fsPath);
                    webview.postMessage({
                        type: 'outputPathSelected',
                        index: index,
                        path: './' + relativePath.replace(/\\/g, '/')
                    });
                }
            }
        } else {
            // 选择目录
            const folders = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: '选择输出目录'
            });

            if (folders && folders.length > 0) {
                const workspaceRoot = this.core?.getWorkspaceRoot();
                if (workspaceRoot) {
                    const path = await import('path');
                    const relativePath = path.relative(workspaceRoot, folders[0].fsPath);
                    webview.postMessage({
                        type: 'outputPathSelected',
                        index: index,
                        path: './' + relativePath.replace(/\\/g, '/'),
                        isDirectory: true
                    });
                }
            }
        }
    }

    private async _testAIService(webview: vscode.Webview, aiConfig: any) {
        try {
            webview.postMessage({
                type: 'testingAI'
            });

            // 创建临时的 AI 服务实例进行测试
            const { OpenAIService } = await import('./aiService');
            const aiService = new OpenAIService(aiConfig, 5);
            
            // 执行简单的翻译测试
            const testTasks = [{
                key: 'test',
                source: '你好',
                targetLang: 'en'
            }];

            console.log('开始AI服务测试，配置:', aiConfig);
            const result = await aiService.translateText(testTasks);
            console.log('AI服务测试返回结果:', result);
            
            // AI服务返回的key格式是 'test_en'
            const expectedKey = 'test_en';
            const testResult = result[expectedKey];
            
            if (result && testResult && testResult.trim() && !testResult.startsWith('[翻译失败')) {
                webview.postMessage({
                    type: 'testResult',
                    success: true,
                    result: '测试成功！'
                });
                // 只在页面显示成功消息，不弹出系统提示
                console.log('AI 服务测试成功，翻译结果:', testResult);
            } else {
                // 提供更详细的错误信息
                const availableKeys = Object.keys(result || {});
                const errorMsg = `翻译测试失败。期望的键: ${expectedKey}，返回的结果: ${JSON.stringify(result)}，可用的键: [${availableKeys.join(', ')}]`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('AI服务测试异常:', error);
            webview.postMessage({
                type: 'testResult',
                success: false,
                error: String(error)
            });
            // 移除重复的系统错误提示，只在页面显示
        }
    }

    private _addTargetLang(webview: vscode.Webview) {
        webview.postMessage({
            type: 'addTargetLang'
        });
    }

    private _removeTargetLang(webview: vscode.Webview, index: number) {
        webview.postMessage({
            type: 'removeTargetLang',
            index: index
        });
    }

    private _validateConfig(config: ContextoConfig): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 验证源语言字典
        if (!config.sourceLangDict || config.sourceLangDict.trim() === '') {
            errors.push('源语言字典文件路径不能为空');
        }

        // 验证目标语言
        if (!config.targetLangs || config.targetLangs.length === 0) {
            errors.push('至少需要配置一个目标语言');
        } else {
            config.targetLangs.forEach((lang, index) => {
                if (typeof lang === 'string') {
                    if (!lang.trim()) {
                        errors.push(`第 ${index + 1} 个目标语言代码不能为空`);
                    }
                } else {
                    if (!lang.lang || !lang.lang.trim()) {
                        errors.push(`第 ${index + 1} 个目标语言代码不能为空`);
                    }
                }
            });
        }

        // 验证 AI 服务配置
        if (!config.aiService) {
            errors.push('AI 服务配置不能为空');
        } else {
            if (!config.aiService.type || !config.aiService.type.trim()) {
                errors.push('AI 服务类型不能为空');
            }
            if (!config.aiService.apiKey || !config.aiService.apiKey.trim()) {
                errors.push('API Key 不能为空');
            }
            if (!config.aiService.base || !config.aiService.base.trim()) {
                errors.push('API 基础地址不能为空');
            }
            if (!config.aiService.model || !config.aiService.model.trim()) {
                errors.push('模型名称不能为空');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contexto 配置</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: 13px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 16px 24px;
            margin: 0;
            line-height: 1.4;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        h1 {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 24px 0;
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 8px;
        }

        .section {
            margin-bottom: 24px;
        }

        .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
            padding: 0;
            border: none;
        }

        .form-group {
            margin-bottom: 16px;
            position: relative;
        }

        .form-group::before {
            content: '';
            position: absolute;
            left: -4px;
            top: 0;
            bottom: 0;
            width: 2px;
            background-color: transparent;
            transition: background-color 0.15s ease;
        }

        .form-group:focus-within::before {
            background-color: var(--vscode-focusBorder);
        }

        .form-label {
            display: block;
            margin-bottom: 4px;
            font-weight: 400;
            font-size: 13px;
            color: var(--vscode-foreground);
            cursor: pointer;
        }

        .form-label:hover {
            color: var(--vscode-foreground);
        }

        .form-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 6px;
            line-height: 1.3;
        }

        .form-input, select {
            width: 100%;
            height: 26px;
            padding: 4px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            box-sizing: border-box;
            transition: all 0.15s ease;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .form-input:focus, select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            background-color: var(--vscode-input-background);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--vscode-focusBorder);
        }

        .form-input:hover:not(:read-only):not(:focus), select:hover:not(:focus) {
            border-color: var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
        }

        .form-input.error {
            border-color: var(--vscode-inputValidation-errorBorder);
            background-color: var(--vscode-inputValidation-errorBackground);
        }

        .form-input:read-only {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-descriptionForeground);
            opacity: 0.8;
            box-shadow: none;
            cursor: default;
        }

        .form-input:read-only:hover {
            box-shadow: none;
        }

        .input-group {
            display: flex;
            gap: 6px;
            align-items: stretch;
        }

        .input-group .form-input {
            flex: 1;
        }

        .btn {
            height: 26px;
            padding: 0 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 2px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            transition: all 0.15s ease;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
            transform: translateY(-1px);
        }

        .btn:active {
            transform: translateY(0);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border-color: var(--vscode-button-border);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .btn-danger {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border-color: var(--vscode-inputValidation-errorBorder);
        }

        .btn-danger:hover {
            background-color: var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-button-foreground);
        }

        .btn-small {
            height: 22px;
            padding: 0 8px;
            font-size: 11px;
        }

        .settings-group {
            background-color: var(--vscode-editor-background);
            padding: 0;
            margin-bottom: 0;
        }

        .target-lang-item {
            display: flex;
            gap: 6px;
            align-items: stretch;
            margin-bottom: 8px;
            padding: 8px;
            background: var(--vscode-editor-background);
            border: 1px solid transparent;
            border-radius: 3px;
            transition: all 0.15s ease;
        }

        .target-lang-item:hover {
            background-color: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-input-border);
        }

        .target-lang-item:focus-within {
            background-color: var(--vscode-list-focusBackground);
            border-color: var(--vscode-focusBorder);
        }

        .target-lang-item .form-input {
            flex: 1;
            margin: 0;
        }

        .ignore-item {
            display: flex;
            gap: 6px;
            align-items: stretch;
            margin-bottom: 8px;
            padding: 8px;
            background: var(--vscode-editor-background);
            border: 1px solid transparent;
            border-radius: 3px;
            transition: all 0.15s ease;
        }

        .ignore-item:hover {
            background-color: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-input-border);
        }

        .ignore-item:focus-within {
            background-color: var(--vscode-list-focusBackground);
            border-color: var(--vscode-focusBorder);
        }

        .ignore-item .form-input {
            flex: 1;
        }

        .list-container {
            background: none;
            border: none;
            padding: 0;
            margin-bottom: 8px;
        }

        .list-container:empty {
            min-height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            font-size: 12px;
        }

        .list-container:empty::after {
            content: '暂无配置项';
        }

        .error-message {
            color: var(--vscode-inputValidation-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 8px 12px;
            border-radius: 2px;
            margin-top: 8px;
            font-size: 12px;
        }

        .success-message {
            color: var(--vscode-terminal-ansiGreen);
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-terminal-ansiGreen);
            padding: 8px 12px;
            border-radius: 2px;
            margin-top: 8px;
            font-size: 12px;
        }

        .actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-widget-border);
        }

        .loading {
            opacity: 0.6;
            pointer-events: none;
        }

        .test-result {
            margin-top: 6px;
            padding: 6px 8px;
            border-radius: 2px;
            font-size: 12px;
        }

        .test-result.success {
            color: var(--vscode-terminal-ansiGreen);
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-terminal-ansiGreen);
        }

        .test-result.error {
            color: var(--vscode-inputValidation-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }

        .required {
            color: var(--vscode-inputValidation-errorForeground);
        }

        .add-button-container {
            margin-top: 8px;
            padding-top: 0;
            border-top: none;
        }

        /* 移除过多的焦点样式 */
        .target-lang-item:focus-within,
        .ignore-item:focus-within {
            /* 移除额外边框 */
        }

        /* 简化空状态样式 */
        .empty-state {
            text-align: center;
            padding: 12px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Contexto 配置</h1>
        
        <div class="section">
            <div class="section-title">基础配置</div>
            
            <div class="form-group">
                <label class="form-label">源语言字典文件</label>
                <div class="form-description">请选择您项目原始语种字典文件，后面的分析、翻译都以该字典文件为基准。</div>
                <div class="input-group">
                    <input type="text" id="sourceLangDict" class="form-input" placeholder="./locales/zh-CN.json" readonly />
                    <button class="btn btn-secondary" onclick="selectSourceDict()">浏览</button>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">目标语言配置</div>
            <div class="form-description">配置需要翻译到的目标语言。可以只指定语言代码（使用默认路径），也可以选择现有文件或目录</div>
            
            <div class="list-container" id="targetLangsContainer">
                <!-- 目标语言项将通过 JavaScript 动态生成 -->
            </div>
            
            <div class="add-button-container">
                <button class="btn btn-secondary" onclick="addTargetLang()">+ 添加目标语言</button>
            </div>
        </div>

        <div class="section">
            <div class="section-title">忽略路径配置</div>
            <div class="form-description">指定在扫描文本项上下文时需要忽略的文件或目录路径</div>
            
            <div class="list-container" id="ignoreContainer">
                <!-- 忽略路径项将通过 JavaScript 动态生成 -->
            </div>
            
            <div class="add-button-container">
                <button class="btn btn-secondary" onclick="addIgnorePath()">+ 添加忽略路径</button>
            </div>
        </div>

        <div class="section">
            <div class="section-title">AI 服务配置</div>
            
            <div class="settings-group">
                <div class="form-group">
                    <label class="form-label">服务类型 <span class="required">*</span></label>
                    <div class="form-description">选择要使用的 AI 翻译服务类型</div>
                    <select id="aiServiceType" class="form-input">
                        <option value="openai">OpenAI</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">API Key <span class="required">*</span></label>
                    <div class="form-description">您的 AI 服务 API 密钥</div>
                    <input type="password" id="apiKey" class="form-input" placeholder="sk-..." />
                </div>

                <div class="form-group">
                    <label class="form-label">API 基础地址 <span class="required">*</span></label>
                    <div class="form-description">AI 服务的 API 基础 URL 地址</div>
                    <input type="text" id="apiBase" class="form-input" placeholder="https://api.openai.com/v1" />
                </div>

                <div class="form-group">
                    <label class="form-label">模型名称 <span class="required">*</span></label>
                    <div class="form-description">使用的 AI 模型名称</div>
                    <input type="text" id="model" class="form-input" placeholder="gpt-4" />
                </div>

                <div class="form-group">
                    <button class="btn btn-secondary" onclick="testAIService()" id="testBtn">测试连接</button>
                    <div id="testResult"></div>
                </div>
            </div>
        </div>

        <div class="actions">
            <button class="btn btn-secondary" onclick="loadConfig()">重新加载</button>
            <button class="btn" onclick="saveConfig()" id="saveBtn">保存配置</button>
        </div>

        <div id="errorContainer"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentConfig = {};

        // 页面加载时请求配置
        window.addEventListener('load', () => {
            loadConfig();
        });

        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'configLoaded':
                    currentConfig = message.config;
                    populateForm(message.config);
                    break;
                case 'configSaved':
                    showSuccess('配置保存成功！');
                    setLoading(false);
                    break;
                case 'validationError':
                    showErrors(message.errors);
                    setLoading(false);
                    break;
                case 'saveError':
                    showError('保存失败：' + message.error);
                    setLoading(false);
                    break;
                case 'sourceDictSelected':
                    document.getElementById('sourceLangDict').value = message.path;
                    break;
                case 'outputPathSelected':
                    const pathInput = document.querySelector(\`#targetLang_\${message.index}_path\`);
                    if (pathInput) {
                        if (message.isDirectory) {
                            // 如果选择的是目录，需要结合语言代码生成完整路径
                            const langInput = document.querySelector(\`#targetLang_\${message.index}_lang\`);
                            const langCode = langInput ? langInput.value.trim() : '';
                            if (langCode) {
                                pathInput.value = \`\${message.path}/\${langCode}.json\`;
                            } else {
                                pathInput.value = message.path;
                                // 提示用户需要先填写语言代码
                                pathInput.placeholder = '请先填写语言代码，然后重新选择目录';
                            }
                        } else {
                            // 直接使用选择的文件路径
                            pathInput.value = message.path;
                        }
                    }
                    break;
                case 'testingAI':
                    setTestLoading(true);
                    break;
                case 'testResult':
                    setTestLoading(false);
                    if (message.success) {
                        showTestResult(true, '测试成功！');
                    } else {
                        showTestResult(false, '测试失败：' + message.error);
                    }
                    break;
                case 'addTargetLang':
                    addTargetLangItem();
                    break;
                case 'removeTargetLang':
                    removeTargetLangItem(message.index);
                    break;
            }
        });

        function loadConfig() {
            vscode.postMessage({ type: 'loadConfig' });
        }

        function saveConfig() {
            const config = collectFormData();
            if (config) {
                setLoading(true);
                vscode.postMessage({ 
                    type: 'saveConfig', 
                    config: config 
                });
            }
        }

        function selectSourceDict() {
            vscode.postMessage({ type: 'selectSourceDict' });
        }

        function selectOutputPath(index) {
            vscode.postMessage({ 
                type: 'selectOutputPath', 
                index: index 
            });
        }

        function testAIService() {
            const aiConfig = {
                type: document.getElementById('aiServiceType').value,
                apiKey: document.getElementById('apiKey').value,
                base: document.getElementById('apiBase').value,
                model: document.getElementById('model').value
            };

            if (!aiConfig.apiKey || !aiConfig.base || !aiConfig.model) {
                showTestResult(false, '请先填写完整的 AI 服务配置');
                return;
            }

            vscode.postMessage({ 
                type: 'testAIService', 
                aiConfig: aiConfig 
            });
        }

        function addTargetLang() {
            addTargetLangItem('', '');
        }

        function addTargetLangItem(lang = '', outputPath = '') {
            const container = document.getElementById('targetLangsContainer');
            const index = container.children.length;
            
            // 移除空状态
            if (container.classList.contains('empty-state')) {
                container.classList.remove('empty-state');
                container.innerHTML = '';
            }
            
            const item = document.createElement('div');
            item.className = 'target-lang-item';
            item.innerHTML = \`
                <input type="text" class="form-input" placeholder="语言代码 (如: en, zh-TW)" 
                       value="\${lang}" id="targetLang_\${index}_lang" 
                       onchange="updateOutputPathForLang(\${index})" />
                <input type="text" class="form-input" placeholder="输出路径 (可选，默认: ./contexto/locales/[lang].json)" 
                       value="\${outputPath}" id="targetLang_\${index}_path" readonly />
                <button class="btn btn-secondary btn-small" onclick="selectOutputPath(\${index})" title="选择输出文件或目录">浏览</button>
                <button class="btn btn-danger btn-small" onclick="removeTargetLang(\${index})">删除</button>
            \`;
            
            container.appendChild(item);
        }

        function updateOutputPathForLang(index) {
            const langInput = document.querySelector(\`#targetLang_\${index}_lang\`);
            const pathInput = document.querySelector(\`#targetLang_\${index}_path\`);
            
            if (langInput && pathInput && pathInput.value) {
                const langCode = langInput.value.trim();
                const currentPath = pathInput.value;
                
                // 检查当前路径是否看起来像是目录路径（以目录结尾，不以.json结尾）
                if (langCode && !currentPath.endsWith('.json') && (currentPath.includes('/') || currentPath === '')) {
                    if (currentPath === '') {
                        // 如果是空路径，使用默认路径
                        pathInput.value = \`./contexto/locales/\${langCode}.json\`;
                    } else {
                        // 如果是目录路径，更新文件名
                        const basePath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
                        pathInput.value = \`\${basePath}\${langCode}.json\`;
                    }
                }
            }
        }

        function removeTargetLang(index) {
            const container = document.getElementById('targetLangsContainer');
            if (container.children.length > 1) {
                container.children[index].remove();
                // 重新分配索引
                Array.from(container.children).forEach((item, newIndex) => {
                    const langInput = item.querySelector('input[id^="targetLang_"][id$="_lang"]');
                    const pathInput = item.querySelector('input[id^="targetLang_"][id$="_path"]');
                    const selectBtn = item.querySelector('button[onclick^="selectOutputPath"]');
                    const removeBtn = item.querySelector('button[onclick^="removeTargetLang"]');
                    
                    if (langInput) langInput.id = \`targetLang_\${newIndex}_lang\`;
                    if (pathInput) pathInput.id = \`targetLang_\${newIndex}_path\`;
                    if (selectBtn) selectBtn.setAttribute('onclick', \`selectOutputPath(\${newIndex})\`);
                    if (removeBtn) removeBtn.setAttribute('onclick', \`removeTargetLang(\${newIndex})\`);
                });
            } else {
                // 如果删除后没有项目了，显示空状态
                container.children[index].remove();
                if (container.children.length === 0) {
                    container.classList.add('empty-state');
                    container.innerHTML = '';
                }
            }
        }

        function addIgnorePath() {
            addIgnorePathItem('');
        }

        function addIgnorePathItem(path = '') {
            const container = document.getElementById('ignoreContainer');
            const index = container.children.length;
            
            // 移除空状态
            if (container.classList.contains('empty-state')) {
                container.classList.remove('empty-state');
                container.innerHTML = '';
            }
            
            const item = document.createElement('div');
            item.className = 'ignore-item';
            item.innerHTML = \`
                <input type="text" class="form-input" placeholder="./node_modules" 
                       value="\${path}" id="ignore_\${index}" />
                <button class="btn btn-danger btn-small" onclick="removeIgnorePath(\${index})">删除</button>
            \`;
            
            container.appendChild(item);
        }

        function removeIgnorePath(index) {
            const container = document.getElementById('ignoreContainer');
            if (container.children.length > 0) {
                container.children[index].remove();
                // 重新分配索引
                Array.from(container.children).forEach((item, newIndex) => {
                    const input = item.querySelector('input');
                    const button = item.querySelector('button');
                    
                    if (input) input.id = \`ignore_\${newIndex}\`;
                    if (button) button.setAttribute('onclick', \`removeIgnorePath(\${newIndex})\`);
                });
                
                // 如果删除后没有项目了，显示空状态
                if (container.children.length === 0) {
                    container.classList.add('empty-state');
                    container.innerHTML = '';
                }
            }
        }

        function populateForm(config) {
            // 填充基础配置
            document.getElementById('sourceLangDict').value = config.sourceLangDict || '';
            
            // 填充目标语言
            const targetLangsContainer = document.getElementById('targetLangsContainer');
            targetLangsContainer.innerHTML = '';
            targetLangsContainer.classList.remove('empty-state');
            
            if (config.targetLangs && config.targetLangs.length > 0) {
                config.targetLangs.forEach(lang => {
                    if (typeof lang === 'string') {
                        addTargetLangItem(lang, '');
                    } else {
                        addTargetLangItem(lang.lang, lang.outputPath || '');
                    }
                });
            } else {
                addTargetLangItem('', '');
            }
            
            // 填充忽略路径
            const ignoreContainer = document.getElementById('ignoreContainer');
            ignoreContainer.innerHTML = '';
            ignoreContainer.classList.remove('empty-state');
            
            if (config.ignore && config.ignore.length > 0) {
                config.ignore.forEach(path => {
                    addIgnorePathItem(path);
                });
            } else {
                addIgnorePathItem('./contexto');
                addIgnorePathItem('./node_modules');
                addIgnorePathItem('./.git');
            }
            
            // 填充 AI 服务配置
            if (config.aiService) {
                document.getElementById('aiServiceType').value = config.aiService.type || 'openai';
                document.getElementById('apiKey').value = config.aiService.apiKey || '';
                document.getElementById('apiBase').value = config.aiService.base || 'https://api.openai.com/v1';
                document.getElementById('model').value = config.aiService.model || 'gpt-4';
            }
        }

        function collectFormData() {
            const config = {
                sourceLangDict: document.getElementById('sourceLangDict').value.trim(),
                targetLangs: [],
                ignore: [],
                aiService: {
                    type: document.getElementById('aiServiceType').value,
                    apiKey: document.getElementById('apiKey').value.trim(),
                    base: document.getElementById('apiBase').value.trim(),
                    model: document.getElementById('model').value.trim()
                }
            };

            // 收集目标语言
            const targetLangsContainer = document.getElementById('targetLangsContainer');
            Array.from(targetLangsContainer.children).forEach((item, index) => {
                const langInput = item.querySelector(\`#targetLang_\${index}_lang\`);
                const pathInput = item.querySelector(\`#targetLang_\${index}_path\`);
                
                if (langInput && langInput.value.trim()) {
                    const lang = langInput.value.trim();
                    const outputPath = pathInput ? pathInput.value.trim() : '';
                    
                    if (outputPath) {
                        config.targetLangs.push({
                            lang: lang,
                            outputPath: outputPath
                        });
                    } else {
                        config.targetLangs.push(lang);
                    }
                }
            });

            // 收集忽略路径
            const ignoreContainer = document.getElementById('ignoreContainer');
            Array.from(ignoreContainer.children).forEach((item, index) => {
                const input = item.querySelector(\`#ignore_\${index}\`);
                if (input && input.value.trim()) {
                    config.ignore.push(input.value.trim());
                }
            });

            return config;
        }

        function setLoading(loading) {
            const saveBtn = document.getElementById('saveBtn');
            const container = document.querySelector('.container');
            
            if (loading) {
                saveBtn.disabled = true;
                saveBtn.textContent = '保存中...';
                container.classList.add('loading');
            } else {
                saveBtn.disabled = false;
                saveBtn.textContent = '保存配置';
                container.classList.remove('loading');
            }
        }

        function setTestLoading(loading) {
            const testBtn = document.getElementById('testBtn');
            
            if (loading) {
                testBtn.disabled = true;
                testBtn.textContent = '测试中...';
            } else {
                testBtn.disabled = false;
                testBtn.textContent = '测试连接';
            }
        }

        function showTestResult(success, message) {
            const container = document.getElementById('testResult');
            container.innerHTML = \`<div class="test-result \${success ? 'success' : 'error'}">\${message}</div>\`;
        }

        function showErrors(errors) {
            const container = document.getElementById('errorContainer');
            const errorHtml = errors.map(error => \`<div class="error-message">\${error}</div>\`).join('');
            container.innerHTML = errorHtml;
            
            // 滚动到错误区域
            container.scrollIntoView({ behavior: 'smooth' });
        }

        function showError(message) {
            showErrors([message]);
        }

        function showSuccess(message) {
            const container = document.getElementById('errorContainer');
            container.innerHTML = \`<div class="success-message">\${message}</div>\`;
            
            // 3秒后清除消息
            setTimeout(() => {
                container.innerHTML = '';
            }, 3000);
        }
    </script>
</body>
</html>`;
    }
}
