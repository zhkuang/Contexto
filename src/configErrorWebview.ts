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

        // 优先使用编译输出目录，如果不存在则回退到源码目录
        let htmlPath = path.join(__dirname, 'webview', 'configErrorWebview.html');
        let jsPath = path.join(__dirname, 'webview', 'configErrorWebview.js');
        
        // 如果编译输出目录中没有webview文件，使用源码目录（开发时）
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'configErrorWebview.html');
            jsPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'configErrorWebview.js');
        }
        
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 创建脚本资源URI
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(jsPath));
        
        // 生成错误和警告部分的HTML
        const errorsSection = errors.length > 0 ? `
                    <div class="issue-section">
                        <div class="issue-title error-title">
                            <span>❌</span>
                            <span>错误 (必须修复)</span>
                        </div>
                        ${errors.map(error => `
                            <div class="issue-item error-item">${error}</div>
                        `).join('')}
                    </div>
                    ` : '';
                    
        const warningsSection = warnings.length > 0 ? `
                    <div class="issue-section">
                        <div class="issue-title warning-title">
                            <span>⚠️</span>
                            <span>警告 (建议修复)</span>
                        </div>
                        ${warnings.map(warning => `
                            <div class="issue-item warning-item">${warning}</div>
                        `).join('')}
                    </div>
                    ` : '';
        
        // 替换模板中的占位符
        htmlContent = htmlContent.replace('{{SCRIPT_URI}}', scriptUri.toString());
        htmlContent = htmlContent.replace('{{ERRORS_SECTION}}', errorsSection);
        htmlContent = htmlContent.replace('{{WARNINGS_SECTION}}', warningsSection);
        
        return htmlContent;
    }
}
