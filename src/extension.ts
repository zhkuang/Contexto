import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';
import { ContextoProvider, ContextoStatusProvider } from './treeProvider';
import { WelcomeWebviewProvider } from './welcomeWebview';
import { ConfigErrorWebviewProvider } from './configErrorWebview';
import { StatsWebviewProvider } from './statsWebviewProvider';
import { I18nViewerWebview } from './i18nViewerWebview';
import { ProjectStatus } from './types';
import { Logger } from './logger';

let core: ContextoCore | null = null;
let treeProvider: ContextoProvider;
let statusProvider: ContextoStatusProvider;
let welcomeProvider: WelcomeWebviewProvider;
let configErrorProvider: ConfigErrorWebviewProvider;
let statsProvider: StatsWebviewProvider;
let i18nViewer: I18nViewerWebview;

export function activate(context: vscode.ExtensionContext) {
    console.log('Contexto插件已激活');

    // 初始化providers
    treeProvider = new ContextoProvider();
    statusProvider = new ContextoStatusProvider();
    welcomeProvider = new WelcomeWebviewProvider(context.extensionUri);
    configErrorProvider = new ConfigErrorWebviewProvider(context.extensionUri);
    statsProvider = new StatsWebviewProvider(context.extensionUri);
    i18nViewer = new I18nViewerWebview(context.extensionUri);

    // 注册tree view
    const treeView = vscode.window.createTreeView('contexto', {
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
        i18nViewer.setCore(core);
    } else {
        // 未知状态，为了安全起见，显示配置错误界面
        console.log('未知项目状态，显示配置错误界面');
        await setViewVisibility('configError');
        configErrorProvider.setCore(core);
        statusProvider.updateStatus(core, null);
        statsProvider.setCore(core);
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
            
        } catch (error) {
            vscode.window.showErrorMessage(`项目初始化失败：${error}`);
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
                
                console.log('刷新完成');
                vscode.window.showInformationMessage('Contexto: 刷新完成');
            } catch (error) {
                console.error('刷新失败:', error);
                vscode.window.showErrorMessage(`刷新失败：${error}`);
            }
        } else {
            console.log('项目未正确初始化或配置有误，刷新仅完成状态检查');
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
            
            // 刷新统计面板
            statsProvider.refresh();
        } catch (error) {
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
            
            // 刷新统计面板
            statsProvider.refresh();
        } catch (error) {
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
        } catch (error) {
            vscode.window.showErrorMessage(`配置文件打开失败：${error}`);
        }
    }),

    clearLog: vscode.commands.registerCommand('contexto.clearLog', async () => {
        try {
            const logger = Logger.getInstance();
            logger.clearLog();
            vscode.window.showInformationMessage('日志文件已清空');
        } catch (error) {
            vscode.window.showErrorMessage(`日志清空失败：${error}`);
        }
    }),

    toggleDevLog: vscode.commands.registerCommand('contexto.toggleDevLog', async () => {
        try {
            const logger = Logger.getInstance();
            if (logger.isLoggingEnabled()) {
                logger.disableDevLogging();
                vscode.window.showInformationMessage('开发日志功能已关闭');
            } else {
                logger.enableDevLogging();
                vscode.window.showInformationMessage('开发日志功能已启用，日志将保存到 contexto/log.txt');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`切换日志失败: ${error}`);
        }
    }),

    exportTranslations: vscode.commands.registerCommand('contexto.exportTranslations', async () => {
        if (!core) {
            vscode.window.showErrorMessage('Contexto 项目尚未初始化');
            return;
        }

        try {
            // 1. 检查是否有可导出的数据
            if (!core.hasExportableData()) {
                vscode.window.showWarningMessage('没有可导出的翻译数据，请先执行翻译操作');
                return;
            }

            // 2. 获取导出预览
            const exportFiles = core.getExportPreview();
            if (exportFiles.length === 0) {
                vscode.window.showWarningMessage('目标语种配置为空，请检查 config.json 中的 targetLangs 配置');
                return;
            }

            // 3. 让用户选择导出策略
            const strategyChoice = await vscode.window.showQuickPick([
                {
                    label: '仅导出已翻译内容 (推荐)',
                    description: '只导出已有翻译的键，避免混合语言',
                    detail: 'skip',
                },
                {
                    label: '使用源文本填充',
                    description: '未翻译的键使用源语言文本',
                    detail: 'source',
                }
            ], {
                placeHolder: '选择导出策略',
                title: '导出翻译文件'
            });

            if (!strategyChoice) {
                return; // 用户取消
            }

            // 4. 显示导出预览，询问用户确认
            const fileList = exportFiles.map(file => `• ${file}`).join('\n');
            const confirmMessage = `即将导出翻译文件到以下位置：\n\n${fileList}\n\n策略: ${strategyChoice.label}\n\n注意：这将覆盖已存在的文件。`;
            
            const choice = await vscode.window.showInformationMessage(
                confirmMessage,
                { modal: true },
                '确认导出'
            );

            if (choice !== '确认导出') {
                return;
            }

            // 5. 执行导出
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在导出翻译文件...",
                cancellable: false
            }, async (progress) => {
                if (!core) {
                    throw new Error('Contexto 项目尚未初始化');
                }
                return await core.exportTranslations({ 
                    fallbackStrategy: strategyChoice.detail as any 
                });
            });

            if (result.success) {
                let successMessage = `翻译文件导出成功！已导出 ${result.exportedCount} 个翻译文件`;
                
                if (result.warnings && result.warnings.length > 0) {
                    successMessage += '\n\n注意：\n' + result.warnings.join('\n');
                }
                
                vscode.window.showInformationMessage(successMessage);
            } else {
                const errorMessage = `翻译文件导出失败：\n${result.errors.join('\n')}`;
                vscode.window.showErrorMessage(errorMessage);
            }

        } catch (error) {
            vscode.window.showErrorMessage(`导出翻译文件失败：${error}`);
        }
    }),

    showI18nViewer: vscode.commands.registerCommand('contexto.showI18nViewer', async () => {
        if (!core) {
            vscode.window.showErrorMessage('Contexto 项目尚未初始化');
            return;
        }

        if (core.getProjectStatus() !== ProjectStatus.INITIALIZED) {
            vscode.window.showErrorMessage('项目配置有误，请先修复配置问题');
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
