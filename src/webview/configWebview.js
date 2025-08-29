// VS Code Webview API
const vscode = acquireVsCodeApi();
let currentConfig = {};

// 页面加载时请求配置
window.addEventListener('load', () => {
    loadConfig();
});

// 监听来自扩展的消息
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
        case 'configLoaded':
            currentConfig = message.config;
            populateForm(message.config);
            break;
        case 'configSaved':
            showSuccess('配置保存成功！');
            setLoading(false);
            break;
        case 'validationError':
            showErrors(message.errors);
            setLoading(false);
            break;
        case 'saveError':
            showError('保存失败：' + message.error);
            setLoading(false);
            break;
        case 'sourceDictSelected':
            document.getElementById('sourceLangDict').value = message.path;
            break;
        case 'outputPathSelected':
            const pathInput = document.querySelector(`#targetLang_${message.index}_path`);
            if (pathInput) {
                if (message.isDirectory) {
                    // 如果选择的是目录，需要结合语言代码生成完整路径
                    const langInput = document.querySelector(`#targetLang_${message.index}_lang`);
                    const langCode = langInput ? langInput.value.trim() : '';
                    if (langCode) {
                        pathInput.value = `${message.path}/${langCode}.json`;
                    } else {
                        pathInput.value = message.path;
                        // 提示用户需要先填写语言代码
                        pathInput.placeholder = '请先填写语言代码，然后重新选择目录';
                    }
                } else {
                    // 直接使用选择的文件路径
                    pathInput.value = message.path;
                }
            }
            break;
        case 'testingAI':
            setTestLoading(true);
            break;
        case 'testResult':
            setTestLoading(false);
            if (message.success) {
                showTestResult(true, '测试成功！');
            } else {
                showTestResult(false, '测试失败：' + message.error);
            }
            break;
        case 'addTargetLang':
            addTargetLangItem();
            break;
        case 'removeTargetLang':
            removeTargetLangItem(message.index);
            break;
    }
});

function loadConfig() {
    vscode.postMessage({ type: 'loadConfig' });
}

function saveConfig() {
    const config = collectFormData();
    if (config) {
        setLoading(true);
        vscode.postMessage({ 
            type: 'saveConfig', 
            config: config 
        });
    }
}

function selectSourceDict() {
    vscode.postMessage({ type: 'selectSourceDict' });
}

function selectOutputPath(index) {
    vscode.postMessage({ 
        type: 'selectOutputPath', 
        index: index 
    });
}

function testAIService() {
    const aiConfig = {
        type: document.getElementById('aiServiceType').value,
        apiKey: document.getElementById('apiKey').value,
        base: document.getElementById('apiBase').value,
        model: document.getElementById('model').value
    };

    if (!aiConfig.apiKey || !aiConfig.base || !aiConfig.model) {
        showTestResult(false, '请先填写完整的 AI 服务配置');
        return;
    }

    vscode.postMessage({ 
        type: 'testAIService', 
        aiConfig: aiConfig 
    });
}

function addTargetLang() {
    addTargetLangItem('', '');
}

function addTargetLangItem(lang = '', outputPath = '') {
    const container = document.getElementById('targetLangsContainer');
    const index = container.children.length;
    
    // 移除空状态
    if (container.classList.contains('empty-state')) {
        container.classList.remove('empty-state');
        container.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = 'target-lang-item';
    item.innerHTML = `
        <input type="text" class="form-input" placeholder="语言代码 (如: en, zh-TW)" 
               value="${lang}" id="targetLang_${index}_lang" 
               onchange="updateOutputPathForLang(${index})" />
        <input type="text" class="form-input" placeholder="输出路径 (可选，默认: ./contexto/locales/[lang].json)" 
               value="${outputPath}" id="targetLang_${index}_path" readonly />
        <button class="btn btn-secondary btn-small" onclick="selectOutputPath(${index})" title="选择输出文件或目录">浏览</button>
        <button class="btn btn-danger btn-small" onclick="removeTargetLang(${index})">删除</button>
    `;
    
    container.appendChild(item);
}

function updateOutputPathForLang(index) {
    const langInput = document.querySelector(`#targetLang_${index}_lang`);
    const pathInput = document.querySelector(`#targetLang_${index}_path`);
    
    if (langInput && pathInput && pathInput.value) {
        const langCode = langInput.value.trim();
        const currentPath = pathInput.value;
        
        // 检查当前路径是否看起来像是目录路径（以目录结尾，不以.json结尾）
        if (langCode && !currentPath.endsWith('.json') && (currentPath.includes('/') || currentPath === '')) {
            if (currentPath === '') {
                // 如果是空路径，使用默认路径
                pathInput.value = `./contexto/locales/${langCode}.json`;
            } else {
                // 如果是目录路径，更新文件名
                const basePath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
                pathInput.value = `${basePath}${langCode}.json`;
            }
        }
    }
}

function removeTargetLang(index) {
    const container = document.getElementById('targetLangsContainer');
    if (container.children.length > 1) {
        container.children[index].remove();
        // 重新分配索引
        Array.from(container.children).forEach((item, newIndex) => {
            const langInput = item.querySelector('input[id^="targetLang_"][id$="_lang"]');
            const pathInput = item.querySelector('input[id^="targetLang_"][id$="_path"]');
            const selectBtn = item.querySelector('button[onclick^="selectOutputPath"]');
            const removeBtn = item.querySelector('button[onclick^="removeTargetLang"]');
            
            if (langInput) langInput.id = `targetLang_${newIndex}_lang`;
            if (pathInput) pathInput.id = `targetLang_${newIndex}_path`;
            if (selectBtn) selectBtn.setAttribute('onclick', `selectOutputPath(${newIndex})`);
            if (removeBtn) removeBtn.setAttribute('onclick', `removeTargetLang(${newIndex})`);
        });
    } else {
        // 如果删除后没有项目了，显示空状态
        container.children[index].remove();
        if (container.children.length === 0) {
            container.classList.add('empty-state');
            container.innerHTML = '';
        }
    }
}

function addIgnorePath() {
    addIgnorePathItem('');
}

function addIgnorePathItem(path = '') {
    const container = document.getElementById('ignoreContainer');
    const index = container.children.length;
    
    // 移除空状态
    if (container.classList.contains('empty-state')) {
        container.classList.remove('empty-state');
        container.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = 'ignore-item';
    item.innerHTML = `
        <input type="text" class="form-input" placeholder="./node_modules" 
               value="${path}" id="ignore_${index}" />
        <button class="btn btn-danger btn-small" onclick="removeIgnorePath(${index})">删除</button>
    `;
    
    container.appendChild(item);
}

function removeIgnorePath(index) {
    const container = document.getElementById('ignoreContainer');
    if (container.children.length > 0) {
        container.children[index].remove();
        // 重新分配索引
        Array.from(container.children).forEach((item, newIndex) => {
            const input = item.querySelector('input');
            const button = item.querySelector('button');
            
            if (input) input.id = `ignore_${newIndex}`;
            if (button) button.setAttribute('onclick', `removeIgnorePath(${newIndex})`);
        });
        
        // 如果删除后没有项目了，显示空状态
        if (container.children.length === 0) {
            container.classList.add('empty-state');
            container.innerHTML = '';
        }
    }
}

function populateForm(config) {
    // 填充基础配置
    document.getElementById('sourceLangDict').value = config.sourceLangDict || '';
    document.getElementById('contextLines').value = config.contextLines || 5;
    
    // 填充目标语言
    const targetLangsContainer = document.getElementById('targetLangsContainer');
    targetLangsContainer.innerHTML = '';
    targetLangsContainer.classList.remove('empty-state');
    
    if (config.targetLangs && config.targetLangs.length > 0) {
        config.targetLangs.forEach(lang => {
            if (typeof lang === 'string') {
                addTargetLangItem(lang, '');
            } else {
                addTargetLangItem(lang.lang, lang.outputPath || '');
            }
        });
    } else {
        addTargetLangItem('', '');
    }
    
    // 填充忽略路径
    const ignoreContainer = document.getElementById('ignoreContainer');
    ignoreContainer.innerHTML = '';
    ignoreContainer.classList.remove('empty-state');
    
    if (config.ignore && config.ignore.length > 0) {
        config.ignore.forEach(path => {
            addIgnorePathItem(path);
        });
    } else {
        addIgnorePathItem('./contexto');
        addIgnorePathItem('./node_modules');
        addIgnorePathItem('./.git');
    }
    
    // 填充 AI 服务配置
    if (config.aiService) {
        document.getElementById('aiServiceType').value = config.aiService.type || 'openai';
        document.getElementById('apiKey').value = config.aiService.apiKey || '';
        document.getElementById('apiBase').value = config.aiService.base || 'https://api.openai.com/v1';
        document.getElementById('model').value = config.aiService.model || 'gpt-4';
    }
}

function collectFormData() {
    const config = {
        sourceLangDict: document.getElementById('sourceLangDict').value.trim(),
        contextLines: parseInt(document.getElementById('contextLines').value) || 5,
        targetLangs: [],
        ignore: [],
        aiService: {
            type: document.getElementById('aiServiceType').value,
            apiKey: document.getElementById('apiKey').value.trim(),
            base: document.getElementById('apiBase').value.trim(),
            model: document.getElementById('model').value.trim()
        }
    };

    // 收集目标语言
    const targetLangsContainer = document.getElementById('targetLangsContainer');
    Array.from(targetLangsContainer.children).forEach((item, index) => {
        const langInput = item.querySelector(`#targetLang_${index}_lang`);
        const pathInput = item.querySelector(`#targetLang_${index}_path`);
        
        if (langInput && langInput.value.trim()) {
            const lang = langInput.value.trim();
            const outputPath = pathInput ? pathInput.value.trim() : '';
            
            if (outputPath) {
                config.targetLangs.push({
                    lang: lang,
                    outputPath: outputPath
                });
            } else {
                config.targetLangs.push(lang);
            }
        }
    });

    // 收集忽略路径
    const ignoreContainer = document.getElementById('ignoreContainer');
    Array.from(ignoreContainer.children).forEach((item, index) => {
        const input = item.querySelector(`#ignore_${index}`);
        if (input && input.value.trim()) {
            config.ignore.push(input.value.trim());
        }
    });

    return config;
}

function setLoading(loading) {
    const saveBtn = document.getElementById('saveBtn');
    const container = document.querySelector('.container');
    
    if (loading) {
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';
        container.classList.add('loading');
    } else {
        saveBtn.disabled = false;
        saveBtn.textContent = '保存配置';
        container.classList.remove('loading');
    }
}

function setTestLoading(loading) {
    const testBtn = document.getElementById('testBtn');
    
    if (loading) {
        testBtn.disabled = true;
        testBtn.textContent = '测试中...';
    } else {
        testBtn.disabled = false;
        testBtn.textContent = '测试连接';
    }
}

function showTestResult(success, message) {
    const container = document.getElementById('testResult');
    container.innerHTML = `<div class="test-result ${success ? 'success' : 'error'}">${message}</div>`;
}

function showErrors(errors) {
    const container = document.getElementById('errorContainer');
    const errorHtml = errors.map(error => `<div class="error-message">${error}</div>`).join('');
    container.innerHTML = errorHtml;
    
    // 滚动到错误区域
    container.scrollIntoView({ behavior: 'smooth' });
}

function showError(message) {
    showErrors([message]);
}

function showSuccess(message) {
    const container = document.getElementById('errorContainer');
    container.innerHTML = `<div class="success-message">${message}</div>`;
    
    // 3秒后清除消息
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}
