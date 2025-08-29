import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ContextoConfig, I18nCache } from './types';
import { defaultConfig } from './config';

export class ConfigManager {
    private workspaceRoot: string;
    private contextoDir: string;
    private configPath: string;
    private cachePath: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.contextoDir = path.join(workspaceRoot, 'contexto');
        this.configPath = path.join(this.contextoDir, 'config.json');
        this.cachePath = path.join(this.contextoDir, 'i18n.json');
    }

    /**
     * 检查项目是否已初始化
     */
    isProjectInitialized(): boolean {
        return fs.existsSync(this.configPath);
    }

    /**
     * 初始化项目
     */
    async initializeProject(): Promise<void> {
        // 创建contexto目录
        if (!fs.existsSync(this.contextoDir)) {
            fs.mkdirSync(this.contextoDir, { recursive: true });
        }

        // 使用默认配置
        await this.saveConfig(defaultConfig);

        // 创建空的翻译缓存
        if (!fs.existsSync(this.cachePath)) {
            await this.saveCache({});
        }

        vscode.window.showInformationMessage('Contexto 项目初始化成功！请在 config.json 中配置您的 AI 服务信息。');
    }

    /**
     * 加载配置
     */
    async loadConfig(): Promise<ContextoConfig | null> {
        if (!fs.existsSync(this.configPath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(this.configPath, 'utf-8');
            return JSON.parse(content) as ContextoConfig;
        } catch (error) {
            vscode.window.showErrorMessage(`配置文件加载失败：${error}`);
            return null;
        }
    }

    /**
     * 保存配置
     */
    async saveConfig(config: ContextoConfig): Promise<void> {
        try {
            const content = JSON.stringify(config, null, 4);
            fs.writeFileSync(this.configPath, content, 'utf-8');
        } catch (error) {
            vscode.window.showErrorMessage(`配置文件保存失败：${error}`);
            throw error;
        }
    }

    /**
     * 加载翻译缓存
     */
    async loadCache(): Promise<I18nCache> {
        if (!fs.existsSync(this.cachePath)) {
            return {};
        }

        try {
            const content = fs.readFileSync(this.cachePath, 'utf-8');
            const cache = JSON.parse(content) as I18nCache;
            
            // 确保每个缓存项都有 translations 字段（兼容旧版本）
            for (const key in cache) {
                if (!cache[key].translations) {
                    cache[key].translations = {};
                }
            }
            
            return cache;
        } catch (error) {
            vscode.window.showErrorMessage(`翻译缓存加载失败：${error}`);
            return {};
        }
    }

    /**
     * 保存翻译缓存
     */
    async saveCache(cache: I18nCache): Promise<void> {
        try {
            const content = JSON.stringify(cache, null, 4);
            fs.writeFileSync(this.cachePath, content, 'utf-8');
        } catch (error) {
            vscode.window.showErrorMessage(`翻译缓存保存失败：${error}`);
            throw error;
        }
    }

    /**
     * 获取配置文件路径
     */
    getConfigPath(): string {
        return this.configPath;
    }

    /**
     * 获取缓存文件路径
     */
    getCachePath(): string {
        return this.cachePath;
    }

    /**
     * 获取工作区根目录
     */
    getWorkspaceRoot(): string {
        return this.workspaceRoot;
    }
}
