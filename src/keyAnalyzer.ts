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
                console.log(`源字典文件扫描完成：${sourceDictPath}，发现 ${Object.keys(sourceDict).length} 个文本项`);
            } catch (error) {
                vscode.window.showErrorMessage(`源字典文件解析失败：${error}`);
                console.error('解析错误详情:', error);
            }
        } else {
            vscode.window.showWarningMessage(`源字典文件不存在：${this.config.sourceLangDict}，请检查配置路径是否正确（应为相对于项目根目录的路径）`);
            console.log(`源字典文件路径: ${sourceDictPath}`);
        }

        const sourceKeys = new Set(Object.keys(sourceDict));
        const cacheKeys = new Set(Object.keys(cache));

        console.log(`文本项分析开始：源字典包含 ${sourceKeys.size} 个文本项，缓存包含 ${cacheKeys.size} 个文本项`);
        console.log(`目标语言: ${this.config.targetLangs.join(', ')}`);

        // 第一步：找出在源字典中但项目中未被使用的key
        const unusedInProject: string[] = [];
        for (const key of sourceKeys) {
            const referencingFiles = await this.searchKeyInFiles(key);
            if (referencingFiles.length === 0) {
                unusedInProject.push(key);
            }
        }
        const unusedInProjectSet = new Set(unusedInProject);
        console.log(`项目中未使用的key: ${unusedInProject.length} 个`);

        // 第二步：分类处理各种key状态（确保互斥）
        const newKeys: string[] = [];
        const updatedKeys: string[] = [];
        const pendingKeys: string[] = [];
        const obsoleteKeys: string[] = [];

        // 处理源字典中的每个key
        for (const key of sourceKeys) {
            // 如果key在项目中未被使用，直接归类为未使用key
            if (unusedInProjectSet.has(key)) {
                obsoleteKeys.push(key);
                continue;
            }

            // key在项目中有使用，进一步分类
            if (!cacheKeys.has(key)) {
                // 新增key：源字典中新出现且在项目中有引用的key
                newKeys.push(key);
            } else if (cache[key].source !== sourceDict[key]) {
                // 更新key：源文本发生变化的key
                updatedKeys.push(key);
            } else {
                // 检查是否为待翻译key：缓存中有数据但目标语言翻译不完整
                const cacheItem = cache[key];
                const translations = cacheItem.translations || {};
                
                console.log(`检查key "${key}" 的翻译状态:`, {
                    hasTranslationsField: cacheItem.hasOwnProperty('translations'),
                    hasTranslations: !!cacheItem.translations,
                    translationsKeys: Object.keys(translations),
                    targetLangs: this.config.targetLangs,
                    translationsCount: Object.keys(translations).length
                });
                
                // 确保 translations 字段存在
                if (!cacheItem.translations) {
                    cacheItem.translations = {};
                }
                
                const missingTargetLangs = this.config.targetLangs.filter(
                    targetLangItem => {
                        const targetLang = typeof targetLangItem === 'string' ? targetLangItem : targetLangItem.lang;
                        return !translations[targetLang] || translations[targetLang].trim() === '';
                    }
                );
                
                if (missingTargetLangs.length > 0) {
                    console.log(`key "${key}" 缺少翻译的语言:`, missingTargetLangs);
                    pendingKeys.push(key);
                } else {
                    console.log(`文本项 "${key}" 翻译状态完整`);
                }
                // 如果翻译完整，则不需要处理（状态正常）
            }
        }

        // 处理缓存中存在但源字典中不存在的key（已删除的key）
        const deletedFromSource = Array.from(cacheKeys).filter(key => !sourceKeys.has(key));
        obsoleteKeys.push(...deletedFromSource);

        console.log(`Key分析结果:`, {
            newKeys: newKeys.length,
            updatedKeys: updatedKeys.length,
            pendingKeys: pendingKeys.length,
            obsoleteKeys: obsoleteKeys.length
        });

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
