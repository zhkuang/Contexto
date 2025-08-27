"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextoCore = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const configManager_1 = require("./configManager");
const keyAnalyzer_1 = require("./keyAnalyzer");
const aiService_1 = require("./aiService");
class ContextoCore {
    constructor(workspaceRoot) {
        this.keyAnalyzer = null;
        this.aiService = null;
        this.config = null;
        this.cache = {};
        this.analysis = null;
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
        console.log('开始加载配置...');
        // 加载配置
        this.config = await this.configManager.loadConfig();
        if (!this.config) {
            console.log('配置加载失败');
            return false;
        }
        console.log('配置加载成功:', this.config);
        // 检查AI服务配置
        if (!this.config.aiService.apiKey) {
            vscode.window.showWarningMessage('请在config.json中配置AI服务的API密钥');
        }
        // 初始化服务
        this.keyAnalyzer = new keyAnalyzer_1.KeyAnalyzer(this.config, this.configManager.getWorkspaceRoot());
        this.aiService = new aiService_1.OpenAIService(this.config.aiService);
        // 加载缓存
        this.cache = await this.configManager.loadCache();
        console.log('翻译缓存加载完成，包含Key数量:', Object.keys(this.cache).length);
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
     * 刷新分析
     */
    async refreshAnalysis() {
        if (!this.keyAnalyzer) {
            console.log('KeyAnalyzer未初始化，无法执行分析');
            return null;
        }
        console.log('开始执行Key分析...');
        this.analysis = await this.keyAnalyzer.analyzeKeys(this.cache);
        console.log('Key分析完成:', {
            新增: this.analysis.newKeys.length,
            更新: this.analysis.updatedKeys.length,
            待翻译: this.analysis.pendingKeys.length,
            无用: this.analysis.obsoleteKeys.length
        });
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
            vscode.window.showInformationMessage('没有需要删除的未使用Key');
            return;
        }
        const result = await vscode.window.showInformationMessage(`确定要删除 ${this.analysis.obsoleteKeys.length} 个未使用的Key吗？`, '删除', '取消');
        if (result === '删除') {
            for (const key of this.analysis.obsoleteKeys) {
                delete this.cache[key];
            }
            await this.configManager.saveCache(this.cache);
            await this.refreshAnalysis();
            vscode.window.showInformationMessage(`已删除 ${this.analysis.obsoleteKeys.length} 个未使用的Key`);
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
            vscode.window.showInformationMessage('没有需要翻译的Key');
            return;
        }
        // 检查AI服务配置
        if (!this.config.aiService.apiKey) {
            vscode.window.showErrorMessage('请先在config.json中配置AI服务的API密钥');
            return;
        }
        const result = await vscode.window.showInformationMessage(`确定要翻译 ${keysToProcess.length} 个Key吗？`, '翻译', '取消');
        if (result !== '翻译') {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在翻译...",
            cancellable: false
        }, async (progress) => {
            try {
                // 1. 获取文件映射
                progress.report({ message: "分析文件关联..." });
                const keyToFiles = await this.keyAnalyzer.getMinimalFileSet(keysToProcess);
                // 2. 分析上下文
                progress.report({ message: "分析上下文..." });
                await this.analyzeContextForKeys(keysToProcess, keyToFiles);
                // 3. 执行翻译
                progress.report({ message: "执行翻译..." });
                await this.performTranslation(keysToProcess);
                // 4. 保存结果
                progress.report({ message: "保存结果..." });
                await this.configManager.saveCache(this.cache);
                await this.refreshAnalysis();
                vscode.window.showInformationMessage(`翻译完成！已处理 ${keysToProcess.length} 个Key`);
            }
            catch (error) {
                vscode.window.showErrorMessage(`翻译失败: ${error}`);
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
        // 更新缓存
        for (const [resultKey, translation] of Object.entries(results)) {
            const [key, targetLang] = resultKey.split('_');
            if (this.cache[key] && translation.trim()) {
                // 确保 translations 字段存在
                if (!this.cache[key].translations) {
                    this.cache[key].translations = {};
                }
                this.cache[key].translations[targetLang] = translation;
                console.log(`更新翻译: ${key} -> ${targetLang}: ${translation}`);
            }
        }
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
}
exports.ContextoCore = ContextoCore;
//# sourceMappingURL=contextoCore.js.map