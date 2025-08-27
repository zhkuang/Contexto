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
        this.initializeLogger();
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    initializeLogger() {
        // 简化开发模式检测：通过环境变量或特定标识判断
        this.isDevMode = process.env.NODE_ENV === 'development' ||
            process.env.VSCODE_DEBUG === 'true' ||
            Boolean(process.env.CONTEXTO_DEV); // 可以通过设置环境变量 CONTEXTO_DEV=true 来启用日志
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
    }
    logAIRequest(prompt, type = 'request') {
        if (!this.isDevMode || !this.logPath) {
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
        }
        catch (error) {
            console.error('写入日志失败:', error);
        }
    }
    logAIResponse(response, type = 'response') {
        if (!this.isDevMode || !this.logPath) {
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
        this.isDevMode = true;
        this.initializeLogger();
    }
    disableDevLogging() {
        this.isDevMode = false;
        this.logPath = null;
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map