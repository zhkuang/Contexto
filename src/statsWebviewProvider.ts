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

    /**
     * 刷新统计数据
     */
    public refresh() {
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
        const targetLangStrings = config.targetLangs.map(lang => 
            typeof lang === 'string' ? lang : lang.lang
        );
        const cacheStats = this._calculateCacheStats(cache, targetLangStrings);

        return {
            originalKeysCount,
            unusedKeysCount,
            cacheStats,
            targetLanguages: targetLangStrings
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
        // 优先使用编译输出目录，如果不存在则回退到源码目录
        let htmlPath = path.join(__dirname, 'webview', 'statsEmpty.html');
        
        // 如果编译输出目录中没有webview文件，使用源码目录（开发时）
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'statsEmpty.html');
        }
        
        return fs.readFileSync(htmlPath, 'utf8');
    }

    private _getStatsHtml(stats: any): string {
        // 优先使用编译输出目录，如果不存在则回退到源码目录
        let htmlPath = path.join(__dirname, 'webview', 'statsWebview.html');
        
        // 如果编译输出目录中没有webview文件，使用源码目录（开发时）
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'statsWebview.html');
        }
        
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 生成语言统计HTML
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
        
        // 替换模板中的占位符
        htmlContent = htmlContent.replace('{{ORIGINAL_KEYS_COUNT}}', stats.originalKeysCount.toString());
        htmlContent = htmlContent.replace('{{UNUSED_KEYS_COUNT}}', stats.unusedKeysCount.toString());
        htmlContent = htmlContent.replace('{{UNUSED_KEYS_CLASS}}', stats.unusedKeysCount > 0 ? 'warning' : '');
        htmlContent = htmlContent.replace('{{TOTAL_CACHE_KEYS}}', stats.cacheStats.totalKeys.toString());
        htmlContent = htmlContent.replace('{{LANGUAGE_STATS}}', languageStatsHtml);
        
        return htmlContent;
    }
}
