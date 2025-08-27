import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ContextoCore } from './contextoCore';
import { ConfigValidation } from './types';

export class ConfigErrorWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'contexto.configError';
    
    private _view?: vscode.WebviewView;
    private _configValidation: ConfigValidation | null = null;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private _core: ContextoCore | null = null
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'openConfig':
                    vscode.commands.executeCommand('contexto.openConfig');
                    break;
                case 'refresh':
                    vscode.commands.executeCommand('contexto.refresh');
                    break;
                case 'createSourceDict':
                    this.createSourceDictionary();
                    break;
            }
        });
    }

    public setCore(core: ContextoCore | null) {
        this._core = core;
        this._configValidation = core?.getConfigValidation() || null;
        this.refresh();
    }

    public refresh() {
        if (this._view) {
            this._configValidation = this._core?.getConfigValidation() || null;
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private async createSourceDictionary() {
        if (!this._core) return;

        const config = this._core.getConfig();
        if (!config?.sourceLangDict) return;

        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspaceRoot) return;

            const sourceDictPath = path.resolve(workspaceRoot, config.sourceLangDict);
            const sourceDictDir = path.dirname(sourceDictPath);

            // 创建目录（如果不存在）
            if (!fs.existsSync(sourceDictDir)) {
                fs.mkdirSync(sourceDictDir, { recursive: true });
            }

            // 创建空的JSON文件
            const emptyDict = {};
            fs.writeFileSync(sourceDictPath, JSON.stringify(emptyDict, null, 2), 'utf-8');

            vscode.window.showInformationMessage(`已创建源语言字典文件: ${config.sourceLangDict}`);
            
            // 刷新状态
            await this._core.initialize();
            vscode.commands.executeCommand('contexto.refresh');

        } catch (error) {
            vscode.window.showErrorMessage(`创建源语言字典文件失败: ${error}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        if (!this._configValidation) {
            return `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <style>body { display: none; }</style>
                </head>
                <body></body>
                </html>`;
        }

        const { errors, warnings } = this._configValidation;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Contexto Config Error</title>
                <style>
                    body {
                        padding: 20px 16px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        line-height: 1.4;
                        margin: 0;
                    }
                    .error-container {
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    .title {
                        font-size: 16px;
                        font-weight: 600;
                        margin-bottom: 16px;
                        color: var(--vscode-errorForeground);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .subtitle {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 20px;
                    }
                    .issue-section {
                        margin-bottom: 24px;
                    }
                    .issue-title {
                        font-size: 14px;
                        font-weight: 500;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .error-title {
                        color: var(--vscode-errorForeground);
                    }
                    .warning-title {
                        color: var(--vscode-notificationsWarningIcon-foreground);
                    }
                    .issue-item {
                        background: var(--vscode-textBlockQuote-background);
                        border-left: 3px solid var(--vscode-textBlockQuote-border);
                        padding: 12px;
                        margin-bottom: 8px;
                        border-radius: 4px;
                        font-size: 13px;
                    }
                    .error-item {
                        border-left-color: var(--vscode-errorForeground);
                        background: color-mix(in srgb, var(--vscode-errorForeground) 5%, var(--vscode-textBlockQuote-background));
                    }
                    .warning-item {
                        border-left-color: var(--vscode-notificationsWarningIcon-foreground);
                        background: color-mix(in srgb, var(--vscode-notificationsWarningIcon-foreground) 5%, var(--vscode-textBlockQuote-background));
                    }
                    .actions {
                        margin-top: 24px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .action-button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 16px;
                        font-size: 13px;
                        font-weight: 500;
                        border-radius: 4px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        transition: background-color 0.2s ease;
                    }
                    .action-button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .action-button.secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    .action-button.secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    .create-button {
                        background: var(--vscode-inputValidation-infoBackground);
                        color: var(--vscode-inputValidation-infoForeground);
                        border: 1px solid var(--vscode-inputValidation-infoBorder);
                    }
                    .create-button:hover {
                        opacity: 0.9;
                    }
                    .tips {
                        margin-top: 20px;
                        padding: 12px;
                        background: var(--vscode-textCodeBlock-background);
                        border-radius: 4px;
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="title">
                        <span>⚠️</span>
                        <span>配置异常</span>
                    </div>
                    <div class="subtitle">
                        Contexto 检测到配置文件存在问题，请修复后继续使用
                    </div>

                    ${errors.length > 0 ? `
                    <div class="issue-section">
                        <div class="issue-title error-title">
                            <span>❌</span>
                            <span>错误 (必须修复)</span>
                        </div>
                        ${errors.map(error => `
                            <div class="issue-item error-item">${error}</div>
                        `).join('')}
                    </div>
                    ` : ''}

                    ${warnings.length > 0 ? `
                    <div class="issue-section">
                        <div class="issue-title warning-title">
                            <span>⚠️</span>
                            <span>警告 (建议修复)</span>
                        </div>
                        ${warnings.map(warning => `
                            <div class="issue-item warning-item">${warning}</div>
                        `).join('')}
                    </div>
                    ` : ''}

                    <div class="actions">
                        <button class="action-button" onclick="openConfig()">
                            <span>⚙️</span>
                            <span>打开配置文件</span>
                        </button>
                        
                        ${this.shouldShowCreateButton() ? `
                        <button class="action-button create-button" onclick="createSourceDict()">
                            <span>📁</span>
                            <span>创建源语言字典文件</span>
                        </button>
                        ` : ''}
                        
                        <button class="action-button secondary" onclick="refresh()">
                            <span>🔄</span>
                            <span>重新检测配置</span>
                        </button>
                    </div>

                    <div class="tips">
                        💡 <strong>配置提示:</strong><br>
                        • sourceLangDict: 指定源语言JSON文件路径<br>
                        • targetLangs: 设置目标翻译语言列表<br>
                        • aiService: 配置AI翻译服务信息<br>
                        • ignore: 设置需要忽略的文件和目录
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function openConfig() {
                        vscode.postMessage({ type: 'openConfig' });
                    }
                    
                    function refresh() {
                        vscode.postMessage({ type: 'refresh' });
                    }
                    
                    function createSourceDict() {
                        vscode.postMessage({ type: 'createSourceDict' });
                    }
                </script>
            </body>
            </html>`;
    }

    private shouldShowCreateButton(): boolean {
        if (!this._configValidation?.errors) return false;
        
        return this._configValidation.errors.some(error => 
            error.includes('源语言字典文件不存在')
        );
    }
}
