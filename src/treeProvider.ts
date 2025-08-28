import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';
import { KeyAnalysis, KeyStatus, ProjectStatus } from './types';

// Tree item for displaying keys
class KeyTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly status?: KeyStatus,
        public readonly count?: number
    ) {
        super(label, collapsibleState);
        
        if (status && count !== undefined) {
            this.description = `${count}`;
            this.tooltip = this.getTooltip(status, count);
            this.iconPath = this.getIcon(status);
        }
    }

    private getTooltip(status: KeyStatus, count: number): string {
        const statusMap = {
            [KeyStatus.NEW]: '新增的Key',
            [KeyStatus.UPDATED]: '已更新的Key',
            [KeyStatus.PENDING]: '待翻译的Key',
            [KeyStatus.OBSOLETE]: '无用的Key'
        };
        return `${statusMap[status]}: ${count}个`;
    }

    private getIcon(status: KeyStatus): vscode.ThemeIcon {
        const iconMap = {
            [KeyStatus.NEW]: new vscode.ThemeIcon('add', new vscode.ThemeColor('gitDecoration.addedResourceForeground')),
            [KeyStatus.UPDATED]: new vscode.ThemeIcon('edit', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground')),
            [KeyStatus.PENDING]: new vscode.ThemeIcon('clock', new vscode.ThemeColor('gitDecoration.untrackedResourceForeground')),
            [KeyStatus.OBSOLETE]: new vscode.ThemeIcon('trash', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'))
        };
        return iconMap[status];
    }
}

// Individual key item
class IndividualKeyItem extends vscode.TreeItem {
    constructor(
        public readonly keyName: string,
        public readonly status: KeyStatus
    ) {
        super(keyName, vscode.TreeItemCollapsibleState.None);
        this.tooltip = keyName;
        this.contextValue = 'contextKey';
    }
}

// Welcome message item for uninitialized projects
class WelcomeItem extends vscode.TreeItem {
    constructor(public readonly message: string, public readonly isPlaceholder: boolean = false) {
        super(message, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'welcomeMessage';
        
        if (isPlaceholder) {
            // 使用更淡的颜色样式
            this.iconPath = undefined;
            this.description = '';
            // 设置为更淡的文字颜色
            this.resourceUri = undefined;
        }
    }
}

// Initialize button item
class InitializeItem extends vscode.TreeItem {
    constructor() {
        super('🚀 初始化 Contexto 项目', vscode.TreeItemCollapsibleState.None);
        this.tooltip = '点击初始化 Contexto 项目，开始智能国际化翻译';
        this.command = {
            command: 'contexto.initProject',
            title: '初始化项目'
        };
        this.iconPath = new vscode.ThemeIcon('rocket', new vscode.ThemeColor('button.background'));
        this.contextValue = 'initializeButton';
    }
}

export class ContextoProvider implements vscode.TreeDataProvider<KeyTreeItem | IndividualKeyItem | WelcomeItem | InitializeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<KeyTreeItem | IndividualKeyItem | WelcomeItem | InitializeItem | undefined | null | void> = new vscode.EventEmitter<KeyTreeItem | IndividualKeyItem | WelcomeItem | InitializeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<KeyTreeItem | IndividualKeyItem | WelcomeItem | InitializeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private core: ContextoCore | null = null;
    private analysis: KeyAnalysis | null = null;
    private isInitialized: boolean = false;

    constructor() {
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async setCore(core: ContextoCore | null): Promise<void> {
        this.core = core;
        this.isInitialized = core ? core.isInitialized() : false;
        if (this.isInitialized && core) {
            this.analysis = await core.refreshAnalysis();
        } else {
            this.analysis = null;
        }
        this.refresh();
    }

    getTreeItem(element: KeyTreeItem | IndividualKeyItem | WelcomeItem | InitializeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: KeyTreeItem | IndividualKeyItem | WelcomeItem | InitializeItem): Thenable<(KeyTreeItem | IndividualKeyItem | WelcomeItem | InitializeItem)[]> {
        if (!element) {
            // Root level
            if (!this.core) {
                return Promise.resolve([
                    new WelcomeItem('请打开一个工作区文件夹以开始使用 Contexto')
                ]);
            }

            if (!this.isInitialized) {
                return Promise.resolve([
                    new WelcomeItem(''),
                    new WelcomeItem('🌍 欢迎使用 Contexto'),
                    new WelcomeItem(''),
                    new WelcomeItem('📝 智能国际化翻译助手'),
                    new WelcomeItem('🎯 符合业务场景的本土化翻译'),
                    new WelcomeItem('🤖 基于AI的智能翻译推荐'),
                    new WelcomeItem(''),
                    new InitializeItem(),
                    new WelcomeItem(''),
                    new WelcomeItem('💡 初始化后即可开始使用所有功能')
                ]);
            }

            // Show status categories for initialized projects
            return this.getRootElements();
        }

        if (element instanceof KeyTreeItem && element.status) {
            // Show individual keys for a status category
            return this.getKeysForStatus(element.status);
        }

        return Promise.resolve([]);
    }

    private async getRootElements(): Promise<(KeyTreeItem | WelcomeItem)[]> {
        if (!this.core || !this.analysis) {
            return [];
        }

        const elements: (KeyTreeItem | WelcomeItem)[] = [];

        // New keys
        if (this.analysis.newKeys.length > 0) {
            elements.push(new KeyTreeItem(
                '新增Key',
                vscode.TreeItemCollapsibleState.Collapsed,
                KeyStatus.NEW,
                this.analysis.newKeys.length
            ));
        }

        // Updated keys
        if (this.analysis.updatedKeys.length > 0) {
            elements.push(new KeyTreeItem(
                '更新Key',
                vscode.TreeItemCollapsibleState.Collapsed,
                KeyStatus.UPDATED,
                this.analysis.updatedKeys.length
            ));
        }

        // Pending keys
        if (this.analysis.pendingKeys.length > 0) {
            elements.push(new KeyTreeItem(
                '待翻译Key',
                vscode.TreeItemCollapsibleState.Collapsed,
                KeyStatus.PENDING,
                this.analysis.pendingKeys.length
            ));
        }

        // Show empty state message if no translation tasks
        if (elements.length === 0) {
            return [
                new WelcomeItem('未发现需要翻译的内容，如有修改可刷新查看', true),
            ];
        }

        return elements;
    }

    private async getKeysForStatus(status: KeyStatus): Promise<IndividualKeyItem[]> {
        if (!this.analysis) {
            return [];
        }

        let keys: string[] = [];
        switch (status) {
            case KeyStatus.NEW:
                keys = this.analysis.newKeys;
                break;
            case KeyStatus.UPDATED:
                keys = this.analysis.updatedKeys;
                break;
            case KeyStatus.PENDING:
                keys = this.analysis.pendingKeys;
                break;
            case KeyStatus.OBSOLETE:
                keys = this.analysis.obsoleteKeys;
                break;
        }

        return keys.map(key => new IndividualKeyItem(key, status));
    }

    getAnalysis(): KeyAnalysis | null {
        return this.analysis;
    }

    async updateAnalysis(): Promise<void> {
        if (this.core) {
            this.analysis = await this.core.refreshAnalysis();
            this.refresh();
        }
    }
}

// Status bar for showing project state
export class ContextoStatusProvider {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'contexto.refresh';
        this.statusBarItem.show();
    }

    updateStatus(core: ContextoCore | null, analysis: KeyAnalysis | null): void {
        if (!core) {
            this.statusBarItem.text = '$(globe) Contexto: 未打开项目';
            this.statusBarItem.tooltip = '请打开一个项目';
            return;
        }

        if (!core.isInitialized()) {
            this.statusBarItem.text = '$(globe) Contexto: 未初始化';
            this.statusBarItem.tooltip = '点击初始化项目';
            this.statusBarItem.command = 'contexto.initProject';
            return;
        }

        const projectStatus = core.getProjectStatus();
        if (projectStatus === ProjectStatus.CONFIG_ERROR) {
            this.statusBarItem.text = '$(globe) Contexto: 配置异常';
            this.statusBarItem.tooltip = '配置文件存在错误，点击查看详情';
            this.statusBarItem.command = 'contexto.openConfig';
            return;
        }

        if (!analysis) {
            this.statusBarItem.text = '$(globe) Contexto: 加载中...';
            this.statusBarItem.tooltip = '正在分析项目';
            return;
        }

        const totalKeys = analysis.newKeys.length + analysis.updatedKeys.length + 
                         analysis.pendingKeys.length;
        
        if (totalKeys === 0) {
            this.statusBarItem.text = '$(globe) Contexto: 已同步';
            this.statusBarItem.tooltip = '所有翻译都是最新的';
        } else {
            this.statusBarItem.text = `$(globe) Contexto: ${totalKeys}个待处理`;
            this.statusBarItem.tooltip = `新增: ${analysis.newKeys.length}, 更新: ${analysis.updatedKeys.length}, 待翻译: ${analysis.pendingKeys.length}`;
        }
        
        this.statusBarItem.command = 'contexto.refresh';
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
