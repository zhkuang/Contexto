"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
class ConfigManager {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.contextoDir = path.join(workspaceRoot, 'contexto');
        this.configPath = path.join(this.contextoDir, 'config.json');
        this.cachePath = path.join(this.contextoDir, 'i18n.json');
    }
    /**
     * 检查项目是否已初始化
     */
    isProjectInitialized() {
        return fs.existsSync(this.configPath);
    }
    /**
     * 初始化项目
     */
    async initializeProject() {
        // 创建contexto目录
        if (!fs.existsSync(this.contextoDir)) {
            fs.mkdirSync(this.contextoDir, { recursive: true });
        }
        // 创建默认配置
        const defaultConfig = {
            sourceLangDict: "./locales/zh-CN.json",
            targetLangs: ["en", "ja", "ko"],
            ignore: ["./contexto", "./node_modules", "./.git"],
            aiService: {
                type: "openai",
                apiKey: "",
                base: "https://api.openai.com/v1",
                model: "gpt-4"
            }
        };
        await this.saveConfig(defaultConfig);
        // 创建空的翻译缓存
        if (!fs.existsSync(this.cachePath)) {
            await this.saveCache({});
        }
        vscode.window.showInformationMessage('Contexto项目初始化成功！请在config.json中配置您的AI服务信息。');
    }
    /**
     * 加载配置
     */
    async loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            return null;
        }
        try {
            const content = fs.readFileSync(this.configPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            vscode.window.showErrorMessage(`加载配置文件失败: ${error}`);
            return null;
        }
    }
    /**
     * 保存配置
     */
    async saveConfig(config) {
        try {
            const content = JSON.stringify(config, null, 4);
            fs.writeFileSync(this.configPath, content, 'utf-8');
        }
        catch (error) {
            vscode.window.showErrorMessage(`保存配置文件失败: ${error}`);
            throw error;
        }
    }
    /**
     * 加载翻译缓存
     */
    async loadCache() {
        if (!fs.existsSync(this.cachePath)) {
            return {};
        }
        try {
            const content = fs.readFileSync(this.cachePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            vscode.window.showErrorMessage(`加载翻译缓存失败: ${error}`);
            return {};
        }
    }
    /**
     * 保存翻译缓存
     */
    async saveCache(cache) {
        try {
            const content = JSON.stringify(cache, null, 4);
            fs.writeFileSync(this.cachePath, content, 'utf-8');
        }
        catch (error) {
            vscode.window.showErrorMessage(`保存翻译缓存失败: ${error}`);
            throw error;
        }
    }
    /**
     * 获取配置文件路径
     */
    getConfigPath() {
        return this.configPath;
    }
    /**
     * 获取缓存文件路径
     */
    getCachePath() {
        return this.cachePath;
    }
    /**
     * 获取工作区根目录
     */
    getWorkspaceRoot() {
        return this.workspaceRoot;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=configManager.js.map