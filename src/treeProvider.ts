import * as vscode from 'vscode';
import { ContextoCore } from './contextoCore';
import { KeyAnalysis, KeyStatus } from './types';

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

export class ContextoProvider implements vscode.TreeDataProvider<KeyTreeItem | IndividualKeyItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<KeyTreeItem | IndividualKeyItem | undefined | null | void> = new vscode.EventEmitter<KeyTreeItem | IndividualKeyItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<KeyTreeItem | IndividualKeyItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private core: ContextoCore | null = null;
    private analysis: KeyAnalysis | null = null;

    constructor() {
        this.refresh();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async setCore(core: ContextoCore): Promise<void> {
        this.core = core;
        this.analysis = await core.refreshAnalysis();
        this.refresh();
    }

    getTreeItem(element: KeyTreeItem | IndividualKeyItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: KeyTreeItem | IndividualKeyItem): Thenable<(KeyTreeItem | IndividualKeyItem)[]> {
        if (!this.core) {
            return Promise.resolve([]);
        }

        if (!element) {
            // Root level - show status categories
            return this.getRootElements();
        }

        if (element instanceof KeyTreeItem && element.status) {
            // Show individual keys for a status category
            return this.getKeysForStatus(element.status);
        }

        return Promise.resolve([]);
    }

    private async getRootElements(): Promise<KeyTreeItem[]> {
        if (!this.core || !this.analysis) {
            return [];
        }

        const elements: KeyTreeItem[] = [];

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

        // Obsolete keys
        if (this.analysis.obsoleteKeys.length > 0) {
            elements.push(new KeyTreeItem(
                '无用Key',
                vscode.TreeItemCollapsibleState.Collapsed,
                KeyStatus.OBSOLETE,
                this.analysis.obsoleteKeys.length
            ));
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

        if (!analysis) {
            this.statusBarItem.text = '$(globe) Contexto: 加载中...';
            this.statusBarItem.tooltip = '正在分析项目';
            return;
        }

        const totalKeys = analysis.newKeys.length + analysis.updatedKeys.length + 
                         analysis.pendingKeys.length + analysis.obsoleteKeys.length;
        
        if (totalKeys === 0) {
            this.statusBarItem.text = '$(globe) Contexto: 已同步';
            this.statusBarItem.tooltip = '所有翻译都是最新的';
        } else {
            this.statusBarItem.text = `$(globe) Contexto: ${totalKeys}个待处理`;
            this.statusBarItem.tooltip = `新增: ${analysis.newKeys.length}, 更新: ${analysis.updatedKeys.length}, 待翻译: ${analysis.pendingKeys.length}, 无用: ${analysis.obsoleteKeys.length}`;
        }
        
        this.statusBarItem.command = 'contexto.refresh';
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
