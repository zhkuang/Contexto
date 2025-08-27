"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
class Logger {
    constructor() {
        this.logPath = null;
        this.isDevMode = false;
        this.manuallyEnabled = false;
        this.initializeLogger();
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    initializeLogger() {
        // 检查是否手动启用或通过环境变量启用
        const envDevMode = process.env.NODE_ENV === 'development' ||
            process.env.VSCODE_DEBUG === 'true' ||
            Boolean(process.env.CONTEXTO_DEV);
        this.isDevMode = this.manuallyEnabled || envDevMode;
        if (this.isDevMode) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const contextoDir = path.join(workspaceFolder.uri.fsPath, 'contexto');
                // 确保contexto目录存在
                if (!fs.existsSync(contextoDir)) {
                    fs.mkdirSync(contextoDir, { recursive: true });
                }
                this.logPath = path.join(contextoDir, 'log.txt');
            }
        }
        else {
            this.logPath = null;
        }
    }
    logAIRequest(prompt, type = 'request') {
        console.log(`[Logger] 尝试记录AI请求日志: isDevMode=${this.isDevMode}, logPath=${this.logPath}`);
        if (!this.isDevMode || !this.logPath) {
            console.log('[Logger] 日志功能未启用或路径不存在，跳过记录');
            return;
        }
        const timestamp = new Date().toISOString();
        const logEntry = `
=== ${type.toUpperCase()} [${timestamp}] ===
${prompt}
====================================

`;
        try {
            fs.appendFileSync(this.logPath, logEntry, 'utf8');
            console.log(`[Logger] 成功写入AI请求日志到: ${this.logPath}`);
        }
        catch (error) {
            console.error('写入日志失败:', error);
        }
    }
    logAIResponse(response, type = 'response') {
        console.log(`[Logger] 尝试记录AI响应日志: isDevMode=${this.isDevMode}, logPath=${this.logPath}`);
        if (!this.isDevMode || !this.logPath) {
            console.log('[Logger] 日志功能未启用或路径不存在，跳过记录');
            return;
        }
        const timestamp = new Date().toISOString();
        const logEntry = `
=== ${type.toUpperCase()} [${timestamp}] ===
${response}
====================================

`;
        try {
            fs.appendFileSync(this.logPath, logEntry, 'utf8');
            console.log(`[Logger] 成功写入AI响应日志到: ${this.logPath}`);
        }
        catch (error) {
            console.error('写入日志失败:', error);
        }
    }
    clearLog() {
        if (!this.isDevMode || !this.logPath) {
            return;
        }
        try {
            fs.writeFileSync(this.logPath, '', 'utf8');
        }
        catch (error) {
            console.error('清空日志失败:', error);
        }
    }
    isLoggingEnabled() {
        return this.isDevMode && this.logPath !== null;
    }
    enableDevLogging() {
        console.log('[Logger] 启用开发日志功能');
        this.manuallyEnabled = true;
        this.initializeLogger();
        console.log(`[Logger] 启用后状态: isDevMode=${this.isDevMode}, logPath=${this.logPath}`);
    }
    disableDevLogging() {
        console.log('[Logger] 禁用开发日志功能');
        this.manuallyEnabled = false;
        this.isDevMode = false;
        this.logPath = null;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map