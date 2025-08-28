import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';

export class WelcomeWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'contexto.welcome';
    
    private _view?: vscode.WebviewView;

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
                case 'initProject':
                    vscode.commands.executeCommand('contexto.initProject');
                    break;
            }
        });
    }

    public setCore(core: ContextoCore | null) {
        this._core = core;
        this.refresh();
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const isInitialized = this._core ? this._core.isInitialized() : false;
        
        if (isInitialized) {
            // 如果已初始化，隐藏此webview
            return `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { display: none; }
                    </style>
                </head>
                <body></body>
                </html>`;
        }

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Contexto Welcome</title>
                <style>
                    body {
                        padding: 20px 16px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        line-height: 1.4;
                        margin: 0;
                    }
                    .welcome-container {
                        text-align: center;
                        max-width: 400px;
                        margin: 0 auto;
                    }
                    .logo {
                        font-size: 48px;
                        margin-bottom: 16px;
                    }
                    .title {
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 12px;
                        color: var(--vscode-foreground);
                    }
                    .description {
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 24px;
                        line-height: 1.6;
                    }
                    .features {
                        text-align: left;
                        margin-bottom: 32px;
                        background: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        padding: 16px;
                        border-radius: 4px;
                    }
                    .feature {
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                    }
                    .feature-icon {
                        margin-right: 8px;
                        width: 16px;
                    }
                    .init-button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 12px 24px;
                        font-size: 14px;
                        font-weight: 500;
                        border-radius: 4px;
                        cursor: pointer;
                        width: 100%;
                        max-width: 280px;
                        margin: 0 auto;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: background-color 0.2s ease;
                    }
                    .init-button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .init-button:focus {
                        outline: 1px solid var(--vscode-focusBorder);
                        outline-offset: 2px;
                    }
                    .button-icon {
                        font-size: 16px;
                    }
                    .hint {
                        margin-top: 20px;
                        font-size: 12px;
                        color: var(--vscode-descriptionForeground);
                        opacity: 0.8;
                    }
                </style>
            </head>
            <body>
                <div class="welcome-container">
                    <div class="logo">🌍</div>
                    <div class="title">欢迎使用 Contexto</div>
                    <div class="description">
                        专为软件工程师打造的免费UI文案本土化工具，让您的应用文案更贴近目标用户的表达习惯
                    </div>
                    
                    <div class="features">
                        <div class="feature">
                            <span class="feature-icon">🎯</span>
                            <span>针对UI场景的本土化表达，而非直译</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">🤖</span>
                            <span>AI理解业务场景，提供准确自然的文案</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">✨</span>
                            <span>符合目标语种用户习惯的语法和表达</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">🆓</span>
                            <span>完全免费，专注开发体验</span>
                        </div>
                    </div>

                    <button class="init-button" onclick="initProject()">
                        <span class="button-icon">🚀</span>
                        <span>开始本土化之旅</span>
                    </button>
                    
                    <div class="hint">
                        配置您的AI服务，让软件文案更贴近用户心声
                    </div>
                </div>

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
}
