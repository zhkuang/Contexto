import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';
import { KeyAnalysis } from './types';

export class ContextoWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'contextoWebview';

    private _view?: vscode.WebviewView;
    private core: ContextoCore | null = null;
    private analysis: KeyAnalysis | null = null;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'initProject':
                    vscode.commands.executeCommand('contexto.initProject');
                    break;
                case 'deleteKeys':
                    vscode.commands.executeCommand('contexto.deleteKeys');
                    break;
                case 'translateKeys':
                    vscode.commands.executeCommand('contexto.translateKeys');
                    break;
                case 'refresh':
                    vscode.commands.executeCommand('contexto.refresh');
                    break;
                case 'openConfig':
                    vscode.commands.executeCommand('contexto.openConfig');
                    break;
            }
        });

        this.updateWebview();
    }

    public setCore(core: ContextoCore | null) {
        this.core = core;
        this.updateWebview();
    }

    public setAnalysis(analysis: KeyAnalysis | null) {
        this.analysis = analysis;
        this.updateWebview();
    }

    private updateWebview() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        if (!this.core) {
            return this._getNoProjectHtml();
        }

        if (!this.core.isInitialized()) {
            return this._getUninitializedHtml();
        }

        return this._getInitializedHtml();
    }

    private _getNoProjectHtml(): string {
        return `<!DOCTYPE html>
            <html lang="zh">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Contexto</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        text-align: center;
                    }
                    .button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 20px;
                        margin: 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 14px;
                        min-width: 120px;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .icon {
                        margin-right: 8px;
                    }
                    .description {
                        margin: 20px 0;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <h2>Contexto</h2>
                <p class="description">请先打开一个项目</p>
                <p class="description">Contexto需要在项目中工作才能提供翻译服务</p>
            </body>
            </html>`;
    }

    private _getUninitializedHtml(): string {
        return `<!DOCTYPE html>
            <html lang="zh">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Contexto</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        text-align: center;
                    }
                    .button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 12px 24px;
                        margin: 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 14px;
                        min-width: 140px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .button.primary {
                        background-color: var(--vscode-button-background);
                    }
                    .icon {
                        margin-right: 8px;
                        font-size: 16px;
                    }
                    .description {
                        margin: 20px 0;
                        color: var(--vscode-descriptionForeground);
                        line-height: 1.6;
                    }
                </style>
            </head>
            <body>
                <h2>🌐 Contexto</h2>
                <p class="description">项目尚未初始化</p>
                <p class="description">点击下方按钮初始化Contexto配置，开始享受智能翻译服务</p>
                <button class="button primary" onclick="initProject()">
                    <span class="icon">➕</span>
                    初始化项目
                </button>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function initProject() {
                        vscode.postMessage({
                            type: 'initProject'
                        });
                    }
                </script>
            </body>
            </html>`;
    }

    private _getInitializedHtml(): string {
        const analysis = this.analysis;
        if (!analysis) {
            return this._getLoadingHtml();
        }

        const totalKeys = analysis.newKeys.length + analysis.updatedKeys.length + 
                         analysis.pendingKeys.length + analysis.obsoleteKeys.length;

        return `<!DOCTYPE html>
            <html lang="zh">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Contexto</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 16px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .status-card {
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        padding: 12px;
                        margin: 8px 0;
                        background-color: var(--vscode-editor-background);
                    }
                    .status-title {
                        font-weight: bold;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                    }
                    .status-count {
                        background-color: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        margin-left: auto;
                    }
                    .button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 16px;
                        margin: 8px 4px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 13px;
                        display: inline-flex;
                        align-items: center;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .button.secondary {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    .button.secondary:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }
                    .button.danger {
                        background-color: var(--vscode-inputValidation-errorBackground);
                        color: var(--vscode-inputValidation-errorForeground);
                    }
                    .icon {
                        margin-right: 6px;
                    }
                    .actions {
                        margin-top: 20px;
                        text-align: center;
                    }
                    .summary {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 16px;
                    }
                    .empty-state {
                        text-align: center;
                        color: var(--vscode-descriptionForeground);
                        margin: 40px 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>🌐 Contexto</h2>
                </div>
                
                ${totalKeys === 0 ? `
                    <div class="empty-state">
                        <p>✅ 所有翻译都是最新的</p>
                        <p>没有需要处理的翻译Key</p>
                    </div>
                ` : `
                    <div class="summary">
                        共发现 <strong>${totalKeys}</strong> 个待处理的翻译Key
                    </div>
                `}
                
                ${analysis.newKeys.length > 0 ? `
                <div class="status-card">
                    <div class="status-title">
                        <span>🆕 新增Key</span>
                        <span class="status-count">${analysis.newKeys.length}</span>
                    </div>
                </div>
                ` : ''}
                
                ${analysis.updatedKeys.length > 0 ? `
                <div class="status-card">
                    <div class="status-title">
                        <span>📝 更新Key</span>
                        <span class="status-count">${analysis.updatedKeys.length}</span>
                    </div>
                </div>
                ` : ''}
                
                ${analysis.pendingKeys.length > 0 ? `
                <div class="status-card">
                    <div class="status-title">
                        <span>⏳ 待翻译Key</span>
                        <span class="status-count">${analysis.pendingKeys.length}</span>
                    </div>
                </div>
                ` : ''}
                
                ${analysis.obsoleteKeys.length > 0 ? `
                <div class="status-card">
                    <div class="status-title">
                        <span>🗑️ 未使用Key</span>
                        <span class="status-count">${analysis.obsoleteKeys.length}</span>
                    </div>
                </div>
                ` : ''}
                
                <div class="actions">
                    ${(analysis.newKeys.length > 0 || analysis.updatedKeys.length > 0 || analysis.pendingKeys.length > 0) ? `
                    <button class="button" onclick="translateKeys()">
                        <span class="icon">🌐</span>
                        一键翻译
                    </button>
                    ` : ''}
                    
                    ${analysis.obsoleteKeys.length > 0 ? `
                    <button class="button danger" onclick="deleteKeys()">
                        <span class="icon">🗑️</span>
                        删除未使用Key
                    </button>
                    ` : ''}
                    
                    <button class="button secondary" onclick="refresh()">
                        <span class="icon">🔄</span>
                        刷新
                    </button>
                    
                    <button class="button secondary" onclick="openConfig()">
                        <span class="icon">⚙️</span>
                        配置
                    </button>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function deleteKeys() {
                        vscode.postMessage({
                            type: 'deleteKeys'
                        });
                    }
                    
                    function translateKeys() {
                        vscode.postMessage({
                            type: 'translateKeys'
                        });
                    }
                    
                    function refresh() {
                        vscode.postMessage({
                            type: 'refresh'
                        });
                    }
                    
                    function openConfig() {
                        vscode.postMessage({
                            type: 'openConfig'
                        });
                    }
                </script>
            </body>
            </html>`;
    }

    private _getLoadingHtml(): string {
        return `<!DOCTYPE html>
            <html lang="zh">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Contexto</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        padding: 20px;
                        text-align: center;
                    }
                    .spinner {
                        border: 2px solid var(--vscode-progressBar-background);
                        border-top: 2px solid var(--vscode-progressBar-foreground);
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <h2>🌐 Contexto</h2>
                <div class="spinner"></div>
                <p>正在分析项目...</p>
            </body>
            </html>`;
    }
}
