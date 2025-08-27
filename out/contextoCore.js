"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextoCore = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const configManager_1 = require("./configManager");
const keyAnalyzer_1 = require("./keyAnalyzer");
const aiService_1 = require("./aiService");
const types_1 = require("./types");
class ContextoCore {
    constructor(workspaceRoot) {
        this.keyAnalyzer = null;
        this.aiService = null;
        this.config = null;
        this.cache = {};
        this.analysis = null;
        this.projectStatus = types_1.ProjectStatus.UNINITIALIZED;
        this.configValidation = null;
        this.configManager = new configManager_1.ConfigManager(workspaceRoot);
    }
    /**
     * 初始化
     */
    async initialize() {
        if (!this.configManager.isProjectInitialized()) {
            console.log('项目未初始化');
            return false;
        }
        console.log('正在加载项目配置...');
        // 加载配置
        this.config = await this.configManager.loadConfig();
        if (!this.config) {
            console.log('项目配置加载失败');
            return false;
        }
        console.log('项目配置加载成功:', this.config);
        // 验证配置
        const configValidation = this.validateConfig();
        if (!configValidation.isValid) {
            console.log('配置验证失败:', configValidation.errors);
            return false;
        }
        // 检查AI服务配置
        if (!this.config.aiService.apiKey) {
            vscode.window.showWarningMessage('请在 config.json 中配置 AI 服务的 API 密钥后再使用翻译功能');
        }
        // 初始化服务
        this.keyAnalyzer = new keyAnalyzer_1.KeyAnalyzer(this.config, this.configManager.getWorkspaceRoot());
        this.aiService = new aiService_1.OpenAIService(this.config.aiService, this.config.contextLines || 5);
        // 加载缓存
        this.cache = await this.configManager.loadCache();
        console.log('翻译缓存初始化完成，已加载文本项数量:', Object.keys(this.cache).length);
        // 自动执行首次分析
        await this.refreshAnalysis();
        return true;
    }
    /**
     * 初始化项目
     */
    async initializeProject() {
        await this.configManager.initializeProject();
        await this.initialize();
    }
    /**
     * 验证配置
     */
    validateConfig() {
        const errors = [];
        const warnings = [];
        if (!this.config) {
            errors.push('配置文件未加载');
            return { isValid: false, errors, warnings };
        }
        // 验证源语言字典文件路径
        if (!this.config.sourceLangDict) {
            errors.push('sourceLangDict 配置项不能为空');
        }
        else {
            const sourceDictPath = path.resolve(this.configManager.getWorkspaceRoot(), this.config.sourceLangDict);
            if (!fs.existsSync(sourceDictPath)) {
                errors.push(`源语言字典文件不存在: ${this.config.sourceLangDict}`);
            }
            else {
                // 验证是否为有效的JSON文件
                try {
                    const content = fs.readFileSync(sourceDictPath, 'utf-8');
                    JSON.parse(content);
                }
                catch (error) {
                    errors.push(`源语言字典文件格式错误: ${this.config.sourceLangDict} (${error})`);
                }
            }
        }
        // 验证目标语言配置
        if (!this.config.targetLangs || this.config.targetLangs.length === 0) {
            warnings.push('targetLangs 配置为空，将无法进行翻译');
        }
        // 验证AI服务配置
        if (!this.config.aiService) {
            warnings.push('aiService 配置缺失');
        }
        else {
            if (!this.config.aiService.apiKey) {
                warnings.push('AI 服务 API 密钥未配置');
            }
            if (!this.config.aiService.base) {
                warnings.push('AI 服务 base URL 未配置');
            }
            if (!this.config.aiService.model) {
                warnings.push('AI 服务模型未配置');
            }
        }
        // 验证忽略规则
        if (!this.config.ignore || this.config.ignore.length === 0) {
            warnings.push('ignore 配置为空，可能会扫描不必要的文件');
        }
        const isValid = errors.length === 0;
        this.configValidation = { isValid, errors, warnings };
        this.projectStatus = isValid ? types_1.ProjectStatus.INITIALIZED : types_1.ProjectStatus.CONFIG_ERROR;
        return this.configValidation;
    }
    /**
     * 刷新分析
     */
    async refreshAnalysis() {
        if (!this.keyAnalyzer) {
            return null;
        }
        this.analysis = await this.keyAnalyzer.analyzeKeys(this.cache);
        return this.analysis;
    }
    /**
     * 删除未使用的Key
     */
    async deleteObsoleteKeys() {
        if (!this.analysis) {
            await this.refreshAnalysis();
        }
        if (!this.analysis || this.analysis.obsoleteKeys.length === 0) {
            vscode.window.showInformationMessage('当前没有需要清理的废弃文本项');
            return;
        }
        const result = await vscode.window.showInformationMessage(`检测到 ${this.analysis.obsoleteKeys.length} 个废弃的文本项，是否确认删除？`, '确认删除', '取消');
        if (result === '确认删除') {
            for (const key of this.analysis.obsoleteKeys) {
                delete this.cache[key];
            }
            await this.configManager.saveCache(this.cache);
            await this.refreshAnalysis();
            vscode.window.showInformationMessage(`清理完成！已删除 ${this.analysis.obsoleteKeys.length} 个废弃的文本项`);
        }
    }
    /**
     * 翻译Key
     */
    async translateKeys() {
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
            vscode.window.showInformationMessage('当前没有需要翻译的新文本项');
            return;
        }
        // 检查AI服务配置
        if (!this.config.aiService.apiKey) {
            vscode.window.showErrorMessage('请先在 config.json 中配置 AI 服务的 API 密钥');
            return;
        }
        const result = await vscode.window.showInformationMessage(`发现 ${keysToProcess.length} 个待翻译的文本项，是否开始翻译？`, '开始翻译', '取消');
        if (result !== '开始翻译') {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AI 翻译处理中",
            cancellable: false
        }, async (progress) => {
            try {
                // 1. 获取文件映射
                progress.report({ message: "正在分析文件依赖关系..." });
                const keyToFiles = await this.keyAnalyzer.getMinimalFileSet(keysToProcess);
                // 2. 分析上下文
                progress.report({ message: "正在分析文本使用上下文..." });
                await this.analyzeContextForKeys(keysToProcess, keyToFiles);
                // 3. 执行翻译
                progress.report({ message: "正在生成多语言翻译..." });
                await this.performTranslation(keysToProcess);
                // 4. 保存结果
                progress.report({ message: "正在保存翻译结果..." });
                await this.configManager.saveCache(this.cache);
                await this.refreshAnalysis();
                vscode.window.showInformationMessage(`翻译任务已完成！成功处理了 ${keysToProcess.length} 个文本项`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`翻译任务执行失败：${error}`);
            }
        });
    }
    /**
     * 分析Key的上下文
     */
    async analyzeContextForKeys(keys, keyToFiles) {
        if (!this.aiService || !this.config)
            return;
        // 获取源字典
        const sourceDictPath = path.resolve(this.configManager.getWorkspaceRoot(), this.config.sourceLangDict);
        const sourceDict = await this.loadSourceDict(sourceDictPath);
        for (const key of keys) {
            const source = sourceDict[key];
            if (!source)
                continue;
            const files = keyToFiles.get(key) || [];
            if (files.length === 0)
                continue;
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
                }
                else {
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
            }
            catch (error) {
                console.error(`分析Key ${key} 的上下文失败:`, error);
            }
        }
    }
    /**
     * 执行翻译
     */
    async performTranslation(keys) {
        if (!this.aiService || !this.config)
            return;
        const tasks = [];
        // 构建翻译任务
        for (const key of keys) {
            if (!this.cache[key])
                continue;
            const item = this.cache[key];
            // 确保 translations 字段存在
            if (!item.translations) {
                item.translations = {};
            }
            // 检查是否为更新的key
            const isUpdatedKey = this.analysis?.updatedKeys.includes(key);
            for (const targetLang of this.config.targetLangs) {
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
        if (tasks.length === 0)
            return;
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
                }
                else {
                    console.log(`⚠️ 跳过无效翻译: ${key} -> ${targetLang}: ${translation}`);
                }
            }
            else {
                console.log(`❌ 缓存中找不到key: ${key}`);
            }
        }
        console.log(`缓存更新完成，共更新 ${updatedCount} 个翻译`);
    }
    /**
     * 加载源字典
     */
    async loadSourceDict(sourceDictPath) {
        if (!this.keyAnalyzer)
            return {};
        try {
            return await this.keyAnalyzer['parserManager'].parseDict(sourceDictPath);
        }
        catch (error) {
            console.error('加载源字典失败:', error);
            return {};
        }
    }
    /**
     * 获取当前分析结果
     */
    getAnalysis() {
        return this.analysis;
    }
    /**
     * 获取配置信息
     */
    getConfig() {
        return this.config;
    }
    /**
     * 检查是否已初始化
     */
    isInitialized() {
        return this.configManager.isProjectInitialized();
    }
    /**
     * 获取配置文件路径
     */
    getConfigPath() {
        return this.configManager.getConfigPath();
    }
    /**
     * 获取项目状态
     */
    getProjectStatus() {
        return this.projectStatus;
    }
    /**
     * 获取配置验证结果
     */
    getConfigValidation() {
        return this.configValidation;
    }
    /**
     * 检查配置是否有效
     */
    hasValidConfig() {
        return this.projectStatus === types_1.ProjectStatus.INITIALIZED;
    }
    /**
     * 获取缓存数据
     */
    getCache() {
        return this.cache;
    }
    /**
     * 获取工作区根目录
     */
    getWorkspaceRoot() {
        return this.configManager.getWorkspaceRoot();
    }
}
exports.ContextoCore = ContextoCore;
//# sourceMappingURL=contextoCore.js.map