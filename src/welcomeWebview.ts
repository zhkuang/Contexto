import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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

        // 优先使用编译输出目录，如果不存在则回退到源码目录
        let htmlPath = path.join(__dirname, 'webview', 'welcomeWebview.html');
        let jsPath = path.join(__dirname, 'webview', 'welcomeWebview.js');
        
        // 如果编译输出目录中没有webview文件，使用源码目录（开发时）
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'welcomeWebview.html');
            jsPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'welcomeWebview.js');
        }
        
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 创建脚本资源URI
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(jsPath));
        
        // 替换模板中的占位符
        htmlContent = htmlContent.replace('{{SCRIPT_URI}}', scriptUri.toString());
        
        return htmlContent;
    }
}
