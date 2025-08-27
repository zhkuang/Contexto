import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';
import { ContextoProvider, ContextoStatusProvider } from './treeProvider';
import { ContextoWebviewProvider } from './webviewProvider';

let core: ContextoCore | null = null;
let treeProvider: ContextoProvider;
let statusProvider: ContextoStatusProvider;
let webviewProvider: ContextoWebviewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Contexto插件已激活');

    // 初始化providers
    treeProvider = new ContextoProvider();
    statusProvider = new ContextoStatusProvider();
    webviewProvider = new ContextoWebviewProvider(context.extensionUri);

    // 注册tree view
    const treeView = vscode.window.createTreeView('contexto', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });

    // 注册webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('contextoWebview', webviewProvider)
    );

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
    context.subscriptions.push(
        treeView,
        statusProvider,
        ...Object.values(commands)
    );
}

async function initializeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        core = null;
        statusProvider.updateStatus(null, null);
        treeProvider.refresh();
        webviewProvider.setCore(null);
        webviewProvider.setAnalysis(null);
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    core = new ContextoCore(workspaceRoot);

    const initialized = await core.initialize();
    if (initialized) {
        await treeProvider.setCore(core);
        const analysis = treeProvider.getAnalysis();
        statusProvider.updateStatus(core, analysis);
        webviewProvider.setCore(core);
        webviewProvider.setAnalysis(analysis);
    } else {
        statusProvider.updateStatus(core, null);
        treeProvider.refresh();
        webviewProvider.setCore(core);
        webviewProvider.setAnalysis(null);
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
            webviewProvider.setCore(core);
            webviewProvider.setAnalysis(analysis);
            
            // 打开配置文件让用户配置
            const configPath = core.getConfigPath();
            const doc = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage('项目初始化完成！请配置AI服务信息，保存后将自动扫描源字典文件。');
            
        } catch (error) {
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
            webviewProvider.setAnalysis(analysis);
        } catch (error) {
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
            webviewProvider.setAnalysis(analysis);
        } catch (error) {
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
            webviewProvider.setAnalysis(analysis);
        } catch (error) {
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
        } catch (error) {
            vscode.window.showErrorMessage(`打开配置文件失败: ${error}`);
        }
    })
};

function registerCommands(context: vscode.ExtensionContext) {
    for (const command of Object.values(commands)) {
        context.subscriptions.push(command);
    }
}

export function deactivate() {
    console.log('Contexto插件已停用');
}
