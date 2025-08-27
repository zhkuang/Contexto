"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const contextoCore_1 = require("./contextoCore");
const treeProvider_1 = require("./treeProvider");
const logger_1 = require("./logger");
let core = null;
let treeProvider;
let statusProvider;
function activate(context) {
    console.log('Contexto插件已激活');
    // 初始化providers
    treeProvider = new treeProvider_1.ContextoProvider();
    statusProvider = new treeProvider_1.ContextoStatusProvider();
    // 注册tree view
    const treeView = vscode.window.createTreeView('contexto', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    // 检查工作区并初始化
    initializeWorkspace();
    // 注册命令
    registerCommands(context);
    // 监听工作区变化
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        initializeWorkspace();
    });
    // 监听配置文件变化
    vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (core && document.fileName.endsWith('contexto/config.json')) {
            console.log('检测到config.json文件保存，重新初始化...');
            await initializeWorkspace();
        }
    });
    // 添加到订阅列表
    context.subscriptions.push(treeView, statusProvider, ...Object.values(commands));
}
exports.activate = activate;
async function initializeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        core = null;
        statusProvider.updateStatus(null, null);
        treeProvider.refresh();
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    core = new contextoCore_1.ContextoCore(workspaceRoot);
    const initialized = await core.initialize();
    if (initialized) {
        await treeProvider.setCore(core);
        const analysis = treeProvider.getAnalysis();
        statusProvider.updateStatus(core, analysis);
    }
    else {
        statusProvider.updateStatus(core, null);
        treeProvider.refresh();
    }
}
const commands = {
    initProject: vscode.commands.registerCommand('contexto.initProject', async () => {
        if (!core) {
            vscode.window.showErrorMessage('请先打开一个项目');
            return;
        }
        try {
            await core.initializeProject();
            await treeProvider.setCore(core);
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
            // 打开配置文件让用户配置
            const configPath = core.getConfigPath();
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('项目初始化完成！请配置AI服务信息，保存后将自动扫描源字典文件。');
        }
        catch (error) {
            vscode.window.showErrorMessage(`初始化失败: ${error}`);
        }
    }),
    refresh: vscode.commands.registerCommand('contexto.refresh', async () => {
        if (!core) {
            await initializeWorkspace();
            return;
        }
        try {
            await treeProvider.updateAnalysis();
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
        }
        catch (error) {
            vscode.window.showErrorMessage(`刷新失败: ${error}`);
        }
    }),
    deleteKeys: vscode.commands.registerCommand('contexto.deleteKeys', async () => {
        if (!core) {
            vscode.window.showErrorMessage('项目未初始化');
            return;
        }
        try {
            await core.deleteObsoleteKeys();
            await treeProvider.updateAnalysis();
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
        }
        catch (error) {
            vscode.window.showErrorMessage(`删除失败: ${error}`);
        }
    }),
    translateKeys: vscode.commands.registerCommand('contexto.translateKeys', async () => {
        if (!core) {
            vscode.window.showErrorMessage('项目未初始化');
            return;
        }
        try {
            await core.translateKeys();
            await treeProvider.updateAnalysis();
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
        }
        catch (error) {
            vscode.window.showErrorMessage(`翻译失败: ${error}`);
        }
    }),
    openConfig: vscode.commands.registerCommand('contexto.openConfig', async () => {
        if (!core) {
            vscode.window.showErrorMessage('项目未初始化');
            return;
        }
        try {
            const configPath = core.getConfigPath();
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`打开配置文件失败: ${error}`);
        }
    }),
    clearLog: vscode.commands.registerCommand('contexto.clearLog', async () => {
        try {
            const logger = logger_1.Logger.getInstance();
            logger.clearLog();
            vscode.window.showInformationMessage('日志已清空');
        }
        catch (error) {
            vscode.window.showErrorMessage(`清空日志失败: ${error}`);
        }
    }),
    toggleDevLog: vscode.commands.registerCommand('contexto.toggleDevLog', async () => {
        try {
            const logger = logger_1.Logger.getInstance();
            if (logger.isLoggingEnabled()) {
                logger.disableDevLogging();
                vscode.window.showInformationMessage('开发日志已关闭');
            }
            else {
                logger.enableDevLogging();
                vscode.window.showInformationMessage('开发日志已启用，日志将保存到 contexto/log.txt');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`切换日志失败: ${error}`);
        }
    })
};
function registerCommands(context) {
    for (const command of Object.values(commands)) {
        context.subscriptions.push(command);
    }
}
function deactivate() {
    console.log('Contexto插件已停用');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map