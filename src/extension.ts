import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';
import { ContextoProvider, ContextoStatusProvider } from './treeProvider';
import { WelcomeWebviewProvider } from './welcomeWebview';
import { ConfigErrorWebviewProvider } from './configErrorWebview';
import { ConfigWebviewProvider } from './configWebview';
import { StatsWebviewProvider } from './statsWebviewProvider';
import { I18nViewerWebview } from './i18nViewerWebview';
import { ProjectStatus } from './types';
import { Logger } from './logger';

let core: ContextoCore | null = null;
let treeProvider: ContextoProvider;
let statusProvider: ContextoStatusProvider;
let welcomeProvider: WelcomeWebviewProvider;
let configErrorProvider: ConfigErrorWebviewProvider;
let configProvider: ConfigWebviewProvider;
let statsProvider: StatsWebviewProvider;
let i18nViewer: I18nViewerWebview;
let treeView: vscode.TreeView<any>; // 添加TreeView引用

// 更新活动栏徽章
async function updateActivityBarBadge(analysis: any | null) {
    if (!treeView) {
        return;
    }
    
    if (!analysis) {
        // 清除徽章
        treeView.badge = undefined;
        return;
    }
    
    // 计算需要处理的文本总数（新增 + 待翻译 + 更新）
    const totalCount = (analysis.newKeys?.length || 0) + 
                      (analysis.pendingKeys?.length || 0) + 
                      (analysis.updatedKeys?.length || 0);
    
    // 设置徽章数字
    if (totalCount > 0) {
        treeView.badge = {
            value: totalCount,
            tooltip: `待处理文本: ${analysis.newKeys?.length || 0} 个新增, ${analysis.pendingKeys?.length || 0} 个待翻译, ${analysis.updatedKeys?.length || 0} 个已更新`
        };
    } else {
        treeView.badge = undefined;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Contexto插件已激活');

    // 初始化providers
    treeProvider = new ContextoProvider();
    statusProvider = new ContextoStatusProvider();
    welcomeProvider = new WelcomeWebviewProvider(context.extensionUri);
    configErrorProvider = new ConfigErrorWebviewProvider(context.extensionUri);
    configProvider = new ConfigWebviewProvider(context.extensionUri);
    statsProvider = new StatsWebviewProvider(context.extensionUri);
    i18nViewer = new I18nViewerWebview(context.extensionUri);

    // 注册tree view
    treeView = vscode.window.createTreeView('contexto', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });

    // 注册welcome webview
    const welcomeView = vscode.window.registerWebviewViewProvider(
        WelcomeWebviewProvider.viewType,
        welcomeProvider
    );

    // 注册config error webview
    const configErrorView = vscode.window.registerWebviewViewProvider(
        ConfigErrorWebviewProvider.viewType,
        configErrorProvider
    );

    // 注册stats webview
    const statsView = vscode.window.registerWebviewViewProvider(
        StatsWebviewProvider.viewType,
        statsProvider
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
            console.log('检测到 config.json 文件保存，正在重新初始化项目...');
            await initializeWorkspace();
        }
    });

    // 添加到订阅列表
    context.subscriptions.push(
        treeView,
        welcomeView,
        configErrorView,
        statsView,
        statusProvider,
        ...Object.values(commands)
    );
}

async function initializeWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        core = null;
        await setViewVisibility('none');
        statusProvider.updateStatus(null, null);
        await treeProvider.setCore(null);
        statsProvider.setCore(null);
        configProvider.setCore(null);
        await updateActivityBarBadge(null);
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    core = new ContextoCore(workspaceRoot);

    // 1. 首先检查是否初始化过
    if (!core.isInitialized()) {
        // 项目未初始化，显示欢迎界面
        console.log('项目未初始化，显示欢迎界面');
        await setViewVisibility('welcome');
        welcomeProvider.setCore(core);
        await treeProvider.setCore(core);
        statusProvider.updateStatus(core, null);
        statsProvider.setCore(core);
        configProvider.setCore(core);
        await updateActivityBarBadge(null);
        return;
    }

    // 2. 项目已初始化，检查配置文件是否正确
    console.log('项目已初始化，开始验证配置...');
    const initialized = await core.initialize();
    const projectStatus = core.getProjectStatus();
    
    if (projectStatus === ProjectStatus.CONFIG_ERROR) {
        // 配置有错误，必须显示配置错误界面
        console.log('配置验证失败，显示配置错误界面');
        await setViewVisibility('configError');
        configErrorProvider.setCore(core);
        statusProvider.updateStatus(core, null);
        statsProvider.setCore(core);
        configProvider.setCore(core);
        await updateActivityBarBadge(null);
        return;
    }
    
    if (projectStatus === ProjectStatus.INITIALIZED) {
        // 只有当配置完全正确时，才能进入翻译管理界面
        console.log('配置验证成功，显示翻译管理界面');
        await setViewVisibility('translationManager');
        await treeProvider.setCore(core);
        const analysis = treeProvider.getAnalysis();
        statusProvider.updateStatus(core, analysis);
        statsProvider.setCore(core);
        configProvider.setCore(core);
        i18nViewer.setCore(core);
        await updateActivityBarBadge(analysis);
    } else {
        // 未知状态，为了安全起见，显示配置错误界面
        console.log('未知项目状态，显示配置错误界面');
        await setViewVisibility('configError');
        configErrorProvider.setCore(core);
        statusProvider.updateStatus(core, null);
        statsProvider.setCore(core);
        configProvider.setCore(core);
        await updateActivityBarBadge(null);
    }
}

async function setViewVisibility(view: 'none' | 'welcome' | 'configError' | 'translationManager') {
    await vscode.commands.executeCommand('setContext', 'contexto.showWelcome', view === 'welcome');
    await vscode.commands.executeCommand('setContext', 'contexto.showConfigError', view === 'configError');
    await vscode.commands.executeCommand('setContext', 'contexto.showTranslationManager', view === 'translationManager');
}

async function setWelcomeVisibility(show: boolean) {
    await vscode.commands.executeCommand('setContext', 'contexto.showWelcome', show);
}

const commands = {
    initProject: vscode.commands.registerCommand('contexto.initProject', async () => {
        if (!core) {
            vscode.window.showErrorMessage('请先打开一个项目文件夹');
            return;
        }

        try {
            await core.initializeProject();
            
            // 重新检查项目状态
            await initializeWorkspace();
            
            // 打开配置面板让用户配置
            configProvider.setCore(core);
            configProvider.show();
            
        } catch (error) {
            vscode.window.showErrorMessage(`初始化失败：${error}`);
        }
    }),

    refresh: vscode.commands.registerCommand('contexto.refresh', async () => {
        console.log('执行刷新命令...');
        
        // 刷新命令也要执行完整的初始化检查流程
        await initializeWorkspace();
        
        // 如果项目初始化且配置正确，才执行分析刷新
        if (core && core.getProjectStatus() === ProjectStatus.INITIALIZED) {
            try {
                console.log('开始刷新分析数据...');
                // 重新分析键值
                await treeProvider.updateAnalysis();
                
                // 更新状态栏
                const analysis = treeProvider.getAnalysis();
                statusProvider.updateStatus(core, analysis);
                
                // 刷新统计面板
                statsProvider.refresh();
                
                // 更新活动栏徽章
                await updateActivityBarBadge(analysis);
                
                console.log('刷新完成');
            } catch (error) {
                console.error('刷新失败:', error);
                vscode.window.showErrorMessage(`数据刷新失败：${error}`);
            }
        } else {
            console.log('项目未正确初始化或配置有误，刷新仅完成状态检查');
        }
    }),

    refreshStats: vscode.commands.registerCommand('contexto.refreshStats', async () => {
        console.log('执行统计数据刷新命令...');
        
        if (core && core.getProjectStatus() === ProjectStatus.INITIALIZED) {
            try {
                console.log('开始刷新统计数据...');
                // 重新分析键值
                await treeProvider.updateAnalysis();
                
                // 更新状态栏
                const analysis = treeProvider.getAnalysis();
                statusProvider.updateStatus(core, analysis);
                
                // 刷新统计面板
                statsProvider.refresh();
                
                // 更新活动栏徽章
                await updateActivityBarBadge(analysis);
                
                console.log('统计数据刷新完成');
                vscode.window.showInformationMessage('数据已刷新');
            } catch (error) {
                console.error('统计数据刷新失败:', error);
                vscode.window.showErrorMessage(`数据刷新失败：${error}`);
            }
        } else {
            vscode.window.showWarningMessage('请先完成项目配置，然后再试');
        }
    }),

    deleteKeys: vscode.commands.registerCommand('contexto.deleteKeys', async () => {
        if (!core) {
            vscode.window.showErrorMessage('请先初始化项目');
            return;
        }

        try {
            await core.deleteObsoleteKeys();
            await treeProvider.updateAnalysis();
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
            
            // 刷新统计面板
            statsProvider.refresh();
            
            // 更新活动栏徽章
            await updateActivityBarBadge(analysis);
        } catch (error) {
            vscode.window.showErrorMessage(`清理失败：${error}`);
        }
    }),

    translateKeys: vscode.commands.registerCommand('contexto.translateKeys', async () => {
        if (!core) {
            vscode.window.showErrorMessage('请先初始化项目');
            return;
        }

        try {
            await core.translateKeys();
            await treeProvider.updateAnalysis();
            const analysis = treeProvider.getAnalysis();
            statusProvider.updateStatus(core, analysis);
            
            // 刷新统计面板
            statsProvider.refresh();
            
            // 更新活动栏徽章
            await updateActivityBarBadge(analysis);
        } catch (error) {
            vscode.window.showErrorMessage(`翻译失败：${error}`);
        }
    }),

    openConfig: vscode.commands.registerCommand('contexto.openConfig', async () => {
        if (!core) {
            vscode.window.showErrorMessage('请先初始化项目');
            return;
        }

        try {
            configProvider.setCore(core);
            configProvider.show();
        } catch (error) {
            vscode.window.showErrorMessage(`配置页面打开失败：${error}`);
        }
    }),

    clearLog: vscode.commands.registerCommand('contexto.clearLog', async () => {
        try {
            const logger = Logger.getInstance();
            logger.clearLog();
            vscode.window.showInformationMessage('日志已清空');
        } catch (error) {
            vscode.window.showErrorMessage(`清空失败：${error}`);
        }
    }),

    toggleDevLog: vscode.commands.registerCommand('contexto.toggleDevLog', async () => {
        try {
            const logger = Logger.getInstance();
            if (logger.isLoggingEnabled()) {
                logger.disableDevLogging();
                vscode.window.showInformationMessage('调试日志已关闭');
            } else {
                logger.enableDevLogging();
                vscode.window.showInformationMessage('调试日志已启用，日志将保存到 contexto/log.txt');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`设置失败: ${error}`);
        }
    }),

    exportTranslations: vscode.commands.registerCommand('contexto.exportTranslations', async () => {
        if (!core) {
            vscode.window.showErrorMessage('请先初始化项目');
            return;
        }

        try {
            // 1. 检查是否有可同步的数据
            if (!core.hasExportableData()) {
                vscode.window.showWarningMessage('暂无可导出的翻译数据，请先完成文本翻译');
                return;
            }

            // 2. 获取同步预览
            const exportFiles = core.getExportPreview();
            if (exportFiles.length === 0) {
                vscode.window.showWarningMessage('未设置目标语言，请先在配置中添加您需要的目标语言');
                return;
            }

            // 3. 让用户选择同步策略
            const strategyChoice = await vscode.window.showQuickPick([
                {
                    label: '仅同步已翻译内容 (推荐)',
                    description: '只同步已有翻译的文本，保持语言纯净性',
                    detail: 'skip',
                },
                {
                    label: '使用源文本填充',
                    description: '未翻译的文本使用原始语言填充',
                    detail: 'source',
                }
            ], {
                placeHolder: '请选择导出策略',
                title: '将翻译同步到语言文件'
            });

            if (!strategyChoice) {
                return; // 用户取消
            }

            // 4. 显示同步预览，询问用户确认
            const fileList = exportFiles.map(file => `• ${file}`).join('\n');
            const confirmMessage = `将翻译内容导出到以下文件：\n\n${fileList}\n\n导出策略: ${strategyChoice.label}\n\n注意：现有文件内容将被覆盖。`;
            
            const choice = await vscode.window.showInformationMessage(
                confirmMessage,
                { modal: true },
                '确认导出'
            );

            if (choice !== '确认导出') {
                return;
            }

            // 5. 执行同步
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在导出翻译到语言文件...",
                cancellable: false
            }, async (progress) => {
                if (!core) {
                    throw new Error('请先初始化项目');
                }
                return await core.exportTranslations({ 
                    fallbackStrategy: strategyChoice.detail as any 
                });
            });

            if (result.success) {
                let successMessage = `翻译导出成功！已更新 ${result.exportedCount} 个语言文件`;
                
                if (result.warnings && result.warnings.length > 0) {
                    successMessage += '\n\n提醒：\n' + result.warnings.join('\n');
                }
                
                vscode.window.showInformationMessage(successMessage);
            } else {
                const errorMessage = `翻译导出失败：\n${result.errors.join('\n')}`;
                vscode.window.showErrorMessage(errorMessage);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`导出失败：${error}`);
        }
    }),

    showI18nViewer: vscode.commands.registerCommand('contexto.showI18nViewer', async () => {
        if (!core) {
            vscode.window.showErrorMessage('请先初始化项目');
            return;
        }

        if (core.getProjectStatus() !== ProjectStatus.INITIALIZED) {
            vscode.window.showErrorMessage('项目配置有误，请先修复配置');
            return;
        }

        try {
            i18nViewer.setCore(core);
            i18nViewer.show();
        } catch (error) {
            vscode.window.showErrorMessage(`打开i18n查看器失败：${error}`);
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
