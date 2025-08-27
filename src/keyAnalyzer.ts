import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'fast-glob';
import { ContextoConfig, KeyAnalysis, ScanResult, I18nCache, KeyStatus } from './types';
import { DictParserManager } from './parsers/dictParsers';

export class KeyAnalyzer {
    private config: ContextoConfig;
    private workspaceRoot: string;
    private parserManager: DictParserManager;

    constructor(config: ContextoConfig, workspaceRoot: string) {
        this.config = config;
        this.workspaceRoot = workspaceRoot;
        this.parserManager = new DictParserManager();
    }

    /**
     * 分析Key状态
     */
    async analyzeKeys(cache: I18nCache): Promise<KeyAnalysis> {
        // 扫描原始语种字典
        const sourceDictPath = path.resolve(this.workspaceRoot, this.config.sourceLangDict);
        let sourceDict: ScanResult = {};

        if (fs.existsSync(sourceDictPath)) {
            try {
                sourceDict = await this.parserManager.parseDict(sourceDictPath);
                console.log(`成功扫描源字典文件: ${sourceDictPath}, 找到 ${Object.keys(sourceDict).length} 个Key`);
            } catch (error) {
                vscode.window.showErrorMessage(`解析源字典文件失败: ${error}`);
                console.error('解析错误详情:', error);
            }
        } else {
            vscode.window.showWarningMessage(`源字典文件不存在: ${this.config.sourceLangDict}，请检查配置路径是否正确（应为相对于项目根目录的路径）`);
            console.log(`源字典文件路径: ${sourceDictPath}`);
        }

        const sourceKeys = new Set(Object.keys(sourceDict));
        const cacheKeys = new Set(Object.keys(cache));

        // 新增的key
        const newKeys = Array.from(sourceKeys).filter(key => !cacheKeys.has(key));

        // 需要删除的key
        const obsoleteKeys = Array.from(cacheKeys).filter(key => !sourceKeys.has(key));

        // 更新的key（源文本发生变化）
        const updatedKeys: string[] = [];
        for (const key of sourceKeys) {
            if (cacheKeys.has(key) && cache[key].source !== sourceDict[key]) {
                updatedKeys.push(key);
            }
        }

        // 待翻译的key
        const pendingKeys: string[] = [];
        for (const key of sourceKeys) {
            if (cacheKeys.has(key)) {
                const translations = cache[key].translations;
                for (const targetLang of this.config.targetLangs) {
                    if (!translations[targetLang] || translations[targetLang].trim() === '') {
                        if (!pendingKeys.includes(key)) {
                            pendingKeys.push(key);
                        }
                    }
                }
            }
        }

        return {
            newKeys,
            updatedKeys,
            pendingKeys,
            obsoleteKeys
        };
    }

    /**
     * 搜索包含指定key的文件
     */
    async searchKeyInFiles(key: string): Promise<string[]> {
        const searchPattern = `**/*.{js,ts,jsx,tsx,vue,swift,kt,java,dart,php,py,go,c,cpp,h,hpp}`;
        
        try {
            const files = await glob(searchPattern, {
                cwd: this.workspaceRoot,
                ignore: this.config.ignore
            });

            const matchingFiles: string[] = [];

            for (const file of files) {
                const filePath = path.join(this.workspaceRoot, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    
                    // 检查文件内容是否包含key
                    if (this.containsKey(content, key)) {
                        matchingFiles.push(filePath);
                    }
                } catch (error) {
                    // 忽略无法读取的文件
                    continue;
                }
            }

            return matchingFiles;
        } catch (error) {
            console.error(`搜索文件失败: ${error}`);
            return [];
        }
    }

    /**
     * 检查文件内容是否包含指定的key
     */
    private containsKey(content: string, key: string): boolean {
        // 多种可能的key使用方式
        const patterns = [
            `'${key}'`,
            `"${key}"`,
            `\`${key}\``,
            `t('${key}')`,
            `t("${key}")`,
            `i18n.t('${key}')`,
            `i18n.t("${key}")`,
            `$t('${key}')`,
            `$t("${key}")`,
            `getString("${key}")`,
            `getString('${key}')`,
            `NSLocalizedString(@"${key}"`,
            `NSLocalizedString("${key}"`,
            `R.string.${key}`,
            `context.getString(R.string.${key})`,
            `Intl.message('${key}')`,
            `Intl.message("${key}")`
        ];

        return patterns.some(pattern => content.includes(pattern));
    }

    /**
     * 获取覆盖所有key的最小文件集合
     */
    async getMinimalFileSet(keys: string[]): Promise<Map<string, string[]>> {
        const keyToFiles = new Map<string, string[]>();
        
        // 为每个key搜索相关文件
        for (const key of keys) {
            const files = await this.searchKeyInFiles(key);
            keyToFiles.set(key, files);
        }

        return keyToFiles;
    }

    /**
     * 更新缓存中的源文件信息
     */
    updateSourceFileInfo(cache: I18nCache, keyToFiles: Map<string, string[]>): void {
        for (const [key, files] of keyToFiles) {
            if (cache[key] && files.length > 0) {
                // 使用第一个匹配的文件作为源文件
                cache[key].sourceFile = path.relative(this.workspaceRoot, files[0]);
            }
        }
    }
}
