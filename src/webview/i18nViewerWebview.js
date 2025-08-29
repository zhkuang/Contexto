const vscode = acquireVsCodeApi();

// 监听来自扩展的消息
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'showLoading':
            showLoadingStatus(message.message);
            break;
        case 'hideLoading':
            hideLoadingStatus();
            break;
    }
});

function showLoadingStatus(message) {
    const refreshBtn = document.querySelector('.btn[onclick="refreshData()"]');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = message || '刷新中...';
    }
}

function hideLoadingStatus() {
    const refreshBtn = document.querySelector('.btn[onclick="refreshData()"]');
    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '🔄 刷新';
    }
}

function refreshData() {
    vscode.postMessage({ type: 'refresh' });
}

function exportToExcel() {
    vscode.postMessage({ type: 'exportExcel' });
}

function triggerImport() {
    document.getElementById('fileInput').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            vscode.postMessage({ 
                type: 'importExcel', 
                fileContent: e.target.result,
                fileName: file.name 
            });
            // 清空文件输入，允许重复导入同一文件
            event.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    }
}

function updateTranslation(key, lang, value) {
    vscode.postMessage({
        type: 'updateTranslation',
        key: key,
        lang: lang,
        value: value
    });
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 添加防抖的更新函数
const debouncedUpdateTranslation = debounce(updateTranslation, 500);
