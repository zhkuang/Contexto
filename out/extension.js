"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const contextoCore_1 = require("./contextoCore");
const treeProvider_1 = require("./treeProvider");
const welcomeWebview_1 = require("./welcomeWebview");
const configErrorWebview_1 = require("./configErrorWebview");
const statsWebviewProvider_1 = require("./statsWebviewProvider");
const types_1 = require("./types");
const logger_1 = require("./logger");
let core = null;
let treeProvider;
let statusProvider;
let welcomeProvider;
let configErrorProvider;
let statsProvider;
function activate(context) {
    console.log('Contexto插件已激活');
    // 初始化providers
    treeProvider = new treeProvider_1.ContextoProvider();
    statusProvider = new treeProvider_1.ContextoStatusProvider();
    welcomeProvider = new welcomeWebview_1.WelcomeWebviewProvider(context.extensionUri);
    configErrorProvider = new configErrorWebview_1.ConfigErrorWebviewProvider(context.extensionUri);
    statsProvider = new statsWebviewProvider_1.StatsWebviewProvider(context.extensionUri);
    // 注册tree view
    const treeView = vscode.window.createTreeView('contexto', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    // 注册welcome webview
    const welcomeView = vscode.window.registerWebviewViewProvider(welcomeWebview_1.WelcomeWebviewProvider.viewType, welcomeProvider);
    // 注册config error webview
    const configErrorView = vscode.window.registerWebviewViewProvider(configErrorWebview_1.ConfigErrorWebviewProvider.viewType, configErrorProvider);
    // 注册stats webview
    const statsView = vscode.window.registerWebviewViewProvider(statsWebviewProvider_1.StatsWebviewProvider.viewType, statsProvider);
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
            console.log('检测到 config.json 文件保存，正在重新初始化项目...');
            await initializeWorkspace();
        }
    });
    // 添加到订阅列表
    context.subscriptions.push(treeView, welcomeView, configErrorView, statsView, statusProvider, ...Object.values(commands));
}
exports.activate = activate;
async function initializeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        core = null;
        await setViewVisibility('none');
        statusProvider.updateStatus(null, null);
        await treeProvider.setCore(null);
        statsProvider.setCore(null);
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    core = new contextoCore_1.ContextoCore(workspaceRoot);
    if (!core.isInitialized()) {
        // 项目未初始化，显示欢迎界面
        await setViewVisibility('welcome');
        welcomeProvider.setCore(core);
        await treeProvider.setCore(core);
        statusProvider.updateStatus(core, null);
        statsProvider.setCore(core);
        return;
    }
    // 项目已初始化，尝试加载配置
    const initialized = await core.initialize();
    const projectStatus = core.getProjectStatus();
    if (projectStatus === types_1.ProjectStatus.CONFIG_ERROR) {
        // 配置有错误，显示配置错误界面
        await setViewVisibility('configError');
        configErrorProvider.setCore(core);
        statusProvider.updateStatus(core, null);
        statsProvider.setCore(core);
    }
    else if (projectStatus === types_1.ProjectStatus.INITIALIZED) {
        // 配置正确，显示翻译管理界面
        await setViewVisibility('translationManager');
        await treeProvider.setCore(core);
        const analysis = treeProvider.getAnalysis();
        statusProvider.updateStatus(core, analysis);
        statsProvider.setCore(core);
    }
    else {
        // 未知状态，默认显示翻译管理界面
        await setViewVisibility('translationManager');
        await treeProvider.setCore(core);
        statusProvider.updateStatus(core, null);
        statsProvider.setCore(core);
    }
}
async function setViewVisibility(view) {
    await vscode.commands.executeCommand('setContext', 'contexto.showWelcome', view === 'welcome');
    await vscode.commands.executeCommand('setContext', 'contexto.showConfigError', view === 'configError');
    await vscode.commands.executeCommand('setContext', 'contexto.showTranslationManager', view === 'translationManager');
}
async function setWelcomeVisibility(show) {
    await vscode.commands.executeCommand('setContext', 'contexto.showWelcome', show);
}
const commands = {
    initProject: vscode.commands.registerCommand('contexto.initProject', async () => {
        if (!core) {
            vscode.window.showErrorMessage('请先打开一个有效的项目文件夹');
            return;
        }
        try {
            await core.initializeProject();
            // 重新检查项目状态
            await initializeWorkspace();
            // 打开配置文件让用户配置
            const configPath = core.getConfigPath();
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('项目初始化完成！请配置 AI 服务信息和源语言字典路径，保存后将自动检测配置。');
        }
        catch (error) {
            vscode.window.showErrorMessage(`项目初始化失败：${error}`);
        }
    }),
    refresh: vscode.commands.registerCommand('contexto.refresh', async () => {
        console.log('执行刷新命令...');
        if (!core) {
            console.log('core不存在，重新初始化工作区');
            await initializeWorkspace();
            return;
        }
        if (!core.isInitialized()) {
            console.log('项目未初始化，重新初始化工作区');
            await initializeWorkspace();
            return;
        }
        try {
            console.log('开始刷新分析数据...');
            // 重新分析键值
            await treeProvider.updateAnalysis();
            // 更新状态栏
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
            console.log('刷新完成');
            vscode.window.showInformationMessage('Contexto: 刷新完成');
        }
        catch (error) {
            console.error('刷新失败:', error);
            vscode.window.showErrorMessage(`刷新失败：${error}`);
        }
    }),
    deleteKeys: vscode.commands.registerCommand('contexto.deleteKeys', async () => {
        if (!core) {
            vscode.window.showErrorMessage('Contexto 项目尚未初始化');
            return;
        }
        try {
            await core.deleteObsoleteKeys();
            await treeProvider.updateAnalysis();
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
        }
        catch (error) {
            vscode.window.showErrorMessage(`文本清理失败：${error}`);
        }
    }),
    translateKeys: vscode.commands.registerCommand('contexto.translateKeys', async () => {
        if (!core) {
            vscode.window.showErrorMessage('Contexto 项目尚未初始化');
            return;
        }
        try {
            await core.translateKeys();
            await treeProvider.updateAnalysis();
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
        }
        catch (error) {
            vscode.window.showErrorMessage(`翻译任务执行失败：${error}`);
        }
    }),
    openConfig: vscode.commands.registerCommand('contexto.openConfig', async () => {
        if (!core) {
            vscode.window.showErrorMessage('Contexto 项目尚未初始化');
            return;
        }
        try {
            const configPath = core.getConfigPath();
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
        }
        catch (error) {
            vscode.window.showErrorMessage(`配置文件打开失败：${error}`);
        }
    }),
    clearLog: vscode.commands.registerCommand('contexto.clearLog', async () => {
        try {
            const logger = logger_1.Logger.getInstance();
            logger.clearLog();
            vscode.window.showInformationMessage('日志文件已清空');
        }
        catch (error) {
            vscode.window.showErrorMessage(`日志清空失败：${error}`);
        }
    }),
    toggleDevLog: vscode.commands.registerCommand('contexto.toggleDevLog', async () => {
        try {
            const logger = logger_1.Logger.getInstance();
            if (logger.isLoggingEnabled()) {
                logger.disableDevLogging();
                vscode.window.showInformationMessage('开发日志功能已关闭');
            }
            else {
                logger.enableDevLogging();
                vscode.window.showInformationMessage('开发日志功能已启用，日志将保存到 contexto/log.txt');
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