document.addEventListener('DOMContentLoaded', () => {
    // 加载保存的设置
    chrome.storage.sync.get(['apiUrl', 'token', 'model'], (result) => {
        document.getElementById('apiUrl').value = result.apiUrl || '';
        document.getElementById('token').value = result.token || '';
        document.getElementById('model').value = result.model || '';
    });
    
    // 保存设置
    document.getElementById('saveSettings').addEventListener('click', () => {
        const apiUrl = document.getElementById('apiUrl').value;
        const token = document.getElementById('token').value;
        const model = document.getElementById('model').value;

        chrome.storage.sync.set({ apiUrl, token, model }, () => {
            alert('API设置已保存！');
        });
    });
});