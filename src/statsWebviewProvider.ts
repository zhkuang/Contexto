import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';
import { I18nCache } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class StatsWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'contexto.stats';

    private _view?: vscode.WebviewView;
    private core: ContextoCore | null = null;

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

        this._updateWebview();

        // 监听消息
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'refresh':
                    this._updateWebview();
                    break;
            }
        });
    }

    public setCore(core: ContextoCore | null) {
        this.core = core;
        this._updateWebview();
    }

    private _updateWebview() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview();
        }
    }

    private _getHtmlForWebview(): string {
        if (!this.core || !this.core.hasValidConfig()) {
            return this._getEmptyStateHtml();
        }

        const stats = this._calculateStats();
        return this._getStatsHtml(stats);
    }

    private _calculateStats() {
        const config = this.core!.getConfig()!;
        const analysis = this.core!.getAnalysis();
        const cache = this.core!.getCache();

        // 原始字典文件中的key数量
        let originalKeysCount = 0;
        try {
            const sourceDictPath = path.resolve(this.core!.getWorkspaceRoot(), config.sourceLangDict);
            if (fs.existsSync(sourceDictPath)) {
                const content = fs.readFileSync(sourceDictPath, 'utf-8');
                const sourceDict = JSON.parse(content);
                originalKeysCount = this._countFlatKeys(sourceDict);
            }
        } catch (error) {
            console.error('读取源字典文件失败:', error);
        }

        // 未使用的key数量 (这里用obsoleteKeys代替unusedKeys)
        const unusedKeysCount = analysis?.obsoleteKeys?.length || 0;

        // 缓存中的key数量（按语言分组）
        const cacheStats = this._calculateCacheStats(cache, config.targetLangs);

        return {
            originalKeysCount,
            unusedKeysCount,
            cacheStats,
            targetLanguages: config.targetLangs
        };
    }

    private _countFlatKeys(obj: any, prefix = ''): number {
        let count = 0;
        for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                count += this._countFlatKeys(obj[key], fullKey);
            } else {
                count++;
            }
        }
        return count;
    }

    private _calculateCacheStats(cache: I18nCache, targetLanguages: string[]) {
        const stats: { [language: string]: number } = {};
        const totalCacheKeys = Object.keys(cache).length;

        // 初始化统计
        targetLanguages.forEach(lang => {
            stats[lang] = 0;
        });

        // 统计每种语言的翻译数量
        Object.values(cache).forEach(item => {
            if (item.translations) {
                Object.keys(item.translations).forEach(lang => {
                    if (stats.hasOwnProperty(lang)) {
                        stats[lang]++;
                    }
                });
            }
        });

        return {
            totalKeys: totalCacheKeys,
            byLanguage: stats
        };
    }

    private _getEmptyStateHtml(): string {
        return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>统计数据</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                }
                .empty-state {
                    text-align: center;
                    color: var(--vscode-descriptionForeground);
                }
            </style>
        </head>
        <body>
            <div class="empty-state">
                <p>请先初始化项目并配置有效的源语言字典</p>
            </div>
        </body>
        </html>`;
    }

    private _getStatsHtml(stats: any): string {
        const languageStatsHtml = Object.entries(stats.cacheStats.byLanguage)
            .map(([lang, count]) => {
                const total = stats.cacheStats.totalKeys;
                const percentage = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                const statusClass = percentage === 100 ? 'success' : percentage > 50 ? '' : 'warning';
                
                return `
                <div class="stat-item">
                    <span class="stat-label">${lang} (${percentage}%)</span>
                    <span class="stat-value ${statusClass}">${count}</span>
                </div>
            `;}).join('');

        return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>统计数据</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 16px;
                    line-height: 1.4;
                }
                
                .stats-container {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                .overview-cards {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 8px;
                }
                
                .overview-card {
                    background: var(--vscode-inputOption-hoverBackground);
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                }
                
                .overview-number {
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--vscode-charts-blue);
                    display: block;
                    margin-bottom: 4px;
                }
                
                .overview-label {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .stat-group {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 16px;
                    background-color: var(--vscode-editor-background);
                }
                
                .stat-group-title {
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: var(--vscode-foreground);
                    font-size: 14px;
                }
                
                .stat-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }
                
                .stat-item:last-child {
                    border-bottom: none;
                }
                
                .stat-label {
                    color: var(--vscode-descriptionForeground);
                    font-size: 13px;
                }
                
                .stat-value {
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    font-size: 14px;
                }
                
                .stat-value.highlight {
                    color: var(--vscode-charts-blue);
                    font-size: 16px;
                }
                
                .stat-value.warning {
                    color: var(--vscode-charts-orange);
                }
                
                .stat-value.success {
                    color: var(--vscode-charts-green);
                }
                
                .refresh-button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 16px;
                    width: 100%;
                    font-size: 13px;
                }
                
                .refresh-button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .total-cache {
                    background-color: var(--vscode-inputOption-hoverBackground);
                    border-radius: 4px;
                    padding: 4px 8px;
                }
            </style>
        </head>
        <body>
            <div class="stats-container">
                <div class="stat-group">
                    <div class="stat-group-title">源字典分析</div>
                    <div class="stat-item">
                        <span class="stat-label">原始Key总数</span>
                        <span class="stat-value highlight">${stats.originalKeysCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">废弃Key数量</span>
                        <span class="stat-value ${stats.unusedKeysCount > 0 ? 'warning' : ''}">${stats.unusedKeysCount}</span>
                    </div>
                </div>
                
                <div class="stat-group">
                    <div class="stat-group-title">翻译缓存</div>
                    <div class="stat-item">
                        <span class="stat-label">已处理Key数量</span>
                        <span class="stat-value total-cache">${stats.cacheStats.totalKeys}</span>
                    </div>
                </div>
                
                <div class="stat-group">
                    <div class="stat-group-title">各语言翻译进度</div>
                    ${languageStatsHtml}
                </div>
                
                <button class="refresh-button" onclick="refreshStats()">刷新数据</button>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function refreshStats() {
                    vscode.postMessage({ type: 'refresh' });
                }
            </script>
        </body>
        </html>`;
    }
}
