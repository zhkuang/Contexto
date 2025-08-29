const vscode = acquireVsCodeApi();

function initProject() {
    vscode.postMessage({
        type: 'initProject'
    });
}
