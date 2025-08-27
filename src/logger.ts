import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private static instance: Logger;
    private logPath: string | null = null;
    private isDevMode: boolean = false;

    private constructor() {
        this.initializeLogger();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private initializeLogger() {
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

    public logAIRequest(prompt: string, type: string = 'request') {
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
        } catch (error) {
            console.error('写入日志失败:', error);
        }
    }

    public logAIResponse(response: string, type: string = 'response') {
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
        } catch (error) {
            console.error('写入日志失败:', error);
        }
    }

    public clearLog() {
        if (!this.isDevMode || !this.logPath) {
            return;
        }

        try {
            fs.writeFileSync(this.logPath, '', 'utf8');
        } catch (error) {
            console.error('清空日志失败:', error);
        }
    }

    public isLoggingEnabled(): boolean {
        return this.isDevMode && this.logPath !== null;
    }

    public enableDevLogging() {
        this.isDevMode = true;
        this.initializeLogger();
    }

    public disableDevLogging() {
        this.isDevMode = false;
        this.logPath = null;
    }
}
