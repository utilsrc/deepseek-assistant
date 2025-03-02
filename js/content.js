// 创建弹框
function createPopup () {
    // 获取用户选择的文本位置
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // 创建弹框
    let popup = document.createElement("div");
    popup.id = "chat-popup";
    popup.innerHTML = `
        <div id="chat-header">
            <span>DeepSeek Assistant</span>
            <button id="chat-close">×</button>
        </div>
        <div id="chat-content"></div>
    `;

    // 设置弹框初始位置
    popup.style.position = "absolute";
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 10}px`;

    document.body.appendChild(popup);

    // 关闭按钮功能
    document.getElementById("chat-close").addEventListener("click", async () => {
        markdownBuffer = "";
        popup.remove();

        await chrome.runtime.sendMessage({ action: "abortStream" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
            } else {
                console.log("Message sent successfully: ", response);
            }
        });
    });

    // 让弹框可拖动
    makeDraggable(popup);
}

// 让弹框可拖动
function makeDraggable (popup) {
    let header = document.getElementById("chat-header");
    let offsetX, offsetY, isDragging = false;

    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - popup.offsetLeft;
        offsetY = e.clientY - popup.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            popup.style.left = e.clientX - offsetX + "px";
            popup.style.top = e.clientY - offsetY + "px";
        }
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });
}

let markdownBuffer = ""; // 全局存储 Markdown 语法文本

// 流式更新弹框内容
function appendToPopup (text) {
    let contentDiv = document.getElementById("chat-content");
    if (!contentDiv) {
        createPopup();
        contentDiv = document.getElementById("chat-content");
    }

    let span = document.createElement("span");
    contentDiv.appendChild(span);

    let index = 0;
    let currentHeight = 200; // 缓存当前高度，初始值为 200px

    function typeText () {
        if (index < text.length) {
            markdownBuffer += text[index++]; // 追加到 Markdown 缓冲区
            contentDiv.innerHTML = marked.parse(markdownBuffer); // 解析 Markdown
            contentDiv.scrollTop = contentDiv.scrollHeight; // 滚动到底部

            // 动态调整弹框高度
            const maxHeight = window.innerHeight * 0.7;
            const contentHeight = contentDiv.scrollHeight;

            // 计算新高度
            let newHeight = Math.min(Math.max(contentHeight + 20, 200), maxHeight);

            // 如果高度需要更新
            if (newHeight !== currentHeight) {
                document.getElementById("chat-popup").style.transition = "height 0.3s ease";
                document.getElementById("chat-popup").style.height = `${newHeight}px`;
                currentHeight = newHeight;
            }

            requestAnimationFrame(typeText);
        }
    }
    typeText();
}

// 监听来自 background.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("收到消息：", message);
    if (message.action === "streamText") {
        appendToPopup(message.text);
    }
    if (message.action === "showConfigWarning") {
        showConfigWarning(); // 调用弹出提示框函数
    }
});

function showConfigWarning () {
    // 如果已存在提示框，则不重复创建
    if (document.getElementById("config-warning")) return;

    let warningBox = document.createElement("div");
    warningBox.id = "config-warning";
    warningBox.innerText = "请先配置 API！";
    warningBox.style.position = "fixed";
    warningBox.style.top = "20px";
    warningBox.style.right = "20px";
    warningBox.style.background = "red";
    warningBox.style.color = "white";
    warningBox.style.padding = "10px 20px";
    warningBox.style.borderRadius = "5px";
    warningBox.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.2)";
    warningBox.style.zIndex = "10000";
    warningBox.style.fontSize = "16px";

    document.body.appendChild(warningBox);

    // 3秒后自动消失
    setTimeout(() => {
        warningBox.remove();
    }, 3000);
}

console.log("DeepSeek Assistant is working!");
