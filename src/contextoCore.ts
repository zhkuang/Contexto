import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from './configManager';
import { KeyAnalyzer } from './keyAnalyzer';
import { OpenAIService } from './aiService';
import { ExportManager } from './exportManager';
import { ContextoConfig, I18nCache, KeyAnalysis, TranslationTask, TranslationItem, ConfigValidation, ProjectStatus, ExportResult, TargetLangConfig, ExportOptions } from './types';

export class ContextoCore {
    private configManager: ConfigManager;
    private exportManager: ExportManager;
    private keyAnalyzer: KeyAnalyzer | null = null;
    private aiService: OpenAIService | null = null;
    private config: ContextoConfig | null = null;
    private cache: I18nCache = {};
    private analysis: KeyAnalysis | null = null;
    private projectStatus: ProjectStatus = ProjectStatus.UNINITIALIZED;
    private configValidation: ConfigValidation | null = null;

    constructor(workspaceRoot: string) {
        this.configManager = new ConfigManager(workspaceRoot);
        this.exportManager = new ExportManager(workspaceRoot);
    }

    /**
     * 初始化
     */
    async initialize(): Promise<boolean> {
        if (!this.configManager.isProjectInitialized()) {
            console.log('项目未初始化');
            this.projectStatus = ProjectStatus.UNINITIALIZED;
            return false;
        }

        console.log('正在加载项目配置...');
        // 加载配置
        this.config = await this.configManager.loadConfig();
        if (!this.config) {
            console.log('项目配置加载失败');
            this.projectStatus = ProjectStatus.CONFIG_ERROR;
            return false;
        }
        console.log('项目配置加载成功:', this.config);

        // 验证配置
        const configValidation = this.validateConfig();
        if (!configValidation.isValid) {
            console.log('配置验证失败:', configValidation.errors);
            this.projectStatus = ProjectStatus.CONFIG_ERROR;
            return false;
        }

        // 初始化服务
        this.keyAnalyzer = new KeyAnalyzer(this.config, this.configManager.getWorkspaceRoot());
        this.aiService = new OpenAIService(this.config.aiService, this.config.contextLines || 5);

        // 加载缓存
        this.cache = await this.configManager.loadCache();
        console.log('翻译缓存初始化完成，已加载文本项数量:', Object.keys(this.cache).length);

        // 自动执行首次分析
        await this.refreshAnalysis();

        this.projectStatus = ProjectStatus.INITIALIZED;
        return true;
    }

    /**
     * 初始化项目
     */
    async initializeProject(): Promise<void> {
        await this.configManager.initializeProject();
        await this.initialize();
    }

    /**
     * 验证配置
     */
    private validateConfig(): ConfigValidation {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!this.config) {
            errors.push('配置文件未加载');
            return { isValid: false, errors, warnings };
        }

        // 验证源语言字典文件路径
        if (!this.config.sourceLangDict) {
            errors.push('源语言文件路径未设置，请指定您的主语言文件');
        } else {
            const sourceDictPath = path.resolve(this.configManager.getWorkspaceRoot(), this.config.sourceLangDict);
            if (!fs.existsSync(sourceDictPath)) {
                errors.push(`源语言文件不存在: ${this.config.sourceLangDict}，请检查文件路径是否正确`);
            } else {
                // 验证是否为有效的JSON文件
                try {
                    const content = fs.readFileSync(sourceDictPath, 'utf-8');
                    JSON.parse(content);
                } catch (error) {
                    errors.push(`源语言文件格式错误: ${this.config.sourceLangDict}，请确保文件是有效的JSON格式`);
                }
            }
        }

        // 验证目标语言配置 - 影响翻译功能
        if (!this.config.targetLangs || this.config.targetLangs.length === 0) {
            warnings.push('未设置目标语言，无法生成多语言翻译。请在配置中添加您需要的目标语言');
        }

        // 验证AI服务配置 - 这是核心功能，必须配置
        if (!this.config.aiService) {
            errors.push('AI翻译服务未配置，请在设置中配置您的AI服务信息');
        } else {
            // API密钥是必需的
            if (!this.config.aiService.apiKey) {
                errors.push('AI服务密钥未设置，请在设置中添加您的API密钥');
            }
            // base URL是必需的  
            if (!this.config.aiService.base) {
                errors.push('AI服务地址未设置，请在设置中添加您的服务地址');
            }
            // 模型配置是必需的
            if (!this.config.aiService.model) {
                errors.push('AI翻译模型未选择，请在设置中选择您要使用的模型');
            }
        }

        // 验证忽略规则
        if (!this.config.ignore || this.config.ignore.length === 0) {
            warnings.push('未设置文件忽略规则，扫描时可能包含不必要的文件，建议添加忽略规则以提高效率');
        }

        const isValid = errors.length === 0;
        this.configValidation = { isValid, errors, warnings };
        this.projectStatus = isValid ? ProjectStatus.INITIALIZED : ProjectStatus.CONFIG_ERROR;

        // 输出验证结果到控制台
        if (errors.length > 0) {
            console.log('配置验证失败，发现以下错误:');
            errors.forEach(error => console.log(`  ❌ ${error}`));
        }
        if (warnings.length > 0) {
            console.log('配置验证警告:');
            warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
        }
        if (isValid) {
            console.log('✅ 配置验证成功');
        }

        return this.configValidation;
    }

    /**
     * 刷新分析
     */
    async refreshAnalysis(): Promise<KeyAnalysis | null> {
        if (!this.keyAnalyzer) {
            return null;
        }

        this.analysis = await this.keyAnalyzer.analyzeKeys(this.cache);
        return this.analysis;
    }

    /**
     * 删除未使用的Key
     */
    async deleteObsoleteKeys(): Promise<void> {
        if (!this.analysis) {
            await this.refreshAnalysis();
        }

        if (!this.analysis || this.analysis.obsoleteKeys.length === 0) {
            vscode.window.showInformationMessage('太棒了！当前没有发现已废弃的文本，无需清理');
            return;
        }

        const result = await vscode.window.showInformationMessage(
            `发现 ${this.analysis.obsoleteKeys.length} 个已废弃的文本（代码中已不再使用）。删除这些文本可以让您的项目更整洁，是否确认删除？`,
            '确认删除',
            '取消'
        );

        if (result === '确认删除') {
            for (const key of this.analysis.obsoleteKeys) {
                delete this.cache[key];
            }

            await this.configManager.saveCache(this.cache);
            await this.refreshAnalysis();
            
            vscode.window.showInformationMessage(`清理完成！已删除 ${this.analysis.obsoleteKeys.length} 个废弃的文本，您的项目更整洁了`);
        }
    }

    /**
     * 翻译Key
     */
    async translateKeys(): Promise<void> {
        if (!this.analysis) {
            await this.refreshAnalysis();
        }

        if (!this.analysis || !this.keyAnalyzer || !this.aiService || !this.config) {
            return;
        }

        const keysToProcess = [
            ...this.analysis.newKeys,
            ...this.analysis.updatedKeys,
            ...this.analysis.pendingKeys
        ];

        if (keysToProcess.length === 0) {
            vscode.window.showInformationMessage('太好了！所有文本都已翻译完成，无需进行翻译操作');
            return;
        }

        // 检查AI服务配置
        if (!this.config.aiService.apiKey) {
            vscode.window.showErrorMessage('请先配置AI翻译服务密钥，然后重试');
            return;
        }

        const result = await vscode.window.showInformationMessage(
            `发现 ${keysToProcess.length} 个待翻译的文本。AI将根据上下文为这些文本生成高质量的翻译，是否开始翻译？`,
            '开始翻译',
            '取消'
        );

        if (result !== '开始翻译') {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "智能翻译进行中",
            cancellable: false
        }, async (progress) => {
            try {
                // 1. 获取文件映射
                progress.report({ message: "正在分析文本在代码中的使用情况..." });
                const keyToFiles = await this.keyAnalyzer!.getMinimalFileSet(keysToProcess);
                
                // 2. 分析上下文
                progress.report({ message: "正在理解文本的业务场景和使用上下文..." });
                await this.analyzeContextForKeys(keysToProcess, keyToFiles);
                
                // 3. 执行翻译
                progress.report({ message: "AI正在生成多语言翻译，请稍候..." });
                await this.performTranslation(keysToProcess);
                
                // 4. 保存结果
                progress.report({ message: "正在保存翻译结果..." });
                await this.configManager.saveCache(this.cache);
                await this.refreshAnalysis();
                
                vscode.window.showInformationMessage(`🎉 翻译任务圆满完成！成功为 ${keysToProcess.length} 个文本生成了多语言翻译`);
            } catch (error) {
                vscode.window.showErrorMessage(`翻译任务失败：${error}。请检查网络连接和AI服务配置`);
            }
        });
    }

    /**
     * 分析Key的上下文
     */
    private async analyzeContextForKeys(keys: string[], keyToFiles: Map<string, string[]>): Promise<void> {
        if (!this.aiService || !this.config) return;

        // 获取源字典
        const sourceDictPath = path.resolve(this.configManager.getWorkspaceRoot(), this.config.sourceLangDict);
        const sourceDict = await this.loadSourceDict(sourceDictPath);

        for (const key of keys) {
            const source = sourceDict[key];
            if (!source) continue;

            const files = keyToFiles.get(key) || [];
            if (files.length === 0) continue;

            // 使用第一个文件进行上下文分析
            const filePath = files[0];
            try {
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                const context = await this.aiService.analyzeContext(key, source, filePath, fileContent);

                // 检查是否为更新的key
                const isUpdatedKey = this.analysis?.updatedKeys.includes(key);

                // 更新或创建缓存项
                if (!this.cache[key]) {
                    this.cache[key] = {
                        source,
                        sourceFile: path.relative(this.configManager.getWorkspaceRoot(), filePath),
                        translations: {}
                    };
                } else {
                    // 如果是更新的key，删除旧的翻译并更新源文本
                    if (isUpdatedKey) {
                        console.log(`检测到更新key "${key}"，删除旧翻译并更新源文本`);
                        this.cache[key].translations = {}; // 清空旧的翻译
                        this.cache[key].source = source; // 更新源文本
                    }
                }

                // 更新上下文信息和源文件路径
                this.cache[key].businessContext = context.businessContext;
                if (context.uiContext && context.uiContext !== '非UI文本') {
                    this.cache[key].uiContext = context.uiContext;
                }
                this.cache[key].sourceFile = path.relative(this.configManager.getWorkspaceRoot(), filePath);
            } catch (error) {
                console.error(`分析Key ${key} 的上下文失败:`, error);
            }
        }
    }

    /**
     * 执行翻译
     */
    private async performTranslation(keys: string[]): Promise<void> {
        if (!this.aiService || !this.config) return;

        const tasks: TranslationTask[] = [];

        // 构建翻译任务
        for (const key of keys) {
            if (!this.cache[key]) continue;

            const item = this.cache[key];
            
            // 确保 translations 字段存在
            if (!item.translations) {
                item.translations = {};
            }

            // 检查是否为更新的key
            const isUpdatedKey = this.analysis?.updatedKeys.includes(key);
            
            const targetLangs = this.config.targetLangs as Array<string | TargetLangConfig>;
            for (const targetLangItem of targetLangs) {
                const targetLang: string = typeof targetLangItem === 'string' ? targetLangItem : targetLangItem.lang;
                
                // 对于更新的key，强制重新翻译所有目标语言
                // 对于新增和待翻译的key，只翻译缺失的语言
                const needsTranslation = isUpdatedKey || 
                    !item.translations[targetLang] || 
                    item.translations[targetLang].trim() === '';

                if (needsTranslation) {
                    tasks.push({
                        key,
                        source: item.source,
                        businessContext: item.businessContext,
                        uiContext: item.uiContext,
                        targetLang
                    });
                }
            }
        }

        if (tasks.length === 0) return;

        console.log(`准备翻译 ${tasks.length} 个任务`);

        // 执行批量翻译
        const results = await this.aiService.translateText(tasks);
        
        console.log(`AI翻译完成，返回结果数量: ${Object.keys(results).length}`);
        console.log('翻译结果:', results);

        // 更新缓存
        let updatedCount = 0;
        for (const [resultKey, translation] of Object.entries(results)) {
            // 修复：正确解析结果键，避免key本身包含下划线时出错
            const lastUnderscoreIndex = resultKey.lastIndexOf('_');
            if (lastUnderscoreIndex === -1) {
                console.log(`跳过无效的结果键: ${resultKey}`);
                continue;
            }
            
            const key = resultKey.substring(0, lastUnderscoreIndex);
            const targetLang = resultKey.substring(lastUnderscoreIndex + 1);
            
            if (this.cache[key]) {
                if (translation && translation.trim() && !translation.startsWith('[翻译失败:')) {
                    // 确保 translations 字段存在
                    if (!this.cache[key].translations) {
                        this.cache[key].translations = {};
                    }
                    this.cache[key].translations[targetLang] = translation;
                    updatedCount++;
                    console.log(`✅ 更新翻译: ${key} -> ${targetLang}: ${translation}`);
                } else {
                    console.log(`⚠️ 跳过无效翻译: ${key} -> ${targetLang}: ${translation}`);
                }
            } else {
                console.log(`❌ 缓存中找不到key: ${key}`);
            }
        }
        
        console.log(`缓存更新完成，共更新 ${updatedCount} 个翻译`);
    }

    /**
     * 加载源字典
     */
    private async loadSourceDict(sourceDictPath: string): Promise<Record<string, string>> {
        if (!this.keyAnalyzer) return {};

        try {
            return await this.keyAnalyzer['parserManager'].parseDict(sourceDictPath);
        } catch (error) {
            console.error('加载源字典失败:', error);
            return {};
        }
    }

    /**
     * 获取当前分析结果
     */
    getAnalysis(): KeyAnalysis | null {
        return this.analysis;
    }

    /**
     * 获取配置信息
     */
    getConfig(): ContextoConfig | null {
        return this.config;
    }

    /**
     * 检查是否已初始化
     */
    isInitialized(): boolean {
        return this.configManager.isProjectInitialized();
    }

    /**
     * 获取配置文件路径
     */
    getConfigPath(): string {
        return this.configManager.getConfigPath();
    }

    /**
     * 获取项目状态
     */
    getProjectStatus(): ProjectStatus {
        return this.projectStatus;
    }

    /**
     * 获取配置验证结果
     */
    getConfigValidation(): ConfigValidation | null {
        return this.configValidation;
    }

    /**
     * 检查配置是否有效
     */
    hasValidConfig(): boolean {
        return this.projectStatus === ProjectStatus.INITIALIZED;
    }

    /**
     * 获取缓存数据
     */
    getCache(): I18nCache {
        return this.cache;
    }

    /**
     * 保存缓存数据
     */
    async saveCache(): Promise<void> {
        await this.configManager.saveCache(this.cache);
    }

    /**
     * 重新加载缓存数据
     */
    async reloadCache(): Promise<void> {
        this.cache = await this.configManager.loadCache();
        console.log('缓存数据已重新加载，当前缓存项数量:', Object.keys(this.cache).length);
    }

    /**
     * 获取工作区根目录
     */
    getWorkspaceRoot(): string {
        return this.configManager.getWorkspaceRoot();
    }

    /**
     * 检查是否有可导出的翻译数据
     */
    hasExportableData(): boolean {
        return this.exportManager.hasExportableData(this.cache);
    }

    /**
     * 获取导出预览
     */
    getExportPreview(): string[] {
        if (!this.config) {
            return [];
        }
        return this.exportManager.getExportPreview(this.config);
    }

    /**
     * 同步翻译到语言文件
     */
    async exportTranslations(options?: ExportOptions): Promise<ExportResult> {
        if (!this.config) {
            return {
                success: false,
                exportedCount: 0,
                errors: ['配置信息尚未加载，请稍后重试']
            };
        }

        if (!this.hasExportableData()) {
            return {
                success: false,
                exportedCount: 0,
                errors: ['暂无可导出的翻译数据，请先完成文本翻译']
            };
        }

        // 使用默认的 'skip' 策略，只导出已翻译的键
        const exportOptions: ExportOptions = {
            fallbackStrategy: 'skip',
            ...options
        };

        return await this.exportManager.exportTranslations(this.config, this.cache, exportOptions);
    }
}
