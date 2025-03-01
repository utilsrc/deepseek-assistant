// 创建弹框
function createPopup() {
    let popup = document.createElement("div");
    popup.id = "chat-popup";
    popup.innerHTML = `
        <div id="chat-header">
            <span>DeepSeek Assistant</span>
            <button id="chat-close">×</button>
        </div>
        <div id="chat-content"></div>
    `;
    document.body.appendChild(popup);

    // 关闭按钮功能
    document.getElementById("chat-close").addEventListener("click", () => {
        popup.remove();
    });

    // 让弹框可拖动
    makeDraggable(popup);
}

// 让弹框可拖动
function makeDraggable(popup) {
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

// 流式更新弹框内容
function appendToPopup(text) {
    let contentDiv = document.getElementById("chat-content");
    if (!contentDiv) {
        createPopup();
        contentDiv = document.getElementById("chat-content");
    }

    let span = document.createElement("span");
    contentDiv.appendChild(span);

    let index = 0;
    function typeText() {
        if (index < text.length) {
            span.innerHTML += text[index++];
            contentDiv.scrollTop = contentDiv.scrollHeight; // 滚动到底部
            setTimeout(typeText, 50);
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

function showConfigWarning() {
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

console.log("Content script loaded");