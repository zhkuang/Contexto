import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { ContextoCore } from './contextoCore';
import { I18nCache, TranslationItem } from './types';

export class I18nViewerWebview {
    private panel: vscode.WebviewPanel | undefined;
    private core: ContextoCore | null = null;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public setCore(core: ContextoCore | null) {
        this.core = core;
    }

    public show() {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'i18nViewer',
            'i18n数据查看器',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [this._extensionUri],
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this._getHtmlForWebview();

        // 监听消息
        this.panel.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'refresh':
                    await this._refreshData();
                    break;
                case 'exportExcel':
                    await this._exportToExcel();
                    break;
                case 'importExcel':
                    await this._importFromExcel(data.fileContent, data.fileName);
                    break;
                case 'updateTranslation':
                    await this._updateTranslation(data.key, data.lang, data.value);
                    break;
            }
        });

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private _updateWebview() {
        if (this.panel) {
            this.panel.webview.html = this._getHtmlForWebview();
        }
    }

    private async _refreshData() {
        if (!this.core) {
            return;
        }

        try {
            // 显示加载状态
            if (this.panel) {
                this.panel.webview.postMessage({ type: 'showLoading', message: '正在刷新数据...' });
            }

            // 重新加载缓存数据
            await this.core.reloadCache();
            
            // 更新 webview 显示
            this._updateWebview();
            
            // 隐藏加载状态并显示成功消息
            if (this.panel) {
                this.panel.webview.postMessage({ type: 'hideLoading' });
            }
            vscode.window.showInformationMessage('i18n数据已刷新');
        } catch (error) {
            // 隐藏加载状态并显示错误
            if (this.panel) {
                this.panel.webview.postMessage({ type: 'hideLoading' });
            }
            vscode.window.showErrorMessage(`刷新数据失败: ${error}`);
        }
    }

    private _getHtmlForWebview(): string {
        if (!this.core || !this.core.hasValidConfig()) {
            return this._getEmptyStateHtml();
        }

        const cache = this.core.getCache();
        const config = this.core.getConfig();
        const targetLanguages = config!.targetLangs.map(lang => 
            typeof lang === 'string' ? lang : lang.lang
        );

        return this._getViewerHtml(cache, targetLanguages);
    }

    private _getEmptyStateHtml(): string {
        // 优先使用编译输出目录，如果不存在则回退到源码目录
        let htmlPath = path.join(__dirname, 'webview', 'i18nViewerEmpty.html');
        
        // 如果编译输出目录中没有webview文件，使用源码目录（开发时）
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'i18nViewerEmpty.html');
        }
        
        return fs.readFileSync(htmlPath, 'utf8');
    }

    private _getViewerHtml(cache: I18nCache, targetLanguages: string[]): string {
        const entries = Object.entries(cache);
        
        // 优先使用编译输出目录，如果不存在则回退到源码目录
        let htmlPath = path.join(__dirname, 'webview', 'i18nViewerWebview.html');
        let jsPath = path.join(__dirname, 'webview', 'i18nViewerWebview.js');
        
        // 如果编译输出目录中没有webview文件，使用源码目录（开发时）
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'i18nViewerWebview.html');
            jsPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'i18nViewerWebview.js');
        }
        
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 创建脚本资源URI
        const scriptUri = this.panel!.webview.asWebviewUri(vscode.Uri.file(jsPath));
        
        // 生成表头
        const languageHeaders = targetLanguages.map(lang => `<th class="lang-header">${lang}</th>`).join('');
        
        // 生成表格行
        const tableRows = entries.map(([key, item]) => {
            const languageCells = targetLanguages.map(lang => {
                const translation = item.translations[lang] || '';
                return `<td class="translation-cell" data-key="${key}" data-lang="${lang}">
                    <textarea class="translation-input" 
                              onblur="updateTranslation('${key}', '${lang}', this.value)"
                              placeholder="未翻译">${translation}</textarea>
                </td>`;
            }).join('');

            return `<tr>
                <td class="key-cell">${key}</td>
                <td class="source-cell">${item.source}</td>
                <td class="context-cell">${item.businessContext || ''}</td>
                <td class="context-cell">${item.uiContext || ''}</td>
                ${languageCells}
            </tr>`;
        }).join('');
        
        // 替换模板中的占位符
        htmlContent = htmlContent.replace('{{SCRIPT_URI}}', scriptUri.toString());
        htmlContent = htmlContent.replace('{{STATS_CONTENT}}', `共 ${entries.length} 个翻译键 | 目标语言: ${targetLanguages.join(', ')}`);
        htmlContent = htmlContent.replace('{{LANGUAGE_HEADERS}}', languageHeaders);
        htmlContent = htmlContent.replace('{{TABLE_ROWS}}', tableRows);
        
        return htmlContent;
    }

    private async _exportToExcel() {
        if (!this.core) {
            vscode.window.showErrorMessage('Contexto 项目尚未初始化');
            return;
        }

        try {
            const saveUri = await vscode.window.showSaveDialog({
                filters: {
                    'Excel文件': ['xlsx']
                },
                defaultUri: vscode.Uri.file(path.join(this.core.getWorkspaceRoot(), 'i18n-data.xlsx'))
            });

            if (!saveUri) {
                return;
            }

            await this._generateExcelFile(saveUri.fsPath);
            vscode.window.showInformationMessage(`Excel文件已导出: ${saveUri.fsPath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`导出Excel失败: ${error}`);
        }
    }

    private async _generateExcelFile(filePath: string) {
        const cache = this.core!.getCache();
        const config = this.core!.getConfig();
        const targetLanguages = config!.targetLangs.map(lang => 
            typeof lang === 'string' ? lang : lang.lang
        );

        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        
        // 准备数据
        const headers = ['Key', '原文', '业务上下文', 'UI上下文', ...targetLanguages];
        const data = [headers];

        Object.entries(cache).forEach(([key, item]) => {
            const row = [
                key,
                item.source,
                item.businessContext || '',
                item.uiContext || '',
                ...targetLanguages.map(lang => item.translations[lang] || '')
            ];
            data.push(row);
        });

        // 创建工作表
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        
        // 设置列宽
        const columnWidths = [
            { wch: 30 }, // Key
            { wch: 25 }, // 原文
            { wch: 20 }, // 业务上下文
            { wch: 20 }, // UI上下文
            ...targetLanguages.map(() => ({ wch: 25 })) // 各语言列
        ];
        worksheet['!cols'] = columnWidths;

        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, 'i18n数据');

        // 写入文件
        XLSX.writeFile(workbook, filePath);
    }

    private async _importFromExcel(fileContent: ArrayBuffer, fileName: string) {
        try {
            // 读取 Excel 文件
            const workbook = XLSX.read(fileContent, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // 转换为 JSON 数据
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
            
            if (jsonData.length < 2) {
                throw new Error('Excel文件内容格式错误，至少需要标题行和一行数据');
            }

            const headers = jsonData[0];
            const keyIndex = headers.indexOf('Key');
            const sourceIndex = headers.indexOf('原文');
            const businessContextIndex = headers.indexOf('业务上下文');
            const uiContextIndex = headers.indexOf('UI上下文');

            if (keyIndex === -1 || sourceIndex === -1) {
                throw new Error('Excel文件格式错误，缺少必需的列：Key 和 原文');
            }

            // 找到语言列
            const languageColumns: { [lang: string]: number } = {};
            const config = this.core!.getConfig();
            const targetLanguages = config!.targetLangs.map(lang => 
                typeof lang === 'string' ? lang : lang.lang
            );

            targetLanguages.forEach(lang => {
                const index = headers.indexOf(lang);
                if (index !== -1) {
                    languageColumns[lang] = index;
                }
            });

            // 解析数据并更新缓存
            const cache = this.core!.getCache();
            let importCount = 0;
            
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                const key = row[keyIndex]?.trim();
                const source = row[sourceIndex]?.trim();

                if (!key || !source) {
                    continue;
                }

                // 更新或创建翻译项
                if (!cache[key]) {
                    cache[key] = {
                        source,
                        sourceFile: '',
                        businessContext: row[businessContextIndex]?.trim() || '',
                        uiContext: row[uiContextIndex]?.trim() || '',
                        translations: {}
                    };
                    importCount++;
                } else {
                    // 更新现有项
                    cache[key].source = source;
                    if (businessContextIndex !== -1) {
                        cache[key].businessContext = row[businessContextIndex]?.trim() || '';
                    }
                    if (uiContextIndex !== -1) {
                        cache[key].uiContext = row[uiContextIndex]?.trim() || '';
                    }
                    importCount++;
                }

                // 更新翻译
                Object.entries(languageColumns).forEach(([lang, index]) => {
                    const translation = row[index]?.trim() || '';
                    if (translation) {
                        cache[key].translations[lang] = translation;
                    }
                });
            }

            // 保存缓存
            await this.core!.saveCache();
            
            vscode.window.showInformationMessage(`Excel数据导入成功，共处理 ${importCount} 个翻译键`);
            this._updateWebview();
            
        } catch (error) {
            throw new Error(`导入Excel失败: ${error}`);
        }
    }

    private async _showImportDialog() {
        const openUri = await vscode.window.showOpenDialog({
            filters: {
                'Excel文件': ['xlsx', 'xls']
            },
            canSelectMany: false
        });

        if (!openUri || openUri.length === 0) {
            return;
        }

        try {
            const fileContent = fs.readFileSync(openUri[0].fsPath);
            await this._importFromExcel(fileContent.buffer, openUri[0].fsPath);
        } catch (error) {
            vscode.window.showErrorMessage(`导入Excel失败: ${error}`);
        }
    }

    private async _importFromFile(filePath: string) {
        // 这个方法现在被 _importFromExcel 替代，保留作为备用
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('文件内容格式错误，至少需要标题行和一行数据');
        }

        const headers = lines[0].split('\t');
        const keyIndex = headers.indexOf('Key');
        const sourceIndex = headers.indexOf('原文');
        const businessContextIndex = headers.indexOf('业务上下文');
        const uiContextIndex = headers.indexOf('UI上下文');

        if (keyIndex === -1 || sourceIndex === -1) {
            throw new Error('文件格式错误，缺少必需的列：Key 和 原文');
        }

        // 找到语言列
        const languageColumns: { [lang: string]: number } = {};
        const config = this.core!.getConfig();
        const targetLanguages = config!.targetLangs.map(lang => 
            typeof lang === 'string' ? lang : lang.lang
        );

        targetLanguages.forEach(lang => {
            const index = headers.indexOf(lang);
            if (index !== -1) {
                languageColumns[lang] = index;
            }
        });

        // 解析数据并更新缓存
        const cache = this.core!.getCache();
        
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split('\t');
            const key = cells[keyIndex]?.trim();
            const source = cells[sourceIndex]?.trim();

            if (!key || !source) {
                continue;
            }

            // 更新或创建翻译项
            if (!cache[key]) {
                cache[key] = {
                    source,
                    sourceFile: '',
                    businessContext: cells[businessContextIndex]?.trim() || '',
                    uiContext: cells[uiContextIndex]?.trim() || '',
                    translations: {}
                };
            } else {
                // 更新现有项
                cache[key].source = source;
                if (businessContextIndex !== -1) {
                    cache[key].businessContext = cells[businessContextIndex]?.trim() || '';
                }
                if (uiContextIndex !== -1) {
                    cache[key].uiContext = cells[uiContextIndex]?.trim() || '';
                }
            }

            // 更新翻译
            Object.entries(languageColumns).forEach(([lang, index]) => {
                const translation = cells[index]?.trim() || '';
                if (translation) {
                    cache[key].translations[lang] = translation;
                }
            });
        }

        // 保存缓存
        await this.core!.saveCache();
    }

    private async _updateTranslation(key: string, lang: string, value: string) {
        if (!this.core) {
            return;
        }

        const cache = this.core.getCache();
        if (cache[key]) {
            cache[key].translations[lang] = value;
            await this.core.saveCache();
        }
    }
}
