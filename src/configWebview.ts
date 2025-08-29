import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ContextoCore } from './contextoCore';
import { ContextoConfig, TargetLangConfig } from './types';

export class ConfigWebviewProvider {
    private _view?: vscode.WebviewView;
    private core?: ContextoCore;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public setCore(core: ContextoCore | null) {
        this.core = core || undefined;
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    public show() {
        if (!this.core) {
            vscode.window.showErrorMessage('项目未初始化，无法打开配置页面');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'contextoConfig',
            'Contexto 配置',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    this._extensionUri,
                    vscode.Uri.joinPath(this._extensionUri, 'src', 'webview')
                ]
            }
        );

        panel.webview.html = this._getHtmlForWebview(panel.webview);
        this._setupWebviewMessageListener(panel.webview);

        panel.onDidDispose(() => {
            // 清理资源
        });
    }

    private _setupWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'loadConfig':
                    await this._loadConfig(webview);
                    break;
                case 'saveConfig':
                    await this._saveConfig(webview, data.config);
                    break;
                case 'selectSourceDict':
                    await this._selectSourceDict(webview);
                    break;
                case 'selectOutputPath':
                    await this._selectOutputPath(webview, data.index);
                    break;
                case 'testAIService':
                    await this._testAIService(webview, data.aiConfig);
                    break;
                case 'addTargetLang':
                    this._addTargetLang(webview);
                    break;
                case 'removeTargetLang':
                    this._removeTargetLang(webview, data.index);
                    break;
            }
        });
    }

    private async _loadConfig(webview: vscode.Webview) {
        if (!this.core) {
            return;
        }

        try {
            // 通过 core 的 getConfig 方法获取配置
            const config = this.core.getConfig();
            if (config) {
                webview.postMessage({
                    type: 'configLoaded',
                    config: config
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`加载配置失败：${error}`);
        }
    }

    private async _saveConfig(webview: vscode.Webview, config: ContextoConfig) {
        if (!this.core) {
            return;
        }

        try {
            // 验证配置
            const validation = this._validateConfig(config);
            if (!validation.isValid) {
                webview.postMessage({
                    type: 'validationError',
                    errors: validation.errors
                });
                return;
            }

            // 通过直接操作配置文件来保存
            const fs = await import('fs');
            const configPath = this.core.getConfigPath();
            const configContent = JSON.stringify(config, null, 4);
            fs.writeFileSync(configPath, configContent, 'utf-8');
            
            webview.postMessage({
                type: 'configSaved'
            });

            vscode.window.showInformationMessage('配置保存成功！');
            
            // 重新初始化项目以应用新配置
            vscode.commands.executeCommand('contexto.refresh');

        } catch (error) {
            vscode.window.showErrorMessage(`保存配置失败：${error}`);
            webview.postMessage({
                type: 'saveError',
                error: String(error)
            });
        }
    }

    private async _selectSourceDict(webview: vscode.Webview) {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'JSON 文件': ['json']
            },
            title: '选择源语言字典文件'
        });

        if (files && files.length > 0) {
            const workspaceRoot = this.core?.getWorkspaceRoot();
            if (workspaceRoot) {
                const path = await import('path');
                const relativePath = path.relative(workspaceRoot, files[0].fsPath);
                webview.postMessage({
                    type: 'sourceDictSelected',
                    path: './' + relativePath.replace(/\\/g, '/')
                });
            }
        }
    }

    private async _selectOutputPath(webview: vscode.Webview, index: number) {
        // 先询问用户是要选择文件还是目录
        const choice = await vscode.window.showQuickPick([
            {
                label: '选择现有文件',
                description: '浏览并选择一个现有的 JSON 文件',
                detail: '将直接使用选择的文件路径作为输出路径'
            },
            {
                label: '选择目录',
                description: '选择一个目录，系统会自动生成文件名',
                detail: '文件名格式：[语言代码].json'
            }
        ], {
            placeHolder: '请选择路径类型'
        });

        if (!choice) {
            return; // 用户取消
        }

        if (choice.label === '选择现有文件') {
            // 选择现有文件
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON 文件': ['json']
                },
                title: '选择现有的目标语言文件',
                defaultUri: this.core ? vscode.Uri.file(this.core.getWorkspaceRoot()) : undefined
            });

            if (files && files.length > 0) {
                const workspaceRoot = this.core?.getWorkspaceRoot();
                if (workspaceRoot) {
                    const path = await import('path');
                    const relativePath = path.relative(workspaceRoot, files[0].fsPath);
                    webview.postMessage({
                        type: 'outputPathSelected',
                        index: index,
                        path: './' + relativePath.replace(/\\/g, '/')
                    });
                }
            }
        } else {
            // 选择目录
            const folders = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: '选择输出目录'
            });

            if (folders && folders.length > 0) {
                const workspaceRoot = this.core?.getWorkspaceRoot();
                if (workspaceRoot) {
                    const path = await import('path');
                    const relativePath = path.relative(workspaceRoot, folders[0].fsPath);
                    webview.postMessage({
                        type: 'outputPathSelected',
                        index: index,
                        path: './' + relativePath.replace(/\\/g, '/'),
                        isDirectory: true
                    });
                }
            }
        }
    }

    private async _testAIService(webview: vscode.Webview, aiConfig: any) {
        try {
            webview.postMessage({
                type: 'testingAI'
            });

            // 创建临时的 AI 服务实例进行测试
            const { OpenAIService } = await import('./aiService');
            const aiService = new OpenAIService(aiConfig, 5);
            
            // 执行简单的翻译测试
            const testTasks = [{
                key: 'test',
                source: '你好',
                targetLang: 'en'
            }];

            console.log('开始AI服务测试，配置:', aiConfig);
            const result = await aiService.translateText(testTasks);
            console.log('AI服务测试返回结果:', result);
            
            // AI服务返回的key格式是 'test_en'
            const expectedKey = 'test_en';
            const testResult = result[expectedKey];
            
            if (result && testResult && testResult.trim() && !testResult.startsWith('[翻译失败')) {
                webview.postMessage({
                    type: 'testResult',
                    success: true,
                    result: '测试成功！'
                });
                // 只在页面显示成功消息，不弹出系统提示
                console.log('AI 服务测试成功，翻译结果:', testResult);
            } else {
                // 提供更详细的错误信息
                const availableKeys = Object.keys(result || {});
                const errorMsg = `翻译测试失败。期望的键: ${expectedKey}，返回的结果: ${JSON.stringify(result)}，可用的键: [${availableKeys.join(', ')}]`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

        } catch (error) {
            console.error('AI服务测试异常:', error);
            webview.postMessage({
                type: 'testResult',
                success: false,
                error: String(error)
            });
            // 移除重复的系统错误提示，只在页面显示
        }
    }

    private _addTargetLang(webview: vscode.Webview) {
        webview.postMessage({
            type: 'addTargetLang'
        });
    }

    private _removeTargetLang(webview: vscode.Webview, index: number) {
        webview.postMessage({
            type: 'removeTargetLang',
            index: index
        });
    }

    private _validateConfig(config: ContextoConfig): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 验证源语言字典
        if (!config.sourceLangDict || config.sourceLangDict.trim() === '') {
            errors.push('源语言字典文件路径不能为空');
        }

        // 验证上下文行数
        if (config.contextLines !== undefined) {
            if (!Number.isInteger(config.contextLines) || config.contextLines < 1 || config.contextLines > 20) {
                errors.push('上下文提取行数必须是1-20之间的整数');
            }
        }

        // 验证目标语言
        if (!config.targetLangs || config.targetLangs.length === 0) {
            errors.push('至少需要配置一个目标语言');
        } else {
            config.targetLangs.forEach((lang, index) => {
                if (typeof lang === 'string') {
                    if (!lang.trim()) {
                        errors.push(`第 ${index + 1} 个目标语言代码不能为空`);
                    }
                } else {
                    if (!lang.lang || !lang.lang.trim()) {
                        errors.push(`第 ${index + 1} 个目标语言代码不能为空`);
                    }
                }
            });
        }

        // 验证 AI 服务配置
        if (!config.aiService) {
            errors.push('AI 服务配置不能为空');
        } else {
            if (!config.aiService.type || !config.aiService.type.trim()) {
                errors.push('AI 服务类型不能为空');
            }
            if (!config.aiService.apiKey || !config.aiService.apiKey.trim()) {
                errors.push('API Key 不能为空');
            }
            if (!config.aiService.base || !config.aiService.base.trim()) {
                errors.push('API 基础地址不能为空');
            }
            if (!config.aiService.model || !config.aiService.model.trim()) {
                errors.push('模型名称不能为空');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // 优先使用编译输出目录，如果不存在则回退到源码目录
        let htmlPath = path.join(__dirname, 'webview', 'configWebview.html');
        let jsPath = path.join(__dirname, 'webview', 'configWebview.js');
        
        // 如果编译输出目录中没有webview文件，使用源码目录（开发时）
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'configWebview.html');
            jsPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'configWebview.js');
        }
        
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // 创建脚本资源URI
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(jsPath));
        
        // 替换模板中的占位符
        htmlContent = htmlContent.replace('{{SCRIPT_URI}}', scriptUri.toString());
        
        return htmlContent;
    }
}
