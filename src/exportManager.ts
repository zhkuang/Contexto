import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ContextoConfig, I18nCache, ExportResult, TargetLangConfig, ExportOptions } from './types';
import { DictParserManager } from './parsers/dictParsers';

export class ExportManager {
    private workspaceRoot: string;
    private contextoDir: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.contextoDir = path.join(workspaceRoot, 'contexto');
    }

    /**
     * 导出翻译文件
     */
    async exportTranslations(config: ContextoConfig, cache: I18nCache, options?: ExportOptions): Promise<ExportResult> {
        const result: ExportResult = {
            success: true,
            exportedFiles: [],
            errors: [],
            warnings: []
        };

        // 设置默认选项
        const exportOptions: ExportOptions = {
            fallbackStrategy: 'skip', // 默认跳过未翻译的键
            includeMissingTranslations: false,
            ...options
        };

        try {
            // 1. 验证导出前提条件
            const validation = this.validateExportConditions(config, cache);
            if (!validation.isValid) {
                result.success = false;
                result.errors = validation.errors;
                return result;
            }

            // 2. 获取源文件的键列表和数据
            const sourceFilePath = path.resolve(this.workspaceRoot, config.sourceLangDict);
            const parserManager = new DictParserManager();
            const sourceData = await parserManager.parseDict(sourceFilePath);
            const sourceKeys = Object.keys(sourceData);
            
            console.log(`开始导出 ${sourceKeys.length} 个键到 ${config.targetLangs.length} 个目标语种`);
            
            // 3. 为每个目标语种导出文件
            for (const targetLangItem of config.targetLangs) {
                try {
                    const langConfig = this.normalizeTargetLang(targetLangItem);
                    const exportPath = this.getExportPath(config.sourceLangDict, langConfig);
                    
                    const langResult = await this.exportSingleLanguage(langConfig.lang, sourceKeys, sourceData, cache, exportPath, exportOptions);
                    result.exportedFiles.push(exportPath);
                    
                    // 收集警告信息
                    if (langResult.missingCount > 0) {
                        result.warnings?.push(`语种 ${langConfig.lang}: ${langResult.missingCount} 个键缺少翻译`);
                    }
                    
                } catch (error) {
                    const langStr = typeof targetLangItem === 'string' ? targetLangItem : targetLangItem.lang;
                    result.errors.push(`导出语种 ${langStr} 失败: ${error}`);
                    result.success = false;
                }
            }
            
            if (result.success) {
                console.log(`导出完成！已导出 ${result.exportedFiles.length} 个文件`);
            }

        } catch (error) {
            result.success = false;
            result.errors.push(`导出过程中发生错误: ${error}`);
        }

        return result;
    }

    /**
     * 验证导出前提条件
     */
    private validateExportConditions(config: ContextoConfig, cache: I18nCache): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 检查缓存是否为空
        if (!cache || Object.keys(cache).length === 0) {
            errors.push('i18n.json 缓存为空，请先执行翻译操作');
        }

        // 检查目标语种配置
        if (!config.targetLangs || config.targetLangs.length === 0) {
            errors.push('config.json 中未配置目标语种 (targetLangs)');
        }

        // 检查源文件是否存在
        const sourceFilePath = path.resolve(this.workspaceRoot, config.sourceLangDict);
        if (!fs.existsSync(sourceFilePath)) {
            errors.push(`源语言字典文件不存在: ${sourceFilePath}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 标准化目标语种配置
     */
    private normalizeTargetLang(targetLangItem: string | TargetLangConfig): TargetLangConfig {
        if (typeof targetLangItem === 'string') {
            return { lang: targetLangItem };
        }
        return targetLangItem;
    }

    /**
     * 获取导出路径
     */
    private getExportPath(sourceLangDict: string, langConfig: TargetLangConfig): string {
        if (langConfig.outputPath) {
            // 用户指定了输出路径
            return path.resolve(this.workspaceRoot, langConfig.outputPath);
        }

        // 使用默认路径：contexto/locales/语种代码.扩展名
        const sourceExt = path.extname(sourceLangDict);
        const defaultLocalesDir = path.join(this.contextoDir, 'locales');
        
        // 确保目录存在
        if (!fs.existsSync(defaultLocalesDir)) {
            fs.mkdirSync(defaultLocalesDir, { recursive: true });
        }

        return path.join(defaultLocalesDir, `${langConfig.lang}${sourceExt}`);
    }

    /**
     * 导出单个语种的翻译文件
     */
    private async exportSingleLanguage(
        lang: string, 
        sourceKeys: string[], 
        sourceData: Record<string, string>,
        cache: I18nCache, 
        exportPath: string,
        options: ExportOptions
    ): Promise<{ missingCount: number }> {
        // 准备翻译数据，只包含源文件中存在的键
        const translationData: Record<string, string> = {};
        let missingTranslations = 0;
        
        for (const key of sourceKeys) {
            const cacheItem = cache[key];
            if (cacheItem && cacheItem.translations && cacheItem.translations[lang]) {
                // 使用缓存中的翻译
                translationData[key] = cacheItem.translations[lang];
            } else {
                // 根据fallback策略处理未翻译的键
                const fallbackValue = this.getFallbackValue(key, sourceData[key], lang, options.fallbackStrategy || 'skip');
                if (fallbackValue !== null) {
                    translationData[key] = fallbackValue;
                }
                missingTranslations++;
            }
        }

        if (missingTranslations > 0) {
            console.log(`导出语种 ${lang}: ${missingTranslations} 个键缺少翻译`);
        }

        // 根据文件格式导出
        const ext = path.extname(exportPath).toLowerCase();
        await this.writeFileByFormat(exportPath, translationData, ext);
        
        return { missingCount: missingTranslations };
    }

    /**
     * 根据策略获取fallback值
     */
    private getFallbackValue(key: string, sourceValue: string, targetLang: string, strategy: string): string | null {
        switch (strategy) {
            case 'skip':
                // 跳过未翻译的键，不包含在导出文件中
                return null;
            case 'source':
                // 使用源文件文本
                return sourceValue || key;
            case 'placeholder':
                // 使用占位符
                return `[需要${targetLang}翻译: ${sourceValue || key}]`;
            case 'key':
                // 使用键名
                return key;
            default:
                return null;
        }
    }

    /**
     * 根据文件格式写入翻译数据
     */
    private async writeFileByFormat(filePath: string, data: Record<string, string>, format: string): Promise<void> {
        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        switch (format) {
            case '.json':
                await this.writeJsonFile(filePath, data);
                break;
            case '.xml':
                await this.writeAndroidXmlFile(filePath, data);
                break;
            case '.strings':
                await this.writeIOSStringsFile(filePath, data);
                break;
            case '.arb':
                await this.writeArbFile(filePath, data);
                break;
            default:
                // 默认使用JSON格式
                await this.writeJsonFile(filePath, data);
                break;
        }
    }

    /**
     * 写入JSON格式文件
     */
    private async writeJsonFile(filePath: string, data: Record<string, string>): Promise<void> {
        // 将平铺的键值对转换为嵌套对象
        const nestedData = this.unflattenObject(data);
        const content = JSON.stringify(nestedData, null, 4);
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 写入Android XML格式文件
     */
    private async writeAndroidXmlFile(filePath: string, data: Record<string, string>): Promise<void> {
        let content = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n';
        
        for (const [key, value] of Object.entries(data)) {
            // 转义XML特殊字符
            const escapedValue = this.escapeXml(value);
            content += `    <string name="${key}">${escapedValue}</string>\n`;
        }
        
        content += '</resources>\n';
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 写入iOS .strings格式文件
     */
    private async writeIOSStringsFile(filePath: string, data: Record<string, string>): Promise<void> {
        let content = '';
        
        for (const [key, value] of Object.entries(data)) {
            // 转义引号
            const escapedValue = value.replace(/"/g, '\\"');
            content += `"${key}" = "${escapedValue}";\n`;
        }
        
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 写入Flutter ARB格式文件
     */
    private async writeArbFile(filePath: string, data: Record<string, string>): Promise<void> {
        // ARB格式本质上是JSON，但可能包含元数据
        const arbData = { ...data };
        const content = JSON.stringify(arbData, null, 2);
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 将平铺的对象转换为嵌套对象
     */
    private unflattenObject(flatObj: Record<string, string>): any {
        const result: any = {};
        
        for (const [key, value] of Object.entries(flatObj)) {
            const keys = key.split('.');
            let current = result;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
        }
        
        return result;
    }

    /**
     * 转义XML特殊字符
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 检查是否有可导出的数据
     */
    hasExportableData(cache: I18nCache): boolean {
        return cache && Object.keys(cache).length > 0;
    }

    /**
     * 获取预览导出文件列表
     */
    getExportPreview(config: ContextoConfig): string[] {
        const files: string[] = [];
        
        for (const targetLangItem of config.targetLangs) {
            const langConfig = this.normalizeTargetLang(targetLangItem);
            const exportPath = this.getExportPath(config.sourceLangDict, langConfig);
            files.push(exportPath);
        }
        
        return files;
    }
}
