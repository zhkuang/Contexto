"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextoStatusProvider = exports.ContextoProvider = void 0;
const vscode = require("vscode");
const types_1 = require("./types");
// Tree item for displaying keys
class KeyTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, status, count) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.status = status;
        this.count = count;
        if (status && count !== undefined) {
            this.description = `${count}`;
            this.tooltip = this.getTooltip(status, count);
            this.iconPath = this.getIcon(status);
        }
    }
    getTooltip(status, count) {
        const statusMap = {
            [types_1.KeyStatus.NEW]: '新增的Key',
            [types_1.KeyStatus.UPDATED]: '已更新的Key',
            [types_1.KeyStatus.PENDING]: '待翻译的Key',
            [types_1.KeyStatus.OBSOLETE]: '无用的Key'
        };
        return `${statusMap[status]}: ${count}个`;
    }
    getIcon(status) {
        const iconMap = {
            [types_1.KeyStatus.NEW]: new vscode.ThemeIcon('add', new vscode.ThemeColor('gitDecoration.addedResourceForeground')),
            [types_1.KeyStatus.UPDATED]: new vscode.ThemeIcon('edit', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground')),
            [types_1.KeyStatus.PENDING]: new vscode.ThemeIcon('clock', new vscode.ThemeColor('gitDecoration.untrackedResourceForeground')),
            [types_1.KeyStatus.OBSOLETE]: new vscode.ThemeIcon('trash', new vscode.ThemeColor('gitDecoration.deletedResourceForeground'))
        };
        return iconMap[status];
    }
}
// Individual key item
class IndividualKeyItem extends vscode.TreeItem {
    constructor(keyName, status) {
        super(keyName, vscode.TreeItemCollapsibleState.None);
        this.keyName = keyName;
        this.status = status;
        this.tooltip = keyName;
        this.contextValue = 'contextKey';
    }
}
class ContextoProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.core = null;
        this.analysis = null;
        this.refresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    async setCore(core) {
        this.core = core;
        this.analysis = await core.refreshAnalysis();
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
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
    async getRootElements() {
        if (!this.core || !this.analysis) {
            return [];
        }
        const elements = [];
        // New keys
        if (this.analysis.newKeys.length > 0) {
            elements.push(new KeyTreeItem('新增Key', vscode.TreeItemCollapsibleState.Collapsed, types_1.KeyStatus.NEW, this.analysis.newKeys.length));
        }
        // Updated keys
        if (this.analysis.updatedKeys.length > 0) {
            elements.push(new KeyTreeItem('更新Key', vscode.TreeItemCollapsibleState.Collapsed, types_1.KeyStatus.UPDATED, this.analysis.updatedKeys.length));
        }
        // Pending keys
        if (this.analysis.pendingKeys.length > 0) {
            elements.push(new KeyTreeItem('待翻译Key', vscode.TreeItemCollapsibleState.Collapsed, types_1.KeyStatus.PENDING, this.analysis.pendingKeys.length));
        }
        // Obsolete keys
        if (this.analysis.obsoleteKeys.length > 0) {
            elements.push(new KeyTreeItem('无用Key', vscode.TreeItemCollapsibleState.Collapsed, types_1.KeyStatus.OBSOLETE, this.analysis.obsoleteKeys.length));
        }
        return elements;
    }
    async getKeysForStatus(status) {
        if (!this.analysis) {
            return [];
        }
        let keys = [];
        switch (status) {
            case types_1.KeyStatus.NEW:
                keys = this.analysis.newKeys;
                break;
            case types_1.KeyStatus.UPDATED:
                keys = this.analysis.updatedKeys;
                break;
            case types_1.KeyStatus.PENDING:
                keys = this.analysis.pendingKeys;
                break;
            case types_1.KeyStatus.OBSOLETE:
                keys = this.analysis.obsoleteKeys;
                break;
        }
        return keys.map(key => new IndividualKeyItem(key, status));
    }
    getAnalysis() {
        return this.analysis;
    }
    async updateAnalysis() {
        if (this.core) {
            this.analysis = await this.core.refreshAnalysis();
            this.refresh();
        }
    }
}
exports.ContextoProvider = ContextoProvider;
// Status bar for showing project state
class ContextoStatusProvider {
    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'contexto.refresh';
        this.statusBarItem.show();
    }
    updateStatus(core, analysis) {
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
        }
        else {
            this.statusBarItem.text = `$(globe) Contexto: ${totalKeys}个待处理`;
            this.statusBarItem.tooltip = `新增: ${analysis.newKeys.length}, 更新: ${analysis.updatedKeys.length}, 待翻译: ${analysis.pendingKeys.length}, 无用: ${analysis.obsoleteKeys.length}`;
        }
        this.statusBarItem.command = 'contexto.refresh';
    }
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.ContextoStatusProvider = ContextoStatusProvider;
//# sourceMappingURL=treeProvider.js.map