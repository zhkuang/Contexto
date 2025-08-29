const vscode = acquireVsCodeApi();

function openConfig() {
    vscode.postMessage({ type: 'openConfig' });
}

function refresh() {
    vscode.postMessage({ type: 'refresh' });
}
