import { t } from 'i18next';

export class LoginForm {
    constructor() {
        this.initializeForm();
    }

    initializeForm() {
        const form = document.createElement('form');
        
        // 创建用户名输入框
        const usernameLabel = document.createElement('label');
        usernameLabel.textContent = t('user.username');
        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.required = true;
        
        // 创建密码输入框
        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = t('user.password');
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.required = true;
        
        // 创建登录按钮
        const loginButton = document.createElement('button');
        loginButton.textContent = t('user.login');
        loginButton.type = 'submit';
        
        // 创建取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = t('common.cancel');
        cancelButton.type = 'button';
        
        // 组装表单
        form.appendChild(usernameLabel);
        form.appendChild(usernameInput);
        form.appendChild(passwordLabel);
        form.appendChild(passwordInput);
        form.appendChild(loginButton);
        form.appendChild(cancelButton);
        
        // 添加事件监听
        form.addEventListener('submit', this.handleSubmit.bind(this));
        cancelButton.addEventListener('click', this.handleCancel.bind(this));
        
        document.body.appendChild(form);
    }
    
    handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        if (!formData.get('username')) {
            alert(t('validation.required'));
            return;
        }
        
        if (!formData.get('password')) {
            alert(t('validation.required'));
            return;
        }
        
        // 模拟登录过程
        this.showLoading();
        setTimeout(() => {
            this.hideLoading();
            alert(t('messages.welcome'));
        }, 2000);
    }
    
    handleCancel() {
        if (confirm(t('messages.goodbye'))) {
            window.close();
        }
    }
    
    showLoading() {
        const loading = document.createElement('div');
        loading.textContent = t('common.loading');
        loading.id = 'loading';
        document.body.appendChild(loading);
    }
    
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.remove();
        }
    }
}
